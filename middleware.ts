import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Initialize admin client directly for Edge compatibility and robustness
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Public routes accessible without login
const beforeLoginRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/how-it-works",
];

// Admin-only routes
const adminRoutes = [
    "/admin",
    "/inventory",
];

export async function middleware(req: NextRequest) {
    let res = NextResponse.next({
        request: {
            headers: req.headers,
        },
    });

    const pathname = req.nextUrl.pathname;

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => req.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value }) =>
                        req.cookies.set(name, value)
                    );
                    res = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        res.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // Use getUser() for better security (re-verifies JWT)
    const { data: { user } } = await supabase.auth.getUser();

    const isMatch = (routes: string[]) =>
        routes.some(
            (route) => pathname === route || pathname.startsWith(route + "/")
        );

    const isPublicRoute = isMatch(beforeLoginRoutes);
    const isAdminRoute = isMatch(adminRoutes);

    // 1. If logged in and trying to access login/register, redirect to dashboard
    if (user && (pathname === "/login" || pathname === "/register")) {
        return NextResponse.redirect(new URL("/", req.url));
    }

    // 2. PROTECT BY DEFAULT: If NOT public and NOT logged in, redirect to login
    if (!user && !isPublicRoute) {
        const url = new URL("/login", req.url);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    // 3. Approval & Role checks for logged-in users
    if (user) {
        // Use admin client for the profile check to bypass RLS and be more robust
        const { data: profile } = await supabaseAdmin
            .from("profile")
            .select("userrole, is_approved")
            .or(`id.eq.${user.id},userId.eq.${user.id}`)
            .single();

        if (!profile) {
            console.error(`[Middleware] No profile found for user ${user.id}`);
            return res;
        }

        // 3.1 Strict Approval Lockdown
        // Even on public routes, if you are logged in, you MUST be approved to see content.
        // Exception: /pending-approval page itself.
        if (!profile.is_approved && pathname !== "/pending-approval") {
            return NextResponse.redirect(new URL("/pending-approval", req.url));
        }

        // 3.2 Role-based restrictions: block specific pages
        const userRole = profile.userrole;
        const restrictedRoutes = ["/orders"];
        const shopManagerOnlyRestrictions = ["/wins", "/waitlist/all"];

        // Helper to redirect to previous page or home
        const getDynamicRedirect = (fallback = "/") => {
            const referer = req.headers.get("referer");
            if (referer && referer.startsWith(req.nextUrl.origin)) {
                return NextResponse.redirect(new URL(referer, req.url));
            }
            return NextResponse.redirect(new URL(fallback, req.url));
        };

        if (userRole === "Shop Manager" || userRole === "Super Subscriber" ||
            userRole === "Poly Super Subscriber" || userRole === "Logitech Super Subscriber" || userRole === "Neat Super Subscriber") {

            const isBlocked = restrictedRoutes.some((route) => {
                if (route === "/orders") {
                    return pathname.startsWith("/orders/") && pathname.endsWith("/edit") && userRole === "Super Subscriber";
                }
                return pathname === route || pathname.startsWith(route + "/");
            });

            const isShopManagerSpecificBlocked = userRole === "Shop Manager" && shopManagerOnlyRestrictions.some(
                (route) => pathname === route || pathname.startsWith(route + "/")
            );

            if (isBlocked || isShopManagerSpecificBlocked) {
                return getDynamicRedirect("/");
            }
        }

        // 3.3 Admin Lockdown
        if (isAdminRoute) {
            const isPendingUsersRoute = pathname.startsWith("/admin/users/pending-users");
            const isFullUserMgmtRoute = pathname === "/admin/users";
            const isDispatchRoute = pathname.startsWith("/admin/dispatch");

            if (isPendingUsersRoute) {
                // Admin, Shop Manager, and Super Subscriber can see pending users
                const allowedRoles = ["Admin", "Super Subscriber", "Shop Manager"];
                if (!allowedRoles.includes(userRole)) {
                    return getDynamicRedirect("/");
                }
            } else if (isDispatchRoute) {
                // All non-Subscriber roles can access the dispatch page
                const allowedRoles = ["Admin", "Super Subscriber", "Shop Manager", "Program Manager",
                    "Poly Super Subscriber", "Logitech Super Subscriber", "Neat Super Subscriber"];
                if (!allowedRoles.includes(userRole)) {
                    return getDynamicRedirect("/");
                }
            } else if (isFullUserMgmtRoute) {
                // Admin, Shop Manager, and Program Manager can see full user mgmt
                const allowedRoles = ["Admin", "Shop Manager", "Program Manager"];
                if (!allowedRoles.includes(userRole)) {
                    // If blocked from Full MGMT, try to go to pending users first, then fallback
                    return NextResponse.redirect(new URL("/admin/users/pending-users", req.url));
                }
            } else {
                // Default admin route check for /inventory etc.
                const allowedRoles = ["Admin", "Shop Manager", "Program Manager"];
                if (!allowedRoles.includes(userRole)) {
                    return getDynamicRedirect("/");
                }
            }
        }

        // 3.4 Admin Features Lockdown (Strictly only Admin allowed)
        if ((pathname === "/create-demo-kits" || pathname.startsWith("/eol") || pathname.startsWith("/admin/dispatch")) && userRole !== "Admin") {
            return getDynamicRedirect("/");
        }
    }

    return res;
}

export const config = {
    matcher: ["/((?!_next|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
