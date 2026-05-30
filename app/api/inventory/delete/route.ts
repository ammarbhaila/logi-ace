import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withAdminAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const auth = await withAdminAuth(req);
  if (auth.error) return auth.error;

  const { id } = await req.json();

  // fetch images first
  const { data: product } = await supabaseAdmin
    .from("inventory_products")
    .select("*")
    .eq("id", id)
    .single();

  // delete product
  const { error } = await supabaseAdmin
    .from("inventory_products")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Log deletion
  if (product) {
      await supabaseAdmin.from('inventory_logs').insert({
          product_id: null, // Since it's deleted
          product_name: product.product_name || 'Unknown',
          product_sku: product.product_sku || 'Unknown',
          action: 'Product deleted',
          performed_by: auth.profile?.email || 'System'
      });
  }

  // delete images from storage
  const paths: string[] = [];

  if (product?.main_image_url) {
    paths.push(product.main_image_url.split("/inventory-images/")[1]);
  }

  if (product?.image_urls?.length) {
    product.image_urls.forEach((url: string) =>
      paths.push(url.split("/inventory-images/")[1])
    );
  }

  if (paths.length) {
    await supabaseAdmin.storage
      .from("inventory-images")
      .remove(paths);
  }

  return NextResponse.json({ success: true });
}
