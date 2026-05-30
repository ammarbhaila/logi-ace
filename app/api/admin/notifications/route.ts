import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAdminAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const auth = await withAdminAuth(request);
    if (auth.error) return auth.error;

    try {
        // 1. Fetch count of pending users
        const { count: pendingUsers, error: userError } = await supabaseAdmin
            .from('profile')
            .select('*', { count: 'exact', head: true })
            .eq('approval_status', 'pending');

        if (userError) {
            console.error('[DEBUG] Notification API User error:', userError);
        }

        // 2. Fetch count of orders awaiting approval
        const { count: pendingOrders, error: orderError } = await supabaseAdmin
            .from('checkout_requests')
            .select('*', { count: 'exact', head: true })
            .ilike('order_status', 'Awaiting approval');

        if (orderError) {
            console.error('[DEBUG] Notification API Order error:', orderError);
        }

        const total = (pendingUsers || 0) + (pendingOrders || 0);

        return NextResponse.json({
            success: true,
            counts: {
                users: pendingUsers || 0,
                orders: pendingOrders || 0,
                total
            }
        });
    } catch (error: any) {
        console.error('[DEBUG] Notification API Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
