import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';
import { withAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    const userRole = auth.profile.userrole;
    const isManager = userRole === 'Admin' || userRole === 'Shop Manager' || userRole === 'Super Subscriber';

    if (!isManager) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('dispatch')
            .select(`
                *,
                dispatch_items (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DEBUG] Error fetching dispatch:', error);
            return NextResponse.json({ error: 'Failed to fetch dispatch records' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/dispatch:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // ── Authenticate user (same pattern as update-login) ──
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => request.cookies.getAll(),
                    setAll: (cookiesToSet) => {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ── Check role — Subscribers cannot submit ──
        const { data: profile } = await supabaseAdmin
            .from('profile')
            .select('userrole')
            .or(`id.eq.${user.id},userId.eq.${user.id}`)
            .single();

        if (!profile || profile.userrole === 'Subscriber') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { submitted_by, tracking_number, shipment_date, additional_details, products } = body;

        if (!submitted_by || !products || products.length === 0) {
            return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
        }

        // ── Insert dispatch header (id is int4 SERIAL — auto-incremented) ──
        const { data: dispatch, error: dispatchError } = await supabaseAdmin
            .from('dispatch')
            .insert({
                submitted_by,
                tracking_number: tracking_number || null,
                shipment_date: shipment_date || null,
                additional_details: additional_details || null,
            })
            .select('id')
            .single();

        if (dispatchError) throw dispatchError;

        // ── Insert dispatch items ──
        const items = products.map((p: { product_name: string; sku: string; quantity: number }) => ({
            dispatch_id: dispatch.id,
            product_name: p.product_name,
            sku: p.sku,
            quantity: p.quantity,
        }));

        const { error: itemsError } = await supabaseAdmin.from('dispatch_items').insert(items);
        if (itemsError) throw itemsError;

        // ── Send email notification ──
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email/dispatch-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                submitted_by,
                tracking_number,
                shipment_date,
                additional_details,
                products,
                dispatch_id: dispatch.id, // integer e.g. 1, 2, 3...
            }),
        });

        return NextResponse.json({ success: true, dispatch_id: dispatch.id });
    } catch (error: any) {
        console.error('[Dispatch API Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
