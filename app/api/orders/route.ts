import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(request.url);
        const view = searchParams.get('view') || 'my';

        // Use real role/email from the verified session — not URL params (security fix)
        const userEmail = auth.user.email;
        const userRole = auth.profile.userrole;

        const OEM_ROLES = ['Logitech Super Subscriber', 'Neat Super Subscriber', 'Poly Super Subscriber', 'OEM Super Subscriber'];
        const isManager = userRole === 'Admin' || userRole === 'Shop Manager' || userRole === 'Super Subscriber' || OEM_ROLES.includes(userRole);

        let query = supabaseAdmin
            .from('checkout_requests')
            .select('*')
            .order('created_at', { ascending: false });

        // If view=all, enforce manager role
        if (view === 'all') {
            if (!isManager) {
                return NextResponse.json({ error: 'Unauthorized: Manager role required for All Orders view' }, { status: 403 });
            }
            // No additional filtering for members, query returns everything
        } else {
            // Default view='my': always filter by user email
            if (!userEmail) {
                return NextResponse.json({ error: 'Email is required for personal orders view' }, { status: 400 });
            }
            query = query.eq('sales_executive_email', userEmail);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[DEBUG] Error fetching orders:', error);
            return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
        }

        let filteredData = data;
        if (view === 'all' && OEM_ROLES.includes(userRole)) {
            let targetOem = '';
            if (userRole === 'Logitech Super Subscriber') targetOem = 'Logitech';
            else if (userRole === 'Neat Super Subscriber') targetOem = 'Neat';
            else if (userRole === 'Poly Super Subscriber' || userRole === 'OEM Super Subscriber') targetOem = 'Poly';

            if (targetOem && filteredData && filteredData.length > 0) {
                const orderIds = filteredData.map(o => o.id);
                // Fetch items for these orders
                const { data: items } = await supabaseAdmin
                    .from('order_items')
                    .select('order_id, product:inventory_products(oem)')
                    .in('order_id', orderIds);

                const allowedOrderIds = new Set();
                if (items) {
                    items.forEach((item: any) => {
                        const oem = item.product?.oem || '';
                        if (oem.toLowerCase() === targetOem.toLowerCase()) {
                            allowedOrderIds.add(item.order_id);
                        }
                    });
                }
                filteredData = filteredData.filter(o => allowedOrderIds.has(o.id));
            }
        }

        return NextResponse.json(filteredData);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/orders:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
