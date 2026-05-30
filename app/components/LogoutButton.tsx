"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    await supabase.auth.signOut();

    setLoading(false);

    router.push("/login");
    router.refresh(); // clears client cache/session
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="
        px-4 py-2
        rounded-md
        bg-red-500
        text-white
        text-sm
        hover:bg-red-600
        transition
        disabled:opacity-50
      "
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
