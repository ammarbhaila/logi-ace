import { NextResponse } from "next/server";
import { supabasePlain } from "@/lib/supabasePlain";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabasePlain
    .from("cart_limit")
    .select("max_products")
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Error fetching cart limit:", error);
    return NextResponse.json({ max_items: 1 });
  }

  // console.log("Fetched cart limit:", data.max_products);

  return NextResponse.json({
    max_items: data.max_products,
  });
}
