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
            .from('wins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DEBUG] Error fetching wins:', error);
            return NextResponse.json({ error: 'Failed to fetch wins' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/wins:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    try {
        const body = await request.json();
        const {
            order_id,
            product_ids,
            customer_name,
            customer_contact_email,
            crm_account_number,
            sales_executive,
            num_units,
            total_revenue,
            purchase_type,
            date_of_purchase,
            current_manufacturer,
            feedback,
            sku,
            oem,
            user_name,
            user_email
        } = body;

        // Basic validation
        if (!order_id) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('wins')
            .insert([{
                order_id,
                product_ids,
                customer_name,
                customer_contact_email,
                crm_account_number,
                sales_executive,
                num_units,
                total_revenue,
                purchase_type,
                date_of_purchase,
                current_manufacturer: current_manufacturer,
                feedback,
                sku,
                oem,
                user_name,
                user_email,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('[DEBUG] Error inserting win:', error);
            return NextResponse.json({ error: 'Failed to report win: ' + error.message }, { status: 500 });
        }

        // Trigger Email Notification
        try {
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/win-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } catch (emailError) {
            console.error('[DEBUG] Failed to trigger win notification email:', emailError);
            // We don't return error here because the DB insert succeeded
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('[DEBUG] Unexpected error in POST /api/wins:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
