"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { downloadCSV } from '@/lib/exportUtils';

export default function GlobalOrderLogsPage() {
    const router = useRouter();
    const [orderLogs, setOrderLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);

    const [visibleColumns, setVisibleColumns] = useState({
        dateTime: true,
        orderId: true,
        action: true,
        user: true,
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target as Node)) {
                setShowColumnMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

                // Fetch logs
                const res = await fetch(`/api/admin/logs`);
                if (res.ok) {
                    const data = await res.json();
                    setOrderLogs(data);
                }
            } catch (err) {
                console.error('[DEBUG] Failed to fetch global order logs:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoleAndLogs();
    }, [router]);

    // Filter logs based on search term
    const filteredLogs = orderLogs.filter((log) => {
        const searchStr = `${log.order_id} ${log.action} ${log.performed_by}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const handleExport = () => {
        const exportData = filteredLogs.map(log => {
            const row: any = {};
            if (visibleColumns.dateTime) row['Date & Time'] = new Date(log.created_at).toLocaleString();
            if (visibleColumns.orderId) row['Order #'] = log.order_id;
            if (visibleColumns.action) row['Action'] = log.action;
            if (visibleColumns.user) row['User'] = log.performed_by || 'System';
            return row;
        });
        downloadCSV(exportData, 'activity_logs');
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 2 0 01.707.293l5.414 5.414a1 2 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        Order Activity Logs
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
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Date & Time
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.orderId && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Order #
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.action && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Action Performed
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.user && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                User
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length || 1} className="px-6 py-20 text-center text-gray-500">
                                            {searchTerm ? 'No activity logs matching your search.' : 'No activity logs found in the system.'}
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
                                            {visibleColumns.orderId && (
                                                <td className="px-5 py-2 text-[13px] font-medium border-r border-gray-100 whitespace-nowrap">
                                                    <Link href={`/orders/${log.order_id}`} className="text-[#1e40af] hover:underline">
                                                        #{log.order_id}
                                                    </Link>
                                                </td>
                                            )}
                                            {visibleColumns.action && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {log.action}
                                                </td>
                                            )}
                                            {visibleColumns.user && (
                                                <td className="px-5 py-2 text-[13px] text-gray-600 truncate max-w-[200px]">
                                                    {log.performed_by || 'System'}
                                                </td>
                                            )}
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
                        Showing <span className="text-gray-800">{filteredLogs.length}</span> of <span className="text-gray-800">{orderLogs.length}</span> logs
                    </div>
                    {/* <div className="flex items-center gap-1">
                        <button className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                            Previous
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-900 text-white text-[14px] font-medium">
                            1
                        </button>
                        <button className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                            Next
                        </button>
                    </div> */}
                </div>
            </div>
        </div>
    );
}
