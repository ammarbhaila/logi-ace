"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function AllWaitlistPage() {
    const [entries, setEntries] = useState<any[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchSessionAndWaitlist = async () => {
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

                const res = await fetch("/api/waitlist");
                const data = await res.json();
                if (Array.isArray(data)) {
                    setEntries(data);
                    setFilteredEntries(data);
                }
            } catch (err) {
                console.error('Failed to fetch waitlist:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSessionAndWaitlist();
    }, [router]);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredEntries(entries);
            return;
        }
        const q = search.toLowerCase();
        const filtered = entries.filter(e =>
            e.email_address?.toLowerCase().includes(q) ||
            e.company_name?.toLowerCase().includes(q) ||
            e.product_name?.toLowerCase().includes(q) ||
            e.inventory_products?.product_name?.toLowerCase().includes(q) ||
            e.inventory_products?.product_sku?.toLowerCase().includes(q)
        );
        setFilteredEntries(filtered);
    }, [search, entries]);

    const handleExport = () => {
        const exportData = filteredEntries.map(e => ({
            'Product Name': e.inventory_products?.product_name || e.product_name || '—',
            'SKU': e.inventory_products?.product_sku || '—',
            'In Stock': e.inventory_products?.stock_quantity || 0,
            'Total Inventory': e.inventory_products?.stock_quantity || 0,
            'Subscribed By': e.email_address,
            'Company': e.company_name || '—',
            'Subscribed Date': new Date(e.created_at).toLocaleDateString()
        }));
        downloadCSV(exportData, 'waitlist_entries');
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
                    <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Waitlist Entries</h1>

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
                                className="w-full h-[34px] pl-8 pr-3 border border-gray-300 rounded-md bg-white text-[13px] outline-none focus:border-gray-400 transition-all text-gray-600 font-sans"
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
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Product Name</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">SKU</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">In Stock</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">Total Inventory</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Subscribed By</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">Customer Company Name</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px] whitespace-nowrap">Subscribed Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center text-gray-500">
                                            No waitlist entries found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3 text-[13px] font-medium text-gray-900 border-r border-gray-100 capitalize">
                                                {entry.inventory_products?.product_name || entry.product_name || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] font-medium text-gray-600 border-r border-gray-100">
                                                {entry.inventory_products?.product_sku || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] border-r border-gray-100 whitespace-nowrap">
                                                {(entry.inventory_products?.stock_quantity || 0) > 0 ? (
                                                    <span className="px-2 py-0.5 text-[11px] font-bold text-green-700 bg-green-40 rounded-full border border-green-200">
                                                        {entry.inventory_products?.stock_quantity} in stock
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 text-[11px] font-bold text-red-700 bg-red-40 rounded-full border border-red-200">
                                                        Out of stock
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-700 font-medium border-r border-gray-100">
                                                {entry.inventory_products?.stock_quantity || 0}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-blue-600 border-r border-gray-100">
                                                {entry.email_address}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-700 border-r border-gray-100">
                                                {entry.company_name || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-[13px] text-gray-600">
                                                {new Date(entry.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
                        Showing <span className="text-gray-800">{filteredEntries.length}</span> of <span className="text-gray-800">{entries.length}</span> waitlist entries
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
