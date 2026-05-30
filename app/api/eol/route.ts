import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
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
            .from('eol_requests')
            .select(`
                *,
                eol_items (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DEBUG] Error fetching EOL requests:', error);
            return NextResponse.json({ error: 'Failed to fetch EOL requests' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/eol:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    try {
        const { submitted_by, items } = await request.json();

        if (!submitted_by || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Insert into eol_requests
        const { data: requestData, error: requestError } = await supabaseAdmin
            .from('eol_requests')
            .insert([{
                submitted_by,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (requestError || !requestData) {
            console.error('[DEBUG] Error inserting EOL request:', requestError);
            return NextResponse.json({ error: 'Failed to create EOL request: ' + (requestError?.message || 'Unknown error') }, { status: 500 });
        }

        const requestId = requestData.id;

        // 2. Insert items
        const itemsToInsert = items.map(item => ({
            request_id: requestId,
            product_name: item.product_name,
            sku: item.sku,
            quantity: item.quantity,
            // quantity: parseInt(item.quantity) || 0,
            address: item.address,
            additional_note: item.additional_note || ''
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('eol_items')
            .insert(itemsToInsert);

        if (itemsError) {
            console.error('[DEBUG] Error inserting EOL items:', itemsError);
            return NextResponse.json({ error: 'Failed to add EOL items: ' + (itemsError?.message || 'Unknown error') }, { status: 500 });
        }

        // 3. Trigger Email Notification
        try {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/eol-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submitted_by, items })
            });
        } catch (emailError) {
            console.error('[DEBUG] Failed to trigger EOL notification email:', emailError);
        }

        return NextResponse.json({ success: true, requestId });
    } catch (error: any) {
        console.error('[DEBUG] Unexpected error in EOL submission:', error);
        return NextResponse.json({ error: 'Something went wrong: ' + (error?.message || 'Unknown error') }, { status: 500 });
    }
}
