import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth, withAdminAuth } from '@/lib/apiAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: any }
) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    try {
        const { id } = await (params as any);

        const { data: order, error: orderError } = await supabaseAdmin
            .from('checkout_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Ownership Validation
        const userRole = auth.profile?.userrole || '';
        const ADMIN_ROLES = ['Admin', 'Shop Manager'];
        const userEmail = auth.user.email?.toLowerCase();
        const executiveEmail = order.sales_executive_email?.toLowerCase();
        const isSelfOrder = executiveEmail === userEmail;

        if (!ADMIN_ROLES.includes(userRole) && !isSelfOrder) {
            const isSuperSubscriber = userRole.includes('Super Subscriber');

            if (!isSuperSubscriber) {
                console.log(`[DEBUG] Auth failed for order #${id}. User: ${userEmail}, Sales Exec: ${executiveEmail}`);
                return NextResponse.json({ error: 'Unauthorized to view this order' }, { status: 403 });
            }
        }

        const { data: items, error: itemsError } = await supabaseAdmin
            .from('order_items')
            .select(`
        *,
        product:inventory_products(*)
      `)
            .eq('order_id', id);

        if (itemsError) {
            console.error('[DEBUG] Error fetching order items:', itemsError);
        }

        // Additional check for OEM Super Subscribers
        const OEM_ROLES = ['Logitech Super Subscriber', 'Neat Super Subscriber', 'Poly Super Subscriber'];
        if (!ADMIN_ROLES.includes(userRole) && !isSelfOrder && OEM_ROLES.includes(userRole)) {
            let targetOem = '';
            if (userRole === 'Logitech Super Subscriber') targetOem = 'Logitech';
            else if (userRole === 'Neat Super Subscriber') targetOem = 'Neat';
            else if (userRole === 'Poly Super Subscriber') targetOem = 'Poly';

            const hasMatchingOem = (items || []).some((item: any) => {
                const oem = item.product?.oem || '';
                return oem.toLowerCase() === targetOem.toLowerCase();
            });

            if (!hasMatchingOem) {
                return NextResponse.json({ error: 'Unauthorized: This order contains no items from your OEM' }, { status: 403 });
            }
        }

        return NextResponse.json({ ...order, items: items || [] });
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/orders/[id]:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

// Helper function to restore stock for given items
async function restoreStockForItems(itemsToRestore: any[]) {
    for (const item of itemsToRestore) {
        const productId = item.product_id || item.product?.id;
        if (!productId) continue;

        // 1. Fetch current product data
        const { data: productData, error: fetchError } = await supabaseAdmin
            .from('inventory_products')
            .select('stock_quantity, stock_status, bundle_type, bundle_products, multiple_products')
            .eq('id', productId)
            .single();

        if (fetchError || !productData) {
            console.error(`[DEBUG] Failed to fetch product ${productId} for stock restore:`, fetchError);
            continue;
        }

        // 2. Restore main product stock
        const restoredStock = (productData.stock_quantity || 0) + (item.quantity || 0);
        const updateData: any = { stock_quantity: restoredStock };

        if (productData.stock_status === 'out_of_stock') {
            updateData.stock_status = 'in_stock';
        }

        const { error: updateError } = await supabaseAdmin
            .from('inventory_products')
            .update(updateData)
            .eq('id', productId);

        if (updateError) {
            console.error(`[DEBUG] Failed to restore stock for product ${productId}:`, updateError);
        } else {
            console.log(`[DEBUG] Restored ${item.quantity} units for product ${productId}. New stock: ${restoredStock}`);
        }

        // 3. If it's a bundle or Multiproduct, restore components stock too
        const components = (productData.bundle_type === 'bundle' ? productData.bundle_products :
            productData.bundle_type === 'Multiproduct' ? productData.multiple_products :
                []) || [];

        if (components.length > 0) {
            console.log(`[DEBUG] Product ${productId} is a ${productData.bundle_type}. Restoring ${components.length} components.`);
            for (const componentId of components) {
                const { data: compData, error: compFetchError } = await supabaseAdmin
                    .from('inventory_products')
                    .select('stock_quantity, stock_status')
                    .eq('id', componentId)
                    .single();

                if (compFetchError || !compData) continue;

                const compRestoredStock = (compData.stock_quantity || 0) + (item.quantity || 0);
                const compUpdateData: any = { stock_quantity: compRestoredStock };

                if (compData.stock_status === 'out_of_stock') {
                    compUpdateData.stock_status = 'in_stock';
                }

                await supabaseAdmin
                    .from('inventory_products')
                    .update(compUpdateData)
                    .eq('id', componentId);

                console.log(`[DEBUG] Restored component ${componentId}: ${compData.stock_quantity} -> ${compRestoredStock}`);
            }
        }
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: any }
) {
    const auth = await withAdminAuth(request);
    if (auth.error) return auth.error;

    try {
        const { id } = await (params as any);
        const body = await request.json();
        const { items, updated_by, returned_items, ...orderUpdate } = body;

        // 0. Fetch current data to detect changes
        const { data: oldData } = await supabaseAdmin
            .from('checkout_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (!oldData) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 1. Update items if provided (DO THIS FIRST so restoration uses new quantities)
        if (items && Array.isArray(items)) {
            const { error: deleteError } = await supabaseAdmin
                .from('order_items')
                .delete()
                .eq('order_id', id);

            if (!deleteError) {
                const itemsToInsert = items.map((item: any) => ({
                    order_id: id,
                    product_id: item.product_id,
                    quantity: item.quantity
                }));
                await supabaseAdmin.from('order_items').insert(itemsToInsert);
                console.log(`[DEBUG] Updated order items for #${id}`);
            }
        }

        // 2. Detect status change and restore stock
        if (orderUpdate.order_status && oldData.order_status !== orderUpdate.order_status) {
            const oldStatus = oldData.order_status;
            const newStatus = orderUpdate.order_status;

            // Track Shipped/Returned timestamps
            if (newStatus === 'Shipped' && !orderUpdate.shipped_at) {
                orderUpdate.shipped_at = new Date().toISOString();
            } else if (newStatus === 'Returned' && !orderUpdate.returned_at) {
                orderUpdate.returned_at = new Date().toISOString();
            }

            const INACTIVE_STATUSES = ['Rejected', 'Returned', 'Cancelled'];
            const wasInactive = INACTIVE_STATUSES.includes(oldStatus);
            const isNowInactive = INACTIVE_STATUSES.includes(newStatus);

            if (!wasInactive && isNowInactive) {
                console.log(`[DEBUG] Order #${id} transitioning to inactive (${newStatus}). Restoring stock.`);

                // Fetch the NEW items (just updated above)
                const { data: currentItems } = await supabaseAdmin
                    .from('order_items')
                    .select('*')
                    .eq('order_id', id);

                if (currentItems) {
                    let itemsToRestore = currentItems;
                    if (newStatus === 'Returned' && returned_items && Array.isArray(returned_items)) {
                        itemsToRestore = currentItems.filter(item => returned_items.includes(item.product_id));
                        console.log(`[DEBUG] Partial return detected. Restoring ${itemsToRestore.length} out of ${currentItems.length} items.`);
                    }
                    await restoreStockForItems(itemsToRestore);
                }
            }
        }

        // 3. Update main order details
        const { data: orderData, error: orderError } = await supabaseAdmin
            .from('checkout_requests')
            .update(orderUpdate)
            .eq('id', id)
            .select()
            .single();

        if (orderError) {
            console.error('[DEBUG] Error updating order:', orderError);
            return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
        }

        // 4. Log changes
        const changedFields = Object.keys(orderUpdate).filter(key => {
            if (key === 'items' || key === 'updated_at') return false;
            const oldVal = oldData[key];
            const newVal = orderUpdate[key];
            if (!oldVal && !newVal) return false;
            return String(oldVal) !== String(newVal);
        });

        if (changedFields.length > 0) {
            const action = changedFields.length === 1 && changedFields[0] === 'order_status'
                ? `Order status changed to ${orderUpdate.order_status}`
                : `Columns edited: ${changedFields.join(', ')}`;

            await supabaseAdmin.from('order_logs').insert({
                order_id: id,
                action: action,
                performed_by: updated_by || 'Admin',
            });
        }

        return NextResponse.json(orderData);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in PATCH /api/orders/[id]:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
