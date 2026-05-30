import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withAdminAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  const auth = await withAdminAuth(request);
  if (auth.error) return auth.error;

  const { data, error } = await supabaseAdmin
    .from("profile")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
