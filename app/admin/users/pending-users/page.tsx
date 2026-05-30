/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";

export default function PendingUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loadingId, setLoadingId] = useState<string | null>(null);

    /* ---------------- FETCH DATA ---------------- */
    useEffect(() => {
        fetch("/api/admin/users")
            .then((res) => res.json())
            .then(setUsers);
    }, []);

    /* ---------------- FILTER USERS ---------------- */
    const pendingUsers = users.filter((u) => u.approval_status === "pending");
    const filteredUsers = pendingUsers.filter((u) => {
        const searchStr = `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    /* ---------------- ACTIONS ---------------- */
    const approveUser = async (id: string) => {
        setLoadingId(id);
        const res = await fetch("/api/admin/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: id, is_approved: true }),
        });
        setLoadingId(null);
        if (!res.ok) { alert("Failed to approve user"); return; }
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_approved: true, approval_status: "approved" } : u));
    };

    const rejectUser = async (id: string) => {
        setLoadingId(id);
        const res = await fetch("/api/admin/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: id, is_approved: false }),
        });
        setLoadingId(null);
        if (!res.ok) { alert("Failed to reject user"); return; }
        setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_approved: false, approval_status: "rejected" } : u));
    };

    /* ---------------- EXPORT CSV ---------------- */
    const handleExport = () => {
        const csvContent = [
            ["First Name", "Last Name", "Email", "Registered"].join(","),
            ...filteredUsers.map((u) =>
                [u.first_name, u.last_name, u.email, u.registered_at ? new Date(u.registered_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"].join(",")
            ),
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pending_users.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ---------------- RENDER ---------------- */
    return (
        <div className="min-h-screen bg-white py-12 px-6 lg:px-12 font-sans">
            <div className="max-w-[1400px] mx-auto">
                {/* FILTERS & ACTIONS */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">

                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative w-[210px]">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full h-[34px] pl-8 pr-3 border border-gray-300 rounded-md bg-white text-[13px] outline-none focus:border-gray-400 transition-all text-gray-600"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 h-[34px] px-3 border border-gray-300 rounded-md bg-[#f0f0f0]/50 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#f2f2f2] border-b border-gray-200">
                                <tr>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2">
                                            First Name
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                    {/* <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2">
                                            Last Name
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th> */}
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2">
                                            Email
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2">
                                            Registered
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <p className="text-gray-500 text-[16px]">
                                                {searchTerm ? "No pending users match your search" : "No pending users found"}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-2 text-[13px] text-gray-800 border-r border-gray-100">
                                                {u.first_name}
                                            </td>
                                            {/* <td className="px-5 py-2 text-[13px] text-gray-800 border-r border-gray-100">
                                                {u.last_name}
                                            </td> */}
                                            <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                {u.email}
                                            </td>
                                            <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                {u.registered_at
                                                    ? new Date(u.registered_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                                    : "—"}
                                            </td>
                                            <td className="px-5 py-2">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Reject */}
                                                    <button
                                                        disabled={loadingId === u.id}
                                                        onClick={() => rejectUser(u.id)}
                                                        className="flex items-center gap-2 h-[28px] px-2.5 border border-[#1a1c3d] rounded-md bg-[#f0f7ff] text-[11px] font-medium text-[#1a1c3d] hover:bg-[#e0eeff] disabled:opacity-50 transition-colors"
                                                        title="Reject"
                                                    >
                                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="18" y1="6" x2="6" y2="18" />
                                                            <line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                        Reject
                                                    </button>

                                                    {/* Approve */}
                                                    <button
                                                        disabled={loadingId === u.id}
                                                        onClick={() => approveUser(u.id)}
                                                        className="flex items-center gap-2 h-[28px] px-2.5 rounded-md bg-[#213643] text-[11px] font-medium text-white hover:bg-[#1a2b35] disabled:opacity-50 transition-colors"
                                                        title="Approve"
                                                    >
                                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        Approve
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PAGINATION */}
                <div className="flex items-center justify-between mt-7">
                    <div className="text-[13px] text-gray-500 font-medium">
                        Showing <span className="text-gray-800">{filteredUsers.length}</span> of <span className="text-gray-800">{pendingUsers.length}</span> pending users
                    </div>
                    <div className="flex items-center gap-1">
                        {/* <button className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                            Previous
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-900 text-white text-[14px] font-medium">
                            1
                        </button>
                        <button className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                            Next
                        </button> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
