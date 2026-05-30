import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => req.cookies.getAll(),
                    setAll: (cookiesToSet) => {
                        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
                    },
                },
            }
        );

        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error("[Login Tracking] Auth error or no user:", authError);
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        /* ---------------- UPDATE LOGIN STATS ---------------- */
        // Using supabaseAdmin to increment login_count safely and set last_login_date
        // Incrementing login_count is best done via RPC or careful fetch-update

        const { data: profile, error: fetchError } = await supabaseAdmin
            .from("profile")
            .select("login_count, is_approved")
            .or(`id.eq.${user.id},userId.eq.${user.id}`)
            .single();

        if (fetchError || !profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Double check approval status (redundant but safe)
        if (!profile.is_approved) {
            return NextResponse.json({ error: "User not approved" }, { status: 403 });
        }

        const { error: updateError } = await supabaseAdmin
            .from("profile")
            .update({
                last_login_date: new Date().toISOString(),
                login_count: (profile.login_count || 0) + 1,
            })
            .or(`id.eq.${user.id},userId.eq.${user.id}`);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Update login error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
