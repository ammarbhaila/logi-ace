import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  let isAuthenticatedAdmin = false;

  try {
    const supabaseSession = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => { },
        },
      }
    );

    const { data: { user } } = await supabaseSession.auth.getUser();

    let currentUser = user;
    if (!currentUser) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        const { data: { user: headerUser } } = await supabaseAdmin.auth.getUser(token);
        if (headerUser) {
          currentUser = headerUser;
        }
      }
    }

    if (currentUser) {
      // Check role in profile table using admin client
      const { data: profile } = await supabaseAdmin
        .from('profile')
        .select('userrole')
        .or(`id.eq.${currentUser.id},userId.eq.${currentUser.id}`)
        .single();

      if (profile && profile.userrole === 'Admin') {
        isAuthenticatedAdmin = true;
      }
    }
  } catch (e) {
    console.error('[DEBUG] Auth check failed in inventory list:', e);
  }

  let query = supabaseAdmin
    .from("inventory_products")
    .select("*")
    .order("created_at", { ascending: false });

  // 🔐 Only restrict to 'published' if NOT an authenticated Admin
  if (!isAuthenticatedAdmin) {
    query = query.eq("post_status", "published");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
