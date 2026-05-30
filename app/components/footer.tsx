"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const isRegisterPage = pathname === "/register";
  const isLoginPage = pathname === "/login";

  return (
    <footer className={`bg-white ${isRegisterPage ? "relative z-20" : ""} ${isLoginPage ? "relative z-20" : ""}`}>
      <div className="max-w-6xl mx-auto py-3 2xl:py-5 px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
        © 2026 All Rights Reserved. Design by Works360
      </div>
    </footer>
  );
}