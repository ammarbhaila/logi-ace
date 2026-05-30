import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_ROLES = new Set(["Admin", "Super Subscriber"]);

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 1. Ensure user is logged in using the existing auth helper
  const session = await requireAuth();

  // 2. Fetch the user's role from the profile table
  const { data: profile } = await supabaseAdmin
    .from("profile")
    .select("userrole")
    .or(`id.eq.${session.user.id},userId.eq.${session.user.id}`)
    .single();

  const role = profile?.userrole;

  // 3. Restrict access to Admin and Program Manager roles
  if (!role || !ALLOWED_ROLES.has(role)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="max-w-[1910px] mx-auto flex flex-col lg:flex-row items-start gap-6 relative">
        <main className="min-h-screen w-full px-4 py-5 bg-gray-50 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
