/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';
import { ArrowDownTrayIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AllDispatchPage() {
    const [dispatches, setDispatches] = useState<any[]>([]);
    const [filteredDispatches, setFilteredDispatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const router = useRouter();

    useEffect(() => {
        const fetchSessionAndData = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch('/api/dispatch');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setDispatches(data);
                    setFilteredDispatches(data);
                }
            } catch (err) {
                console.error('Failed to fetch dispatch records:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSessionAndData();
    }, [router]);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredDispatches(dispatches);
            return;
        }

        const q = search.toLowerCase();
        const filtered = dispatches.filter(d =>
            String(d.id).toLowerCase().includes(q) ||
            d.submitted_by?.toLowerCase().includes(q) ||
            d.tracking_number?.toLowerCase().includes(q) ||
            d.dispatch_items?.some((item: any) =>
                item.product_name?.toLowerCase().includes(q) ||
                item.sku?.toLowerCase().includes(q)
            )
        );
        setFilteredDispatches(filtered);
    }, [search, dispatches]);

    const handleExport = () => {
        const exportData = filteredDispatches.flatMap(d =>
            d.dispatch_items?.map((item: any) => ({
                'Dispatch ID': `#${String(d.id).padStart(4, '0')}`,
                'Submitted By': d.submitted_by,
                'Shipment Date': d.shipment_date ? new Date(d.shipment_date).toLocaleDateString() : '—',
                'Tracking Number': d.tracking_number || '—',
                'Product Name': item.product_name,
                'SKU': item.sku,
                'Quantity': item.quantity,
                'Additional Details': d.additional_details || '—'
            })) || []
        );
        downloadCSV(exportData, 'dispatch_records');
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
                    <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">Dispatch List</h1>

                    <div className="flex items-center gap-2">
                        <div className="relative w-[210px]">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full h-[34px] pl-8 pr-3 border border-gray-300 rounded-md bg-white text-[13px] outline-none focus:border-gray-400 transition-all text-gray-600 font-sans"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
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
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">ID</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Submitted By</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Shipment Date</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Tracking #</th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">Products (Total Qty)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {filteredDispatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-gray-500">
                                            No dispatch records found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDispatches.map((d) => {
                                        const totalQty = d.dispatch_items?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0;
                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-2.5 text-[13px] text-gray-800 border-r border-gray-100 font-medium">
                                                    #{String(d.id).padStart(4, '0')}
                                                </td>
                                                <td className="px-5 py-2.5 text-[13px] text-gray-800 border-r border-gray-100 font-medium">
                                                    {d.submitted_by}
                                                </td>
                                                <td className="px-5 py-2.5 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {d.shipment_date ? new Date(d.shipment_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : '—'}
                                                </td>
                                                <td className="px-5 py-2.5 text-[13px] text-gray-700 border-r border-gray-100">
                                                    <span className="font-medium">{d.tracking_number || '—'}</span>
                                                </td>
                                                <td className="px-5 py-2.5">
                                                    <div className="max-w-xs">
                                                        <div className="text-[13px] font-semibold text-gray-800 mb-0.5">
                                                            {d.dispatch_items?.length || 0} items ({totalQty} units)
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 truncate">
                                                            {d.dispatch_items?.map((i: any) => `${i.product_name} x${i.quantity}`).join(', ')}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PAGINATION */}
                <div className="flex items-center justify-between mt-10">
                    <div className="text-[14px] text-gray-500 font-medium">
                        Showing <span className="text-gray-800">{filteredDispatches.length}</span> of <span className="text-gray-800">{dispatches.length}</span> dispatch records
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
