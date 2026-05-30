"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/app/context/CartContext";
import { ChevronUp, CheckCircle2, Clock } from "lucide-react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileOemOpen, setMobileOemOpen] = useState(false);
  const [mobileDashboardOpen, setMobileDashboardOpen] = useState(false);
  const [oemOpen, setOemOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const dashboardCloseTimeout = useRef<number | null>(null);
  const { items, openCart } = useCart();

  const accountCloseTimeout = useRef<number | null>(null);


  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  /* ---------------- NOTIFICATIONS STATE ---------------- */
  const [notifications, setNotifications] = useState({ users: 0, orders: 0, total: 0 });
  const [notifyOpen, setNotifyOpen] = useState(false);
  const notifyCloseTimeout = useRef<number | null>(null);

  /* ---------------- SEARCH STATE ---------------- */
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Prefetch products for search autocomplete
    fetch("/api/inventory/list")
      .then((res) => res.json())
      .then((data) => setAllProducts(data || []))
      .catch((err) => console.error("Failed to load products for search", err));
  }, []);

  /* ---------------- AUTH STATE ---------------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (_event === 'SIGNED_OUT') {
          window.location.href = '/login';
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ---------------- LOAD ROLE ---------------- */
  useEffect(() => {
    if (!user) {
      setUserRole(null);
      return;
    }

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          // If server says unauthorized, we fallback but don't log a loud error
          supabase
            .from("profile")
            .select("userrole")
            .or(`id.eq.${user.id},userId.eq.${user.id}`)
            .single()
            .then(({ data: profileData, error: profileError }) => {
              if (profileError) {
                // Silently handle fallback error
                setUserRole(null);
              } else {
                setUserRole(profileData?.userrole ?? null);
              }
            });
        } else {
          setUserRole(data.userrole ?? null);
        }
      })
      .catch(() => {
        setUserRole(null);
      });
  }, [user]);

  /* ---------------- LOAD NOTIFICATIONS ---------------- */
  useEffect(() => {
    const isManager = userRole === 'Admin' || userRole === 'Shop Manager' || userRole === 'Super Subscriber';
    if (!user || !isManager) {
      setNotifications({ users: 0, orders: 0, total: 0 });
      return;
    }

    const fetchCounts = () => {
      fetch("/api/admin/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setNotifications(data.counts);
          }
        })
        .catch((err) => console.error("[DEBUG] Notification fetch error:", err));
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [user, userRole]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  /* ---------------- NAV CONFIG ---------------- */
  const isShopManager = userRole === "Shop Manager";
  const isSuperSubscriber = userRole === "Super Subscriber";

  const nav: { href: string; label: string; superOnly?: boolean; adminOnly?: boolean; hideForRole?: string[]; showOnlyForRole?: string[]; hasDropdown?: boolean }[] = [
    { href: "/", label: "Home", hideForRole: ["Shop Manager"] },
    { href: "/how-it-works", label: "How it Works", hideForRole: ["Shop Manager"] },
    { href: "/wins", label: "Report a Win", hideForRole: ["Shop Manager"] },
    // { href: "/eol", label: "EOL Devices", adminOnly: true },
    { href: "/360dashboard", label: "360Dashboard", showOnlyForRole: ["Admin", "Super Subscriber"] },
    { href: "/orders/all", label: "Edit Orders", showOnlyForRole: ["Shop Manager"] },
    { href: "/inventory", label: "Edit Inventory", showOnlyForRole: ["Shop Manager"] },
    { href: "/inventory/live", label: "View Inventory", showOnlyForRole: ["Shop Manager"] },
  ];

  const filteredNav = nav.filter((n) => {
    if (n.hideForRole?.includes(userRole as string)) return false;
    if (n.showOnlyForRole && !n.showOnlyForRole.includes(userRole as string)) return false;
    if (n.superOnly) return userRole === "Super Subscriber";
    if (!n.adminOnly) return true;
    const allowedRoles = ["Admin", "Shop Manager", "Super Subscriber", "Program Manager"];
    return allowedRoles.includes(userRole as string);
  });

  // Additional Role-based Nav
  // if (userRole === "Admin") {
  //   filteredNav.push({ href: "/admin/users", label: "Manage Users" });
  // } else if (userRole === "Super Subscriber") {
  //   filteredNav.push({ href: "/admin/users/pending-users", label: "Approve or Reject Users" });
  // }

  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname);

  /* ---------------- RENDER ---------------- */
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white ${isAuthPage ? "" : "shadow-sm"}`}>
      <div className="max-w-[1900px] mx-auto">
        <div className={`px-4 sm:px-6 lg:px-10 py-4 sm:py-5 md:py-2 lg:py-3 2xl:py-4 ${isAuthPage ? "" : "border-b border-gray-200"}`}>
          <div className="flex items-center justify-between">

            {/* LOGO */}
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/logo1.png"
                alt="SHI UC HUB"
                className="w-[118px] md:w-[120px] h-auto object-contain"
              />
            </Link>

            {/* DESKTOP NAV */}
            {!isAuthPage && (
              <nav className="hidden md:flex items-center justify-center flex-1 gap-2 text-[14px] font-medium text-gray-800">
                {filteredNav.map((n) => {
                  const isActive =
                    pathname === n.href ||
                    (n.href !== "/" && pathname.startsWith(n.href));

                  // 360Dashboard dropdown
                  if (n.hasDropdown) {
                    return (
                      <div
                        key={n.href}
                        className="relative"
                        onMouseEnter={() => {
                          if (dashboardCloseTimeout.current) {
                            clearTimeout(dashboardCloseTimeout.current);
                            dashboardCloseTimeout.current = null;
                          }
                          setDashboardOpen(true);
                        }}
                        onMouseLeave={() => {
                          if (dashboardCloseTimeout.current) clearTimeout(dashboardCloseTimeout.current);
                          dashboardCloseTimeout.current = window.setTimeout(() => {
                            setDashboardOpen(false);
                            dashboardCloseTimeout.current = null;
                          }, 150);
                        }}
                      >
                        <button
                          className={`relative flex items-center gap-1 px-2 py-1 hover:text-black
                            ${isActive ? "text-black" : ""}
                            after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-[2px]
                            after:h-[2px] after:w-0 after:bg-black after:transition-all hover:after:w-full`}
                        >
                          {n.label}
                          <svg className={`w-3 h-3 transition-transform ${dashboardOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                        </button>

                        {/* Dropdown commented out as requested */}
                        {/* {dashboardOpen && (
                          <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-100 rounded-md shadow-lg py-1 z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
                            <Link
                              href="/orders/all"
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/orders/all' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                              onClick={() => setDashboardOpen(false)}
                            >
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                              All Orders
                            </Link>
                            <Link
                              href="/inventory/live"
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/inventory/live' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                              onClick={() => setDashboardOpen(false)}
                            >
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                              Live Inventory
                            </Link>
                            {!(isShopManager || isSuperSubscriber) && (
                              <Link
                                href="/eol/all"
                                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/eol/all' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                                onClick={() => setDashboardOpen(false)}
                              >
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                EOL Requests
                              </Link>
                            )}
                            {!(isShopManager || isSuperSubscriber) && (
                              <Link
                                href="/wins/all"
                                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/wins/all' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                                onClick={() => setDashboardOpen(false)}
                              >
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                Reported Wins
                              </Link>
                            )}
                            {!(isShopManager || isSuperSubscriber) && (
                              <Link
                                href="/waitlist/all"
                                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/waitlist/all' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                                onClick={() => setDashboardOpen(false)}
                              >
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Waitlist entries
                              </Link>
                            )}
                            {!(isShopManager || isSuperSubscriber) && (
                              <Link
                                href="/admin/dispatch/all"
                                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/admin/dispatch/all' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                                onClick={() => setDashboardOpen(false)}
                              >
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                Dispatch List
                              </Link>
                            )}

                            {userRole === "Admin" && (
                              <Link
                                href="/admin/userlist"
                                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/admin/userlist' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                                onClick={() => setDashboardOpen(false)}
                              >
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                User List
                              </Link>
                            )}
                          </div>
                        )} */}
                      </div>
                    );
                  }

                  return (
                    <div key={n.href} className="flex items-center gap-2">
                      <Link
                        href={n.href}
                        className={`relative px-2 py-1 hover:text-black
                          ${isActive ? "text-black after:w-full" : ""}
                          after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:-bottom-[2px]
                          after:h-[2px] after:w-0 after:bg-black after:transition-all hover:after:w-full`}
                      >
                        {n.label}
                      </Link>

                      {n.href === "/how-it-works" && (
                        <div
                          className="relative"
                          onMouseEnter={() => setOemOpen(true)}
                          onMouseLeave={() => setOemOpen(false)}
                        >
                          <button
                            onClick={() => setOemOpen(!oemOpen)}
                            className="px-2 py-1 hover:text-black"
                          >
                            Create Demo Kit
                          </button>

                          {oemOpen && (
                            <div className="absolute top-full mt-0 w-35 bg-white border border-gray-100 rounded-md shadow-lg py-1 z-[60]">
                              <Link
                                href="/oem/poly"
                                className={`flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${pathname === '/oem/poly' ? 'text-[#112F45] font-medium' : 'text-gray-700'}`}
                                onClick={() => setOemOpen(false)}
                              >
                                Poly
                              </Link>
                              <Link
                                href="/oem/logitech"
                                className={`flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${pathname === '/oem/logitech' ? 'text-[#112F45] font-medium' : 'text-gray-700'}`}
                                onClick={() => setOemOpen(false)}
                              >
                                Logitech
                              </Link>
                              <Link
                                href="/oem/neat"
                                className={`flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${pathname === '/oem/neat' ? 'text-[#112F45] font-medium' : 'text-gray-700'}`}
                                onClick={() => setOemOpen(false)}
                              >
                                Neat
                              </Link>

                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              </nav>
            )}

            {/* DESKTOP ICONS */}
            <div className="hidden md:flex items-center gap-0.4">
              {/* SEARCH BAR - Autocomplete */}
              {/* SEARCH ICON BUTTON (Always visible) */}
              {!isAuthPage && (
                <button
                  onClick={() => setSearchExpanded(true)}
                  className="p-1 text-gray-500 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100"
                  title="Search"
                >

                  <img
                    src="/searchicon.png"
                    alt="Search"
                    className="w-6 h-6 object-contain"
                  />
                  {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg> */}
                </button>
              )}

              {/* NOTIFICATION DROPDOWN */}
              {!isAuthPage && (userRole === 'Admin' || userRole === 'Super Subscriber') && (
                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (notifyCloseTimeout.current) {
                      clearTimeout(notifyCloseTimeout.current);
                      notifyCloseTimeout.current = null;
                    }
                    setNotifyOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (notifyCloseTimeout.current) clearTimeout(notifyCloseTimeout.current);
                    notifyCloseTimeout.current = window.setTimeout(() => {
                      setNotifyOpen(false);
                      notifyCloseTimeout.current = null;
                    }, 150);
                  }}
                >
                  <button
                    onClick={() => setNotifyOpen(!notifyOpen)}
                    className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 relative"
                  >
                    <img
                      src="/notify.png"
                      alt="Notifications"
                      className="w-6 h-6 object-contain"
                    />
                    {notifications.total > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-1 ring-white">
                        {notifications.total}
                      </span>
                    )}
                  </button>

                  {notifyOpen && (
                    <div className="absolute right-0 mt-1 w-[260px] bg-white border border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] py-0 z-[60] animate-in fade-in slide-in-from-top-3 duration-300 overflow-hidden">
                      <div className="px-6 py-3 border-b border-gray-100">
                        <h3 className="font-semibold text-[15px] text-gray-900">Notifications</h3>
                      </div>
                      <div className="px-4 py-3 space-y-1">
                        <Link
                          href="/admin/users/pending-users"
                          className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-xl transition-all duration-200"
                          onClick={() => setNotifyOpen(false)}
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] text-gray-900">User Approval(s)</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Pending user verification(s)</p>
                          </div>
                          {notifications.users > 0 && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#112F45] text-[11px] font-bold text-white flex-shrink-0">
                              {notifications.users}
                            </div>
                          )}
                        </Link>

                        <Link
                          href="/orders/awaiting-approval"
                          className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-xl transition-all duration-200"
                          onClick={() => setNotifyOpen(false)}
                        >
                          <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] text-gray-900">Orders Approval(s)</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Pending order approval(s)</p>
                          </div>
                          {notifications.orders > 0 && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#112F45] text-[11px] font-bold text-white flex-shrink-0">
                              {notifications.orders}
                            </div>
                          )}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACCOUNT DROPDOWN */}
              <div
                className={`relative ${pathname === "/register" || pathname === "/login" ? "mr-12" : ""}`}
                onMouseEnter={() => {
                  if (accountCloseTimeout.current) {
                    clearTimeout(accountCloseTimeout.current);
                    accountCloseTimeout.current = null;
                  }
                  setAccountOpen(true);
                }}
                onMouseLeave={() => {
                  if (accountCloseTimeout.current) clearTimeout(accountCloseTimeout.current);
                  accountCloseTimeout.current = window.setTimeout(() => {
                    setAccountOpen(false);
                    accountCloseTimeout.current = null;
                  }, 150);
                }}
              >
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className={`flex items-center gap-0.5 px-3 py-1.5 rounded-full transition-all duration-300 ${accountOpen ? "bg-gray-100" : "hover:bg-gray-100"
                    }`}
                >
                  <img
                    src="/accountlogo.png"
                    alt="Account"
                    className="w-6 h-6 object-contain"
                  />
                  <ChevronUp
                    className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-300 ${accountOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-100 rounded-md shadow-lg py-1 z-[60]">
                    {!user ? (
                      <>
                        <Link
                          href="/login"
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-[14px] hover:bg-gray-50 transition-colors ${pathname === '/login' ? 'text-[#112F45] font-medium' : 'text-gray-700'}`}
                          onClick={() => setAccountOpen(false)}
                        >
                          Login
                        </Link>
                        <Link
                          href="/register"
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-[14px] hover:bg-gray-50 transition-colors ${pathname === '/register' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                          onClick={() => setAccountOpen(false)}
                        >
                          Register
                        </Link>
                      </>
                    ) : (
                      <>
                        {/* <Link
                          href="/account"
                          className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/account' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                          onClick={() => setAccountOpen(false)}
                        >
                          Profile Settings
                        </Link> */}
                        {userRole === "Admin" && (
                          <>
                            <Link
                              href="/admin/logs"
                              className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/admin/logs' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                              onClick={() => setAccountOpen(false)}
                            >
                              Activity Logs
                            </Link>
                            <Link
                              href="/orders/overdue"
                              className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/orders/overdue' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                              onClick={() => setAccountOpen(false)}
                            >
                              Overdue Orders
                            </Link>
                            <Link
                              href="/admin/inventory-logs"
                              className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/admin/inventory-logs' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                              onClick={() => setAccountOpen(false)}
                            >
                              Inventory Logs
                            </Link>
                            {/* <Link
                              href="/admin/user-logs"
                              className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/admin/user-logs' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                              onClick={() => setAccountOpen(false)}
                            >
                              User Logs
                            </Link> */}
                          </>
                        )}
                        {['Admin', 'Logitech Super Subscriber', 'Program Manager'].includes(userRole as string) && (
                          <Link
                            href="/360dashboard-logitech"
                            className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/360dashboard-logitech' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            Logitech Dashboard
                          </Link>
                        )}
                        {['Admin', 'Poly Super Subscriber', 'Program Manager'].includes(userRole as string) && (
                          <Link
                            href="/360dashboard-poly"
                            className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/360dashboard-poly' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            Poly Dashboard
                          </Link>
                        )}
                        {['Admin', 'Neat Super Subscriber', 'Program Manager'].includes(userRole as string) && (
                          <Link
                            href="/360dashboard-neat"
                            className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/360dashboard-neat' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            Neat Dashboard
                          </Link>
                        )}
                        <Link
                          href="/change-password"
                          className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/change-password' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                          onClick={() => setAccountOpen(false)}
                        >
                          Change Password
                        </Link>
                        {userRole !== "Shop Manager" && (
                          <Link
                            href="/orders/my"
                            className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] hover:bg-gray-50 transition-colors ${pathname === '/orders/my' ? 'text-[#112F45] font-medium' : 'text-gray-800'}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            My Orders
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setAccountOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-2.5 w-full text-left px-4 py-1.5 text-[13px] text-gray-800 hover:bg-gray-50 transition-colors"
                        >
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* CART */}
              {!isAuthPage && user && userRole !== "Shop Manager" && (
                <button
                  onClick={openCart}
                  className="inline-flex items-center justify-center p-2 rounded-full hover:bg-gray-100 w-10 h-10"
                >
                  <div className="relative flex">
                    <img src="https://www.shiuchub.com/cart.png" alt="Cart" className="w-7 h-7 object-contain" />
                    {items.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-1 ring-white">
                        {items.length}
                      </span>
                    )}
                  </div>
                </button>
              )}
            </div>

            {/* MOBILE CONTROLS (Right Aligned) */}
            <div className="flex items-center gap-1 md:hidden">
              {/* Mobile Search Icon */}
              <button
                onClick={() => setSearchExpanded(true)}
                className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                title="Search"
              >
                <img
                  src="/searchicon.png"
                  alt="Search"
                  className="w-6 h-6 object-contain"
                />
              </button>

              {/* Mobile Notifications Icon */}
              {!isAuthPage && (userRole === 'Admin' || userRole === 'Super Subscriber') && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotifyOpen(!notifyOpen);
                      setAccountOpen(false);
                    }}
                    className="flex items-center justify-center p-1 rounded-full relative"
                  >
                    <img
                      src="/notify.png"
                      alt="Notifications"
                      className="w-6 h-6 object-contain"
                    />
                    {notifications.total > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-1 ring-white">
                        {notifications.total}
                      </span>
                    )}
                  </button>

                  {notifyOpen && (
                    <div className="absolute right-[-40px] mt-3 w-[260px] bg-white border border-gray-100 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] py-0 z-[60] animate-in fade-in slide-in-from-top-3 duration-300 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-semibold text-[15px] text-gray-900">Notifications</h3>
                      </div>
                      <div className="px-4 py-3 space-y-1">
                        <Link
                          href="/admin/users/pending-users"
                          className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-xl transition-all duration-200"
                          onClick={() => setNotifyOpen(false)}
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] text-gray-900">User Approval(s)</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Pending user verification(s)</p>
                          </div>
                          {notifications.users > 0 && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#112F45] text-[11px] font-bold text-white flex-shrink-0">
                              {notifications.users}
                            </div>
                          )}
                        </Link>

                        <Link
                          href="/orders/awaiting-approval"
                          className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-xl transition-all duration-200"
                          onClick={() => setNotifyOpen(false)}
                        >
                          <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] text-gray-900">Awaiting Approval(s)</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Pending order approval(s)</p>
                          </div>
                          {notifications.orders > 0 && (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#112F45] text-[11px] font-bold text-white flex-shrink-0">
                              {notifications.orders}
                            </div>
                          )}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile Account Icon */}
              <div className="relative">
                <button
                  onClick={() => {
                    setAccountOpen(!accountOpen);
                    setNotifyOpen(false);
                  }}
                  className={`flex items-center justify-center p-1 rounded-full transition-all duration-300 ${accountOpen ? "bg-gray-100" : ""
                    }`}
                >
                  <img
                    src="/accountlogo.png"
                    alt="Account"
                    className="w-6 h-6 object-contain"
                  />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-white border border-gray-100 rounded-md shadow-lg py-1 z-[60]">
                    {!user ? (
                      <>
                        <Link
                          href="/login"
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/login' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                          onClick={() => setAccountOpen(false)}
                        >
                          Login
                        </Link>
                        <Link
                          href="/register"
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/register' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                          onClick={() => setAccountOpen(false)}
                        >
                          Register
                        </Link>
                      </>
                    ) : (
                      <>
                        {/* <Link
                          href="/account"
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/account' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                          onClick={() => setAccountOpen(false)}
                        >
                          Profile Settings
                        </Link> */}
                        {userRole === "Admin" && (
                          <>
                            <Link
                              href="/admin/logs"
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/admin/logs' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                              onClick={() => setAccountOpen(false)}
                            >
                              Activity Logs
                            </Link>
                            <Link
                              href="/admin/inventory-logs"
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/admin/inventory-logs' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                              onClick={() => setAccountOpen(false)}
                            >
                              Inventory Logs
                            </Link>
                            {/* <Link
                              href="/admin/user-logs"
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/admin/user-logs' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                              onClick={() => setAccountOpen(false)}
                            >
                              User Logs
                            </Link> */}
                          </>
                        )}
                        <Link
                          href="/change-password"
                          className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/change-password' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                          onClick={() => setAccountOpen(false)}
                        >
                          Change Password
                        </Link>
                        {userRole !== "Shop Manager" && (
                          <Link
                            href="/orders/my"
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/orders/my' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            My Orders
                          </Link>
                        )}
                        {['Admin', 'Logitech Super Subscriber', 'Program Manager'].includes(userRole as string) && (
                          <Link
                            href="/360dashboard-logitech"
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/360dashboard-logitech' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            Logitech Dashboard
                          </Link>
                        )}
                        {['Admin', 'Poly Super Subscriber', 'Program Manager'].includes(userRole as string) && (
                          <Link
                            href="/360dashboard-poly"
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/360dashboard-poly' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            Poly Dashboard
                          </Link>
                        )}
                        {['Admin', 'Neat Super Subscriber', 'Program Manager'].includes(userRole as string) && (
                          <Link
                            href="/360dashboard-neat"
                            className={`flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${pathname === '/360dashboard-neat' ? 'text-[#112F45] font-semibold' : 'text-gray-700'}`}
                            onClick={() => setAccountOpen(false)}
                          >
                            Neat Dashboard
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setAccountOpen(false);
                            logout();
                          }}
                          className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Cart Icon */}
              {user && userRole !== "Shop Manager" && (
                <button
                  onClick={openCart}
                  className="inline-flex items-center justify-center p-1 w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <div className="relative flex">
                    <img src="/cart.png" alt="Cart" className="w-6 h-6 object-contain" />
                    {items.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-1 ring-white">
                        {items.length}
                      </span>
                    )}
                  </div>
                </button>
              )}

              {/* Hamburger Menu */}
              <button
                onClick={() => setMobileOpen(true)}
                className="p-1"
                aria-label="Open Menu"
              >
                <img src="/menu.png" alt="Menu" className="w-7 h-7 object-contain" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 md:hidden ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
          onClick={() => {
            setMobileOpen(false);
            setMobileOemOpen(false);
            setMobileDashboardOpen(false);
          }}
        />

        {/* Drawer Container */}
        <div
          className={`fixed top-0 right-0 bottom-0 w-[80%] max-w-[320px] bg-white z-[70] shadow-2xl transform transition-transform duration-500 ease-out md:hidden flex flex-col ${mobileOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <Link href="/" onClick={() => setMobileOpen(false)}>
              <img src="/logo1.png" alt="SHI UC HUB" className="w-[130px] h-auto object-contain" />
            </Link>
            <button
              onClick={() => {
                setMobileOpen(false);
                setMobileOemOpen(false);
                setMobileDashboardOpen(false);
              }}
              className="p-2 -mr-2 text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto pt-0 pb-8 px-0">
            <nav className="">
              {filteredNav.map((n) => {
                const isActive = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));

                // 360Dashboard Dropdown in Mobile
                if (n.hasDropdown) {
                  return (
                    <div key={n.href} className="border-b border-gray-100">
                      <button
                        onClick={() => setMobileDashboardOpen(!mobileDashboardOpen)}
                        className="flex items-center justify-between w-full text-gray-800 font-medium px-6 py-4 transition-colors hover:text-blue-600"
                      >
                        <span className="text-[15px]">{n.label}</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${mobileDashboardOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {/* {mobileDashboardOpen && (
                        <div className="bg-gray-50/50 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <Link
                            href="/orders/all"
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-10 py-3 text-[14px] ${pathname === '/orders/all' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                          >
                            All Orders
                          </Link>
                          <Link
                            href="/inventory/live"
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-10 py-3 text-[14px] ${pathname === '/inventory/live' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                          >
                            Live Inventory
                          </Link>
                          {!(isShopManager || isSuperSubscriber) && (
                            <Link
                              href="/eol/all"
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-3 px-10 py-3 text-[14px] ${pathname === '/eol/all' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                            >
                              EOL Requests
                            </Link>
                          )}
                          {!(isShopManager || isSuperSubscriber) && (
                            <Link
                              href="/wins/all"
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-3 px-10 py-3 text-[14px] ${pathname === '/wins/all' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                            >
                              Reported Wins
                            </Link>
                          )}
                          {!(isShopManager || isSuperSubscriber) && (
                            <Link
                              href="/waitlist/all"
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-3 px-10 py-3 text-[14px] ${pathname === '/waitlist/all' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                            >
                              Waitlist entries
                            </Link>
                          )}
                          {!(isShopManager || isSuperSubscriber) && (
                            <Link
                              href="/admin/logs"
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-3 px-10 py-3 text-[14px] ${pathname === '/admin/logs' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                            >
                              Activity Logs
                            </Link>
                          )}
                          {!(isShopManager || isSuperSubscriber) && (
                            <Link
                              href="/admin/inventory-logs"
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-3 px-10 py-3 text-[14px] ${pathname === '/admin/inventory-logs' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                            >
                              Inventory Logs
                            </Link>
                          )}
                          {userRole === "Admin" && (
                            <Link
                              href="/admin/userlist"
                              onClick={() => setMobileOpen(false)}
                              className={`flex items-center gap-3 px-10 py-3 text-[14px] ${pathname === '/admin/userlist' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                            >
                              User List
                            </Link>
                          )}
                        </div>
                      )} */}
                    </div>
                  );
                }

                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-6 py-4 border-b border-gray-100 text-[15px] transition-colors
                        ${isActive ? "text-blue-600 font-semibold" : "text-gray-800 hover:text-blue-600"}`}
                  >
                    {n.label}
                  </Link>
                );
              })}

              {/* Create Demo Kits Dropdown in Mobile */}
              {userRole !== "Shop Manager" && (
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => setMobileOemOpen(!mobileOemOpen)}
                    className="flex items-center justify-between w-full text-gray-800 font-medium px-6 py-4 hover:text-blue-600 transition-colors"
                  >
                    <span className="text-[15px]">Create Demo Kits</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${mobileOemOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {mobileOemOpen && (
                    <div className="bg-gray-50/50 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link
                        href="/oem/poly"
                        onClick={() => {
                          setMobileOpen(false);
                          setMobileOemOpen(false);
                        }}
                        className={`block px-10 py-3 text-[13px] transition-colors ${pathname === '/oem/poly' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                      >
                        Poly
                      </Link>
                      <Link
                        href="/oem/logitech"
                        onClick={() => {
                          setMobileOpen(false);
                          setMobileOemOpen(false);
                        }}
                        className={`block px-10 py-3 text-[13px] transition-colors ${pathname === '/oem/logitech' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                      >
                        Logitech
                      </Link>
                      <Link
                        href="/oem/neat"
                        onClick={() => {
                          setMobileOpen(false);
                          setMobileOemOpen(false);
                        }}
                        className={`block px-10 py-3 text-[13px] transition-colors ${pathname === '/oem/neat' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                      >
                        Neat
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* Drawer Footer (Account/Logout) */}
          <div className="p-5 border-t border-gray-100 bg-gray-50/50">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <img src="/accountlogo.png" className="w-6 h-6 object-contain" alt="Profile" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                    <p className="text-[11px] text-gray-500">{userRole || 'User'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Profile
                  </Link> */}
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="flex items-center justify-center gap-2 py-2 px-3 bg-red-50/50 border border-red-100 rounded-lg text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center py-2.5 px-4 bg-gray-900 text-white rounded-lg text-[14px] font-medium hover:bg-black transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center py-2.5 px-4 bg-white border border-gray-200 text-gray-900 rounded-lg text-[14px] font-medium hover:bg-gray-50 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </>
      {/* SEARCH OVERLAY (Appears Below Header) */}
      {!isAuthPage && searchExpanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-900/20 z-40 transition-opacity duration-300"
            onClick={() => {
              setSearchExpanded(false);
              setSearchDropdownOpen(false);
              setSearchQuery("");
            }}
          ></div>

          {/* Search Container */}
          <div className="absolute top-full left-0 w-full z-50 flex justify-center animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
            {/* Wrapper matches header max-width and aligns right */}
            <div className="w-full max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-end pointer-events-none">
              <div className="w-[300px] pointer-events-auto">
                <div className="relative">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        router.push(
                          `/search?q=${encodeURIComponent(searchQuery)}`
                        );
                        setSearchDropdownOpen(false);
                        setSearchExpanded(false);
                      }
                    }}
                    className="relative flex items-center bg-white rounded-full shadow-2xl ring-1 ring-gray-200"
                  >
                    {/* Search Icon (Left) */}
                    <div className="absolute left-6 text-gray-400 pointer-events-none">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>

                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        if (val.trim().length > 0) {
                          const lower = val.toLowerCase();
                          const filtered = allProducts
                            .filter(
                              (p) =>
                                (p.product_name?.toLowerCase() || "").includes(
                                  lower
                                ) ||
                                (p.product_sku?.toLowerCase() || "").includes(
                                  lower
                                )
                            )
                            .slice(0, 8); // Limit to 8 results
                          setSearchResults(filtered);
                          setSearchDropdownOpen(true);
                        } else {
                          setSearchDropdownOpen(false);
                        }
                      }}
                      onFocus={() => {
                        if (searchQuery.trim().length > 0) {
                          setSearchDropdownOpen(true);
                        }
                      }}
                      placeholder="Search..."
                      className="w-full bg-transparent border-none py-1 pl-14 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 rounded-full"
                    />

                    {/* Close Icon (Right) */}
                    <button
                      type="button"
                      onClick={() => {
                        if (searchQuery) {
                          setSearchQuery("");
                          setSearchDropdownOpen(false);
                        } else {
                          setSearchExpanded(false);
                        }
                      }}
                      className="absolute right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </form>

                  {/* DROPDOWN RESULTS */}
                  {searchDropdownOpen && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-50 max-h-[500px] overflow-y-auto">
                      <ul>
                        {searchResults.map((product) => (
                          <li key={product.id}>
                            <Link
                              href={`/create-demo-kits/${product.id}`}
                              className="flex items-start gap-4 px-5 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors"
                              onClick={() => {
                                setSearchDropdownOpen(false);
                                setSearchQuery("");
                                setSearchExpanded(false);
                              }}
                            >
                              {/* IMAGE THUMBNAIL */}
                              <div className="w-13 h-13 flex-shrink-0 flex items-center justify-center overflow-hidden bg-white border border-gray-100 rounded-lg p-1">
                                {product.main_image_url ? (
                                  <img
                                    src={product.main_image_url}
                                    alt={product.product_name}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-[10px] text-gray-300 rounded">
                                    No Img
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 pt-1">
                                <div className="text-[12px] font-medium text-gray-900 leading-snug mb-0.5">
                                  {product.product_name}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  SKU #: {product.product_sku}
                                </div>
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
