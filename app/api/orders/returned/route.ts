import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    try {
        const auth = await withAuth(request);
        if (auth.error) return auth.error;

        const userRole = auth.profile?.userrole || '';
        const ADMIN_ROLES = [
            'Admin',
            'Shop Manager',
            'Super Subscriber',
            'Poly Super Subscriber',
            'Logitech Super Subscriber',
            'Neat Super Subscriber'
        ];
        const isAdmin = ADMIN_ROLES.includes(userRole);

        let query = supabaseAdmin
            .from('checkout_requests')
            .select(`
                id, customer_company_name, customer_contact_name, customer_contact_email, crm_account_number, sales_executive,
                order_items (
                    product:inventory_products(oem)
                )
            `)
            .eq('order_status', 'Returned')
            .order('created_at', { ascending: false });

        if (!isAdmin) {
            query = query.eq('sales_executive_email', auth.user.email);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[DEBUG] Error fetching returned orders:', error);
            return NextResponse.json({ error: 'Failed to fetch returned orders' }, { status: 500 });
        }

        // Apply OEM filtering based on userRole for Subscribers
        let targetOem = '';
        if (userRole === 'Logitech Super Subscriber') targetOem = 'Logitech';
        else if (userRole === 'Neat Super Subscriber') targetOem = 'Neat';
        else if (userRole === 'Poly Super Subscriber') targetOem = 'Poly';

        let filteredData = data;
        if (targetOem) {
            filteredData = data.filter((order: any) => {
                const items = order.order_items || [];
                return items.some((item: any) => {
                    const oem = item.product?.oem || '';
                    return oem.toLowerCase() === targetOem.toLowerCase();
                });
            });
        }

        // Clean up the `order_items` array from the response to keep shape consistent
        const cleanedData = filteredData.map((order: any) => {
            const { order_items, ...rest } = order;
            return rest;
        });

        return NextResponse.json(cleanedData);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/orders/returned:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
