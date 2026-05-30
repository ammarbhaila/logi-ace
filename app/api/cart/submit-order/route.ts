import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (auth.error) return auth.error;

  try {
    const { user_id, cartItems, formData } = await request.json();

    // Log the request data
    console.log('[DEBUG] Received order submission request:', { user_id, cartItems, formData });

    // Convert form data to ensure proper text values ("Yes" or "No")
    const approvedDealReg = formData.approvedDealReg === 'Yes' ? 'Yes' : 'No';
    const inHouseExpertise = formData.inHouseExpertise === 'Yes' ? 'Yes' : 'No';
    const technicalResource = formData.technicalResource === 'Yes' ? 'Yes' : 'No';
    const logitechEngaged = formData.logitechEngaged === 'Yes' ? 'Yes' : 'No';
    const virtualSupport = formData.virtualSupport === 'Yes' ? 'Yes' : 'No';
    const technicalSupport = formData.technicalSupport === 'Yes' ? 'Yes' : 'No';

    // Insert into checkout_requests table (id is now serial)
    const { data: checkoutData, error: checkoutError } = await supabaseAdmin
      .from('checkout_requests')
      .insert([{
        sales_executive: formData.salesExecutive,
        sales_executive_email: formData.salesExecutiveEmail,
        sales_manager: formData.salesManager,
        sales_manager_email: formData.salesManagerEmail,
        customer_company_name: formData.customerCompanyName,
        customer_contact_name: formData.customerContactName,
        customer_contact_email: formData.customerContactEmail,
        customer_shipping_address: formData.customerShippingAddress,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        device_opportunity_size_units: formData.deviceOpportunitySizeUnits,
        revenue_opportunity_size: formData.revenueOpportunitySize,
        crm_account_number: formData.crmAccount,
        segment: formData.segment,
        estimated_closed_date: formData.estimatedClosedDate,
        opportunity_link: formData.opportunityLink,
        notes: formData.notes,
        approved_deal_reg: approvedDealReg, // Now it's 'Yes'/'No' instead of boolean
        reg_number: formData.regNumber || '', // Handle null or empty case
        platform: formData.platform || '', // Handle null or empty case
        customer_planning_version: formData.customerPlanningVersion || '',
        in_house_expertise: inHouseExpertise, // 'Yes'/'No' text value
        technical_resource: technicalResource, // 'Yes'/'No' text value
        room_upgrade: formData.roomUpgrade || '', // Default to 'No' if missing
        expected_participants: formData.expectedParticipants || 0, // Default to 0 if missing
        technical_support: technicalSupport, // 'Yes'/'No' text value
        logitech_engaged: logitechEngaged, // 'Yes'/'No' text value
        engaged_ae_name: formData.engagedAENAME || '',
        virtual_support: virtualSupport, // 'Yes'/'No' text value
        created_at: new Date().toISOString(),
        order_status: 'Awaiting Approval', // Default status if not passed
      }])
      .select('id')
      .single();

    const orderId = checkoutData?.id;

    if (checkoutError || !orderId) {
      console.error('[DEBUG] Error inserting into checkout_requests:', checkoutError);
      return NextResponse.json({ error: 'Failed to submit the order' }, { status: 500 });
    }

    // Insert Log Entry for "Order created"
    await supabaseAdmin
      .from('order_logs')
      .insert({
        order_id: orderId,
        action: 'Order created',
        performed_by: formData.salesExecutiveEmail || 'System',
      });

    // Log success after inserting into checkout_requests
    console.log('[DEBUG] Successfully inserted into checkout_requests:', checkoutData);

    // Insert into order_items table
    // Insert into order_items table
    for (const item of cartItems) {
      if (!item.product_id) {
        console.error('[DEBUG] Missing product_id in cart item:', item);
        return NextResponse.json({ error: 'Product ID is missing in the cart item' }, { status: 400 });
      }

      const { error: orderItemsError } = await supabaseAdmin
        .from('order_items')
        .insert([{
          order_id: orderId,
          product_id: item.product_id, // Ensure product_id is passed here
          quantity: item.quantity,
        }]);

      if (orderItemsError) {
        console.error('[DEBUG] Error inserting into order_items:', orderItemsError);
        return NextResponse.json({ error: 'Failed to add items to order' }, { status: 500 });
      }

      console.log('[DEBUG] Successfully added item to order:', item);

      // Decrement stock quantity in inventory_products
      const { data: productData, error: fetchError } = await supabaseAdmin
        .from('inventory_products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();

      if (fetchError || !productData) {
        console.error('[DEBUG] Failed to fetch product for stock update:', fetchError);
      } else {
        const newStock = Math.max(0, productData.stock_quantity - item.quantity);
        const updateData: any = { stock_quantity: newStock };

        // Auto-set stock_status when quantity reaches 0
        if (newStock === 0) {
          updateData.stock_status = "out_of_stock";
        }

        const { error: updateError } = await supabaseAdmin
          .from('inventory_products')
          .update(updateData)
          .eq('id', item.product_id);

        if (updateError) {
          console.error('[DEBUG] Failed to update stock manually:', updateError);
        } else {
          console.log('[DEBUG] Successfully updated stock for product:', item.product_id);
        }
      }

      // 4. If this item has bundleItems, decrement their stock too
      if (item.bundleItems && item.bundleItems.length > 0) {
        for (const bItem of item.bundleItems) {
          console.log('[DEBUG] Processing bundle item stock decrement:', bItem.product_name);

          const { data: bProductData, error: bFetchError } = await supabaseAdmin
            .from('inventory_products')
            .select('stock_quantity')
            .eq('id', bItem.id)
            .single();

          if (bFetchError || !bProductData) {
            console.error('[DEBUG] Failed to fetch bundle item for stock update:', bFetchError);
          } else {
            const bNewStock = Math.max(0, bProductData.stock_quantity - item.quantity);
            const bUpdateData: any = { stock_quantity: bNewStock };

            // Auto-set stock_status when quantity reaches 0
            if (bNewStock === 0) {
              bUpdateData.stock_status = "out_of_stock";
            }

            const { error: bUpdateError } = await supabaseAdmin
              .from('inventory_products')
              .update(bUpdateData)
              .eq('id', bItem.id);

            if (bUpdateError) {
              console.error('[DEBUG] Failed to update bundle item stock manually:', bUpdateError);
            } else {
              console.log('[DEBUG] Successfully updated stock for bundle item:', bItem.id);
            }
          }
        }
      }
    }


    // Delete cart items after order submission
    const { error: cartDeleteError } = await supabaseAdmin
      .from('cart')
      .delete()
      .eq('userid', user_id);

    if (cartDeleteError) {
      console.error('[DEBUG] Error deleting cart items:', cartDeleteError);
      return NextResponse.json({ error: 'Failed to delete cart items' }, { status: 500 });
    }

    console.log('[DEBUG] Successfully deleted cart items for user:', user_id);

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error('[DEBUG] Unexpected error during order submission:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
