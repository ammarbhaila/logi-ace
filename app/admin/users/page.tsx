/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { TrashIcon, MagnifyingGlassIcon, XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { downloadCSV } from "@/lib/exportUtils";

const roles = [
  "Admin",
  "Super Subscriber",
  "Shop Manager",
  "Subscriber",
  "Poly Super Subscriber",
  "Logitech Super Subscriber",
  "Neat Super Subscriber",
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const router = useRouter();

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    const fetchSessionAndUsers = async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();

        if (meData.error || meData.userrole !== "Admin") {
          router.push("/");
          return;
        }

        setCurrentUserRole(meData.userrole);

        const usersRes = await fetch("/api/admin/users");
        const usersData = await usersRes.json();
        if (Array.isArray(usersData)) {
          setUsers(usersData);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionAndUsers();
  }, [router]);

  /* ---------------- FILTER USERS ---------------- */
  const filteredUsers = users.filter((u) => {
    const searchStr = `${u.first_name} ${u.last_name} ${u.email} ${u.userrole}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  /* ---------------- HELPERS ---------------- */
  const updateRole = async (id: string, role: string) => {
    setLoadingId(id);
    const res = await fetch("/api/admin/update-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, userrole: role }),
    });
    setLoadingId(null);
    if (!res.ok) { alert("Failed to update role"); return; }
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, userrole: role } : u));
  };

  const deleteUser = async (id: string) => {
    const confirmed = confirm("Are you sure you want to delete this user? This cannot be undone.");
    if (!confirmed) return;
    setLoadingId(id);
    const res = await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id }),
    });
    setLoadingId(null);
    if (!res.ok) { alert("Failed to delete user"); return; }
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Super Subscriber": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Shop Manager": return "bg-green-50 text-green-700 border-green-200";
      case "Subscriber": return "bg-gray-50 text-gray-700 border-gray-200";
      default: return "bg-orange-50 text-orange-700 border-orange-200";
    }
  };

  const handleExport = () => {
    const exportData = filteredUsers.map(u => ({
      'First Name': u.first_name,
      'Last Name': u.last_name,
      'Email': u.email,
      'Role': u.userrole,
      'Registered': u.registered_at ? new Date(u.registered_at).toLocaleDateString() : 'Never',
      'Last Login': u.last_login_date ? new Date(u.last_login_date).toLocaleDateString() : 'Never',
      'Login Count': u.login_count || 0
    }));
    downloadCSV(exportData, 'admin_ user_list');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#112F45]"></div>
      </div>
    );
  }

  if (currentUserRole !== "Admin") return null;

  /* ---------------- RENDER ---------------- */
  return (
    <div className="min-h-screen bg-white py-12 px-6 lg:px-12 font-sans">
      <div className="max-w-[1400px] mx-auto transition-all duration-300">
        {/* FILTERS & ACTIONS */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">User Management</h1>

          <div className="flex items-center gap-2">
            <div className="relative w-[210px]">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search"
                className="w-full h-[34px] pl-8 pr-3 border border-gray-300 rounded-md bg-white text-[13px] outline-none focus:border-gray-400 transition-all text-gray-600 font-sans"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 h-[34px] px-3 border border-gray-300 rounded-md bg-[#f0f0f0]/50 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-gray-500" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f2f2f2] border-b border-gray-200">
                <tr>
                  <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">User Details</th>
                  <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Registered</th>
                  <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Last Activity</th>
                  <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] text-center">Logins</th>
                  <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Role Management</th>
                  <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-gray-500 italic">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 border-r border-gray-100">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold text-gray-900">{u.first_name} {u.last_name}</span>
                          <span className="text-gray-500 text-[11px]">{u.email}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-gray-600 border-r border-gray-100 whitespace-nowrap">
                        {formatDate(u.registered_at)}
                      </td>
                      <td className="px-5 py-3 text-[13px] text-gray-600 border-r border-gray-100 whitespace-nowrap">
                        {formatDate(u.last_login_date)}
                      </td>
                      <td className="px-5 py-3 text-center border-r border-gray-100">
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold rounded bg-gray-100 text-gray-700 min-w-[20px]">
                          {u.login_count || 0}
                        </span>
                      </td>
                      <td className="px-5 py-3 border-r border-gray-100">
                        <div className="flex items-center gap-2 max-w-[240px]">
                          <select
                            value={u.userrole}
                            onChange={(e) =>
                              setUsers((prev) =>
                                prev.map((x) =>
                                  x.id === u.id ? { ...x, userrole: e.target.value } : x
                                )
                              )
                            }
                            className="flex-1 h-[28px] bg-white border border-gray-300 rounded px-2 text-[12px] outline-none focus:border-gray-400 transition-all font-sans"
                          >
                            {roles.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                          <button
                            disabled={loadingId === u.id}
                            onClick={() => updateRole(u.id, u.userrole)}
                            className="h-[28px] px-3 bg-[#112F45] text-white text-[11px] font-bold rounded hover:bg-[#1a4a6e] disabled:opacity-50 transition-all shadow-sm uppercase"
                          >
                            {loadingId === u.id ? "..." : "Save"}
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/user-logs?search=${u.email}`}
                          title="View Activity Logs"
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        </Link>
                        <button
                          disabled={loadingId === u.id}
                          onClick={() => deleteUser(u.id)}
                          title="Delete User"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-between mt-10">
          <div className="text-[14px] text-gray-500 font-medium">
            Showing <span className="text-gray-800">{filteredUsers.length}</span> of <span className="text-gray-800">{users.length}</span> users
          </div>
          <div className="flex items-center gap-1">
            <button className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
              Previous
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-900 text-white text-[14px] font-medium">
              1
            </button>
            <button className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
