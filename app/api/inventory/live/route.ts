import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    try {
        // 1. Fetch all inventory products
        const { data: products, error: productsError } = await supabaseAdmin
            .from('inventory_products')
            .select('id, product_sku, product_name, stock_quantity, total_inventory, oem')
            .order('product_name', { ascending: true });

        if (productsError) {
            return NextResponse.json({ error: productsError.message }, { status: 500 });
        }

        // 2. Fetch all order items for orders that are currently "Shipped" (i.e. with customers)
        const { data: activeOrderItems, error: itemsError } = await supabaseAdmin
            .from('order_items')
            .select(`
                product_id,
                quantity,
                order:checkout_requests!inner(order_status)
            `)
            .eq('order.order_status', 'Shipped');

        if (itemsError) {
            console.error('[DEBUG] Error fetching active order items:', itemsError);
        }

        // 3. Build a map of product_id -> total qty with customers
        const customerWithMap: Record<string, number> = {};
        for (const item of (activeOrderItems || [])) {
            const pid = String(item.product_id);
            customerWithMap[pid] = (customerWithMap[pid] || 0) + (item.quantity || 0);
        }

        // 4. Combine the data
        const result = (products || []).map(p => {
            const totalInv = p.total_inventory || 0;
            const stockQty = p.stock_quantity || 0;
            const calculatedWithCustomer = Math.max(0, totalInv - stockQty);

            return {
                id: p.id,
                product_sku: p.product_sku,
                product_name: p.product_name,
                stock_quantity: stockQty,
                customer_with: calculatedWithCustomer,
                total_inventory: totalInv,
                oem: p.oem,
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in live inventory:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
