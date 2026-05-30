import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withAdminAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const auth = await withAdminAuth(req);
  if (auth.error) return auth.error;

  const { userId } = await req.json();

  // Fetch email before deletion for the log
  const { data: user } = await supabaseAdmin
    .from("profile")
    .select("email, first_name, last_name")
    .eq("id", userId)
    .single();

  // Log deletion action
  await supabaseAdmin
    .from("user_logs")
    .insert({
      user_id: userId,
      user_email: user?.email || "Unknown",
      action: "User Deleted",
      performed_by: auth.profile.email || "System",
      details: {
        deleted_user_name: user ? `${user.first_name} ${user.last_name}` : "Unknown",
        deleted_user_email: user?.email
      }
    });

  // Delete profile first
  const { error: profileError } = await supabaseAdmin
    .from("profile")
    .delete()
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 400 }
    );
  }

  // Delete auth user
  const { error: authError } =
    await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) {
    return NextResponse.json(
      { error: authError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
