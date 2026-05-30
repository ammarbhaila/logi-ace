"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';
import Link from 'next/link';
import { Suspense } from 'react';

function UserLogsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get('search') || "";

    const [userLogs, setUserLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [userRole, setUserRole] = useState<string | null>(null);

    const [visibleColumns, setVisibleColumns] = useState({
        dateTime: true,
        user: true,
        action: true,
        performedBy: true,
        details: true,
    });

    useEffect(() => {
        const fetchRoleAndLogs = async () => {
            try {
                // Check user role first
                const meRes = await fetch("/api/auth/me");
                const meData = await meRes.json();

                // Allow Managers, Admins, Super Subscribers to view logs
                const allowedRoles = ["Admin", "Shop Manager", "Super Subscriber"];
                if (meData.error || !allowedRoles.includes(meData.userrole)) {
                    router.push("/");
                    return;
                }

                setUserRole(meData.userrole);

                // Fetch user logs
                const res = await fetch(`/api/admin/user-logs`);
                if (res.ok) {
                    const data = await res.json();
                    setUserLogs(data);
                }
            } catch (err) {
                console.error('[DEBUG] Failed to fetch user logs:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoleAndLogs();
    }, [router]);

    // Filter logs based on search term
    const filteredLogs = userLogs.filter((log) => {
        const searchStr = `${log.user_email} ${log.action} ${log.performed_by} ${JSON.stringify(log.details || {})}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const handleExport = () => {
        const exportData = filteredLogs.map(log => {
            const row: any = {};
            if (visibleColumns.dateTime) row['Date & Time'] = new Date(log.created_at).toLocaleString();
            if (visibleColumns.user) row['Target User'] = log.user_email;
            if (visibleColumns.action) row['Action'] = log.action;
            if (visibleColumns.performedBy) row['Performed By'] = log.performed_by || 'System';
            if (visibleColumns.details) row['Details'] = JSON.stringify(log.details || {});
            return row;
        });
        downloadCSV(exportData, 'user_activity_logs');
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
                        User Activity Logs
                    </h1>

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

                {/* TABLE SECTION */}
                <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#f2f2f2] border-b border-gray-200">
                                <tr>
                                    {visibleColumns.dateTime && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">Date & Time</th>
                                    )}
                                    {visibleColumns.user && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">Target User</th>
                                    )}
                                    {visibleColumns.action && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">Action</th>
                                    )}
                                    {visibleColumns.performedBy && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">Performed By</th>
                                    )}
                                    {/* {visibleColumns.details && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">Details</th>
                                    )} */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                                            {searchTerm ? 'No user logs matching your search.' : 'No user logs found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                            {visibleColumns.dateTime && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100 whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString([], {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                            )}
                                            {visibleColumns.user && (
                                                <td className="px-5 py-2 text-[13px] font-medium border-r border-gray-100 whitespace-nowrap">
                                                    {log.user_email}
                                                </td>
                                            )}
                                            {visibleColumns.action && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100 italic">
                                                    {log.action}
                                                </td>
                                            )}
                                            {visibleColumns.performedBy && (
                                                <td className="px-5 py-2 text-[13px] text-gray-600 border-r border-gray-100">
                                                    {log.performed_by || 'System'}
                                                </td>
                                            )}
                                            {/* {visibleColumns.details && (
                                                <td className="px-5 py-2 text-[12px] text-gray-500 truncate max-w-[300px]" title={JSON.stringify(log.details)}>
                                                    {log.details ? JSON.stringify(log.details) : '-'}
                                                </td>
                                            )} */}
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
                        Showing <span className="text-gray-800">{filteredLogs.length}</span> of <span className="text-gray-800">{userLogs.length}</span> logs
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function UserLogsPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#112F45]"></div>
            </div>
        }>
            <UserLogsContent />
        </Suspense>
    );
}
