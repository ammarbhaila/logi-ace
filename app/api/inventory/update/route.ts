import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendBackInStockEmail } from "@/lib/emailService";
import { withAdminAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const auth = await withAdminAuth(req);
  if (auth.error) return auth.error;

  const { id, ...updates } = await req.json();

  // 1. Get current product data to check stock status change
  const { data: currentProduct } = await supabaseAdmin
    .from("inventory_products")
    .select("*")
    .eq("id", id)
    .single();

  // 2. Auto-set stock_status based on stock_quantity
  if ('stock_quantity' in updates) {
    if (updates.stock_quantity === 0) {
      updates.stock_status = "out_of_stock";
    } else if (updates.stock_quantity > 0 && !updates.stock_status) {
      updates.stock_status = "in_stock";
    }
  }

  // 3. Perform update
  const { data: updatedProduct, error } = await supabaseAdmin
    .from("inventory_products")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 4. Log changes
  if (currentProduct && updatedProduct) {
      const changedFields = Object.keys(updates).filter(key => {
          if (key === 'updated_at') return false;
          const oldVal = currentProduct[key];
          const newVal = updates[key];
          
          if (Array.isArray(oldVal) && Array.isArray(newVal)) {
              return JSON.stringify([...oldVal].sort()) !== JSON.stringify([...newVal].sort());
          }
          if (!oldVal && !newVal) return false;
          return String(oldVal) !== String(newVal);
      });

      if (changedFields.length > 0) {
          const action = `Columns edited: ${changedFields.join(', ')}`;
          await supabaseAdmin.from('inventory_logs').insert({
              product_id: id,
              product_name: updatedProduct.product_name || 'Unknown',
              product_sku: updatedProduct.product_sku || 'Unknown',
              action: action,
              performed_by: auth.profile?.email || 'System'
          });
      }
  }

  // 4. If status changed to in_stock, notify waitlisted users
  if (updates.stock_status === "in_stock" && currentProduct?.stock_status === "out_of_stock") {
    const { data: waitlistItems } = await supabaseAdmin
      .from("waitlist")
      .select("*")
      .eq("product_id", id)
      .is("notified_at", null);

    if (waitlistItems && waitlistItems.length > 0) {
      await Promise.all(waitlistItems.map(async (item) => {
        try {
          await sendBackInStockEmail({
            email: item.email_address,
            productName: currentProduct.product_name,
            productId: id,
          });

          // Mark as notified
          await supabaseAdmin
            .from("waitlist")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", item.id);
        } catch (emailErr) {
          console.error(`Failed to notify ${item.email_address}:`, emailErr);
        }
      }));
    }
  }

  return NextResponse.json({ success: true });
}
