import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    // Restrict to Admin/Shop Manager/Super Subscriber
    const userRole = auth.profile.userrole;
    const allowedRoles = ['Admin', 'Shop Manager', 'Super Subscriber', 'Program Manager'];
    if (!allowedRoles.includes(userRole)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString();

        // Query checkout_requests for orders:
        // 1. Shipped
        // 2. Not Returned (returned_at is null)
        // 3. Shipped at least 30 days ago
        const { data: orders, error } = await supabaseAdmin
            .from('checkout_requests')
            .select('*')
            .eq('order_status', 'Shipped')
            .is('returned_at', null)
            .lte('shipped_at', thirtyDaysAgo)
            .order('shipped_at', { ascending: false });

        if (error) {
            console.error('[DEBUG] Error fetching overdue orders:', error);
            return NextResponse.json({ error: 'Failed to fetch overdue orders' }, { status: 500 });
        }

        return NextResponse.json(orders);
    } catch (err) {
        console.error('[DEBUG] Unexpected error in GET /api/orders/overdue:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
