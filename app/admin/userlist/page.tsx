"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';

export default function UserListPage() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchRoleAndUsers = async () => {
            try {
                // Check user role first
                const meRes = await fetch("/api/auth/me");
                const meData = await meRes.json();

                // Only Admins allowed here
                if (meData.error || meData.userrole !== "Admin") {
                    router.push("/");
                    return;
                }

                setUserRole(meData.userrole);

                // Fetch users
                const res = await fetch(`/api/admin/users`);
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                }
            } catch (err) {
                console.error('[DEBUG] Failed to fetch users:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoleAndUsers();
    }, [router]);

    // Filter users based on search term (Email or Full Name)
    const filteredUsers = users.filter((u) => {
        const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || email.includes(search);
    });

    const handleExport = () => {
        const exportData = filteredUsers.map(u => ({
            'Full Name': `${u.first_name} ${u.last_name}`,
            'Email': u.email,
            'Registered Date': u.registered_at ? new Date(u.registered_at).toLocaleDateString() : 'Never',
            'Login Count': u.login_count || 0,
            'Last Login Date': u.last_login_date ? new Date(u.last_login_date).toLocaleDateString() : 'Never'
        }));
        downloadCSV(exportData, 'user_list');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#112F45]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-12 px-6 lg:px-12 font-sans md:mt-0">
            <div className="max-w-[1400px] mx-auto transition-all duration-300">
                {/* PAGE HEADER & ACTIONS BAR */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-semibold text-gray-800 tracking-tight flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        User List
                    </h1>

                    <div className="flex items-center gap-2">
                        <div className="relative w-[210px]">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
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
                                    <th className="px-5 py-2 font-medium text-gray-800 text-[14px] border-r border-gray-100">
                                        Full Name
                                    </th>
                                    <th className="px-5 py-2 font-medium text-gray-800 text-[14px] border-r border-gray-100">
                                        Email
                                    </th>
                                    <th className="px-5 py-2 font-medium text-gray-800 text-[14px] border-r border-gray-100">
                                        Registered Date
                                    </th>
                                    <th className="px-5 py-2 font-medium text-gray-800 text-[14px] text-center border-r border-gray-100">
                                        Login Count
                                    </th>
                                    <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                        Last Login Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-gray-500 italic">
                                            {searchTerm ? 'No users matching your search.' : 'No users found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 text-[13px] font-semibold text-gray-900 border-r border-gray-100 whitespace-nowrap">
                                                {u.first_name} {u.last_name}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-600 border-r border-gray-100">
                                                {u.email}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-700 border-r border-gray-100 whitespace-nowrap">
                                                {u.registered_at ? new Date(u.registered_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                }) : 'Never'}
                                            </td>
                                            <td className="px-5 py-3 text-center border-r border-gray-100">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold rounded bg-gray-50 text-gray-700 min-w-[24px]">
                                                    {u.login_count || 0}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-600 whitespace-nowrap">
                                                {u.last_login_date ? new Date(u.last_login_date).toLocaleString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit"
                                                }) : 'Never'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PAGINATION FOOTER */}
                <div className="flex items-center justify-between mt-7">
                    <div className="text-[13px] text-gray-500 font-medium">
                        Showing <span className="text-gray-800">{filteredUsers.length}</span> of <span className="text-gray-800">{users.length}</span> users
                    </div>
                </div>
            </div>
        </div>
    );
}
