// ❌ NO "use client" here

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withAdminAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const auth = await withAdminAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

    // Auto-set stock_status based on stock_quantity
    if (body.stock_quantity === 0) {
      body.stock_status = "out_of_stock";
    } else if (!body.stock_status) {
      body.stock_status = "in_stock";
    }

    const { data, error } = await supabaseAdmin
      .from("inventory_products")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (data) {
      // Log creation
      await supabaseAdmin.from("inventory_logs").insert({
        product_id: data.id,
        product_name: data.product_name || 'Unknown',
        product_sku: data.product_sku || 'Unknown',
        action: 'Product created',
        performed_by: auth.profile?.email || 'System'
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
