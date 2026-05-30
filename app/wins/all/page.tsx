"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/outline'; // Keep if used elsewhere, but we might not need it here now.

export default function AllWinsPage() {
    const [wins, setWins] = useState<any[]>([]);
    const [filteredWins, setFilteredWins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchSessionAndWins = async () => {
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

                const res = await fetch("/api/wins");
                const data = await res.json();
                if (Array.isArray(data)) {
                    setWins(data);
                    setFilteredWins(data);
                }
            } catch (err) {
                console.error('Failed to fetch wins:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSessionAndWins();
    }, [router]);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredWins(wins);
            return;
        }
        const q = search.toLowerCase();
        const filtered = wins.filter(w =>
            w.customer_name?.toLowerCase().includes(q) ||
            w.sales_executive?.toLowerCase().includes(q) ||
            w.feedback?.toLowerCase().includes(q) ||
            w.sku?.toLowerCase().includes(q)
        );
        setFilteredWins(filtered);
    }, [search, wins]);

    const handleExport = () => {
        const exportData = filteredWins.map(w => ({
            'Order No': `#${w.order_id || '—'}`,
            'Customer Name': w.customer_name,
            'Date of Submission': new Date(w.created_at).toLocaleDateString(),
            'Total Deal Revenue': `$${Number(w.total_revenue).toLocaleString()}`,
            'No. of Unit': w.num_units,
            'Product Name': w.inventory_products?.product_name || w.sku || '—',
            'Date of Purchase': w.date_of_purchase ? new Date(w.date_of_purchase).toLocaleDateString() : '—'
        }));
        downloadCSV(exportData, 'reported_wins');
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
                    <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Reported Wins</h1>

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
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">Order No</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Customer Name</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">Date of Submission</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">Total Deal Revenue</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">No. of Unit</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Product Name</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">Date of Purchase</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredWins.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                                            No wins reported yet.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredWins.map((win) => (
                                        <tr key={win.win_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 text-[13px] font-semibold text-gray-900 border-r border-gray-100 capitalize">
                                                <Link
                                                    href={`/wins/${win.order_id}`}
                                                    className="text-[13px] font-medium text-[#1e40af] hover:underline"
                                                >
                                                    #{win.order_id || '—'}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-3 text-[13px] font-medium text-gray-900 border-r border-gray-100">
                                                {win.customer_name}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-600 border-r border-gray-100">
                                                {new Date(win.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] font-bold text-gray-500 border-r border-gray-100">
                                                ${Number(win.total_revenue).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-700 border-r border-gray-100 text-center">
                                                {win.num_units}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-800 border-r border-gray-100">
                                                {win.inventory_products?.product_name || win.sku || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-600">
                                                {win.date_of_purchase ? new Date(win.date_of_purchase).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : '—'}
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
                        Showing <span className="text-gray-800">{filteredWins.length}</span> of <span className="text-gray-800">{wins.length}</span> reported wins
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
