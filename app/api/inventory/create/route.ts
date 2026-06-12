// ❌ NO "use client" here

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withAdminAuth } from '@/lib/apiAuth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const auth = await withAdminAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    // Body could be a single object or an array of objects (variants)
    const items = Array.isArray(body) ? body : [body];
    
    // Generate a unique group ID for this set of items to link them together
    const groupId = items.length > 1 ? uuidv4() : null;

    const itemsToInsert = items.map((item) => {
      // Auto-set stock_status based on stock_quantity
      if (item.stock_quantity === 0) {
        item.stock_status = "out_of_stock";
      } else if (!item.stock_status) {
        item.stock_status = "in_stock";
      }
      
      // If there are multiple items, link them together
      if (groupId) {
        item.group_id = groupId;
      }
      
      return item;
    });

    const { data, error } = await supabaseAdmin
      .from("inventory_products")
      .insert(itemsToInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (data && data.length > 0) {
      // Log creation
      const logs = data.map(item => ({
        product_id: item.id,
        product_name: item.product_name || 'Unknown',
        product_sku: item.product_sku || 'Unknown',
        action: 'Product created',
        performed_by: auth.profile?.email || 'System'
      }));
      await supabaseAdmin.from("inventory_logs").insert(logs);
    }

    return NextResponse.json(Array.isArray(body) ? data : data[0]);
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
