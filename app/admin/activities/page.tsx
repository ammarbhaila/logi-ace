"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { downloadCSV } from '@/lib/exportUtils';

export default function UserActivitiesPage() {
    const router = useRouter();
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchRoleAndActivities = async () => {
            try {
                const meRes = await fetch("/api/auth/me");
                const meData = await meRes.json();

                const allowedRoles = ["Admin", "Super Subscriber", "Program Manager"];
                if (meData.error || !allowedRoles.includes(meData.userrole)) {
                    router.push("/");
                    return;
                }

                setUserRole(meData.userrole);

                const res = await fetch(`/api/admin/activities`);
                if (res.ok) {
                    const data = await res.json();
                    setActivities(data);
                }
            } catch (err) {
                console.error('[DEBUG] Failed to fetch user activities:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRoleAndActivities();
    }, [router]);

    const filteredActivities = activities.filter((act) => {
        const searchStr = `${act.user_name} ${act.user_email} ${act.action} ${act.route} ${act.error_message}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const handleExport = () => {
        const exportData = filteredActivities.map(act => ({
            'Date': new Date(act.created_at).toLocaleString(),
            'User': act.user_name || 'Anonymous',
            'Email': act.user_email || 'N/A',
            'Action': act.action,
            'Route': act.route,
            'Error': act.is_error ? 'Yes' : 'No',
            'Error Message': act.error_message || '',
            'Metadata': JSON.stringify(act.metadata)
        }));
        downloadCSV(exportData, 'user_activity_report');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#112F45]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-6 lg:px-12 font-sans">
            <div className="max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">User Activity Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <input
                            type="text"
                            placeholder="Search activities..."
                            className="w-[300px] h-10 px-4 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button
                            onClick={handleExport}
                            className="bg-[#112F45] text-white px-4 py-2 rounded-lg hover:bg-[#1a4a6e] transition-colors"
                        >
                            Export Report
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Time</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-sm">User</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Action</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Route</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-sm">Status</th>
                                    <th className="px-6 py-4 font-semibold text-gray-700 text-sm">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredActivities.map((act) => (
                                    <tr key={act.id} className={`hover:bg-gray-50 transition-colors ${act.is_error ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                                            {new Date(act.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-medium text-gray-900">{act.user_name || 'Anonymous'}</div>
                                            <div className="text-gray-500 text-xs">{act.user_email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold uppercase ${
                                                act.action === 'CLIENT_ERROR' ? 'bg-red-100 text-red-700' : 
                                                act.action === 'PAGE_VIEW' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {act.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {act.route}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {act.is_error ? (
                                                <span className="text-red-600 font-medium">Error</span>
                                            ) : (
                                                <span className="text-green-600 font-medium">Success</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {act.ip_address}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
