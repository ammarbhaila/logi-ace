"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function AllEOLPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchSessionAndEOL = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                router.push('/login');
                return;
            }

            try {
                const profileRes = await fetch("/api/auth/me");
                const profileData = await profileRes.json();
                const role = profileData.userrole || null;
                setUserRole(role);

                if (role !== 'Admin' && role !== 'Shop Manager' && role !== 'Super Subscriber') {
                    router.push('/');
                    return;
                }

                const res = await fetch("/api/eol");
                const data = await res.json();
                if (Array.isArray(data)) {
                    setRequests(data);
                    setFilteredRequests(data);
                }
            } catch (err) {
                console.error('Failed to fetch EOL requests:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSessionAndEOL();
    }, [router]);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredRequests(requests);
            return;
        }
        const q = search.toLowerCase();
        const filtered = requests.filter(r =>
            r.submitted_by?.toLowerCase().includes(q) ||
            r.eol_items?.some((item: any) =>
                item.product_name?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q) ||
                item.address?.toLowerCase().includes(q)
            )
        );
        setFilteredRequests(filtered);
    }, [search, requests]);

    const handleExport = () => {
        const exportData = filteredRequests.flatMap(r =>
            r.eol_items?.map((item: any) => ({
                'Date': new Date(r.created_at).toLocaleDateString(),
                'Submitted By': r.submitted_by,
                'Product Name': item.product_name,
                'SKU': item.sku,
                'Quantity': item.quantity,
                'Pickup Address': item.address
            })) || []
        );
        downloadCSV(exportData, 'eol_requests');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#112F45]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-12 px-6 lg:px-12 font-sans">
            <div className="max-w-[1400px] mx-auto transition-all duration-300">
                {/* FILTERS & ACTIONS */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">EOL Requests</h1>

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
                                className="w-full h-[34px] pl-8 pr-3 border border-gray-300 rounded-md bg-white text-[13px] outline-none focus:border-gray-400 transition-all font-sans"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
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
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Date</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Submitted By</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Items</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">Total Qty</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Pickup Addresses</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                                            No EOL requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 text-[13px] text-gray-600 border-r border-gray-100">
                                                {new Date(req.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] font-medium text-gray-900 border-r border-gray-100">
                                                {req.submitted_by}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-700 border-r border-gray-100">
                                                <ul className="space-y-1">
                                                    {req.eol_items?.map((item: any) => (
                                                        <li key={item.id} className="text-[11px]">
                                                            <span className="font-semibold text-gray-800">{item.product_name}</span>
                                                            <span className="text-gray-400 ml-1">({item.sku})</span>
                                                            <span className="ml-2 px-1 py-0.5 bg-gray-100 rounded text-gray-600">x{item.quantity}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-700 font-semibold border-r border-gray-100">
                                                {req.eol_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-600 medium">
                                                {Array.from(new Set(req.eol_items?.map((i: any) => i.address))).filter(Boolean).join(' | ')}
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
                        Showing <span className="text-gray-800">{filteredRequests.length}</span> of <span className="text-gray-800">{requests.length}</span> EOL requests
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
