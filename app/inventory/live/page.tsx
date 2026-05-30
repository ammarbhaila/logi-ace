"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface LiveProduct {
    id: string;
    product_sku: string;
    product_name: string;
    stock_quantity: number;
    customer_with: number;
    total_inventory: number;
    oem: string;
}

export default function LiveInventoryPage() {
    const [products, setProducts] = useState<LiveProduct[]>([]);
    const [filtered, setFiltered] = useState<LiveProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [search, setSearch] = useState("");
    const [oemFilter, setOemFilter] = useState("All");
    const [sortConfig, setSortConfig] = useState<{ key: keyof LiveProduct; dir: "asc" | "desc" } | null>(null);

    const [visibleColumns, setVisibleColumns] = useState({
        sku: true,
        productName: true,
        oem: true,
        stockQuantity: true,
        withCustomer: true,
        totalInventory: true,
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

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/inventory/live");
            const data = await res.json();
            if (Array.isArray(data)) {
                setProducts(data);
                setLastRefreshed(new Date());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        // Auto-refresh every 30 seconds
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);

    // Filtering & sorting
    useEffect(() => {
        let result = [...products];

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                p.product_name?.toLowerCase().includes(q) ||
                p.product_sku?.toLowerCase().includes(q) ||
                p.oem?.toLowerCase().includes(q)
            );
        }

        if (oemFilter !== "All") {
            result = result.filter(p => p.oem === oemFilter);
        }

        if (sortConfig) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];
                if (typeof aVal === "number" && typeof bVal === "number") {
                    return sortConfig.dir === "asc" ? aVal - bVal : bVal - aVal;
                }
                return sortConfig.dir === "asc"
                    ? String(aVal).localeCompare(String(bVal))
                    : String(bVal).localeCompare(String(aVal));
            });
        }

        setFiltered(result);
    }, [products, search, oemFilter, sortConfig]);

    const oemOptions = ["All", ...Array.from(new Set(products.map(p => p.oem).filter(Boolean)))];

    const handleSort = (key: keyof LiveProduct) => {
        setSortConfig(prev =>
            prev?.key === key
                ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
                : { key, dir: "asc" }
        );
    };

    const handleExport = () => {
        const csvContent = [
            ["SKU", "Product Name", "OEM", "Stock Qty", "With Customer", "Total Inventory"].join(","),
            ...filtered.map(i =>
                [
                    i.product_sku || "—",
                    `"${(i.product_name || "").replace(/"/g, '""')}"`,
                    i.oem || "—",
                    i.stock_quantity || 0,
                    i.customer_with || 0,
                    i.total_inventory || 0
                ].join(",")
            )
        ].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `live_inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-white py-12 px-6 lg:px-12 font-sans">
            <div className="max-w-[1400px] mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 relative" ref={columnMenuRef}>
                            <button
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-300 rounded-md bg-[#f0f0f0]/50 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors h-[34px]"
                            >
                                Columns
                                <svg className={`w-3 h-3 text-gray-500 transition-transform ${showColumnMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showColumnMenu && (
                                <div className="absolute top-12 left-0 w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                                    <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Toggle Columns</div>
                                    <div className="max-h-64 overflow-y-auto space-y-1">
                                        {[
                                            { key: 'sku', label: 'SKU' },
                                            { key: 'productName', label: 'Product Name' },
                                            { key: 'oem', label: 'OEM' },
                                            { key: 'stockQuantity', label: 'Stock Qty' },
                                            { key: 'withCustomer', label: 'With Customer' },
                                            { key: 'totalInventory', label: 'Total Inventory' },
                                        ].map((col) => (
                                            <label key={col.key} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-[#1e3a8a] rounded border-gray-300 focus:ring-[#1e3a8a]"
                                                    checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                                                    onChange={(e) => setVisibleColumns({ ...visibleColumns, [col.key]: e.target.checked })}
                                                />
                                                <span className="text-[14px] text-gray-700 font-medium whitespace-nowrap">{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Live pulse indicator & Last Updated */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-2.5 h-[34px]">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                </span>
                                <span className="text-[13px] font-medium text-[#112F45]">Live Inventory</span>
                                {lastRefreshed && (
                                    <span className="text-[11px] text-gray-400 font-medium ml-0.5">
                                        {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* OEM Select */}
                        <div className="relative">
                            <select
                                className="h-[34px] pl-2.5 pr-7 border border-gray-300 rounded-md bg-white text-[13px] outline-none focus:border-gray-400 transition-all text-gray-700 appearance-none cursor-pointer min-w-[110px]"
                                value={oemFilter}
                                onChange={e => setOemFilter(e.target.value)}
                            >
                                {oemOptions.map(o => (
                                    <option key={o} value={o}>{o === "All" ? "All OEMs" : o}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-[210px]">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search SKU, Name..."
                                className="w-full h-[34px] pl-8 pr-3 border border-gray-300 rounded-md bg-white text-[13px] outline-none focus:border-gray-400 transition-all text-gray-600"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Export CSV Button */}
                        <button
                            onClick={handleExport}
                            className="flex items-center justify-center gap-2 h-[34px] px-3 border border-gray-300 rounded-md bg-[#f0f0f0]/50 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
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
                                    {visibleColumns.sku && (
                                        <th onClick={() => handleSort("product_sku")} className="px-5 py-1.5 font-medium text-gray-800 text-[14px] cursor-pointer hover:bg-gray-200/50 transition-colors">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                SKU
                                                <span className={`flex flex-col -gap-1 text-[8px] ${sortConfig?.key === "product_sku" ? "text-[#1e40af]" : "text-gray-400"}`}>
                                                    <span className={sortConfig?.key === "product_sku" && sortConfig.dir === "asc" ? "text-[#1e40af]" : ""}>▲</span>
                                                    <span className={`-mt-1 ${sortConfig?.key === "product_sku" && sortConfig.dir === "desc" ? "text-[#1e40af]" : ""}`}>▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.productName && (
                                        <th onClick={() => handleSort("product_name")} className="px-5 py-1.5 font-medium text-gray-800 text-[14px] cursor-pointer hover:bg-gray-200/50 transition-colors">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Product Name
                                                <span className={`flex flex-col -gap-1 text-[8px] ${sortConfig?.key === "product_name" ? "text-[#1e40af]" : "text-gray-400"}`}>
                                                    <span className={sortConfig?.key === "product_name" && sortConfig.dir === "asc" ? "text-[#1e40af]" : ""}>▲</span>
                                                    <span className={`-mt-1 ${sortConfig?.key === "product_name" && sortConfig.dir === "desc" ? "text-[#1e40af]" : ""}`}>▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.oem && (
                                        <th onClick={() => handleSort("oem")} className="px-5 py-1.5 font-medium text-gray-800 text-[14px] cursor-pointer hover:bg-gray-200/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                OEM
                                                <span className={`flex flex-col -gap-1 text-[8px] ${sortConfig?.key === "oem" ? "text-[#1e40af]" : "text-gray-400"}`}>
                                                    <span className={sortConfig?.key === "oem" && sortConfig.dir === "asc" ? "text-[#1e40af]" : ""}>▲</span>
                                                    <span className={`-mt-1 ${sortConfig?.key === "oem" && sortConfig.dir === "desc" ? "text-[#1e40af]" : ""}`}>▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.stockQuantity && (
                                        <th onClick={() => handleSort("stock_quantity")} className="px-5 py-1.5 font-medium text-gray-800 text-[14px] cursor-pointer hover:bg-gray-200/50 transition-colors">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Stock Qty
                                                <span className={`flex flex-col -gap-1 text-[8px] ${sortConfig?.key === "stock_quantity" ? "text-[#1e40af]" : "text-gray-400"}`}>
                                                    <span className={sortConfig?.key === "stock_quantity" && sortConfig.dir === "asc" ? "text-[#1e40af]" : ""}>▲</span>
                                                    <span className={`-mt-1 ${sortConfig?.key === "stock_quantity" && sortConfig.dir === "desc" ? "text-[#1e40af]" : ""}`}>▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.withCustomer && (
                                        <th onClick={() => handleSort("customer_with")} className="px-5 py- 2 font-medium text-gray-800 text-[14px] cursor-pointer hover:bg-gray-200/50 transition-colors">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                With Customer
                                                <span className={`flex flex-col -gap-1 text-[8px] ${sortConfig?.key === "customer_with" ? "text-[#1e40af]" : "text-gray-400"}`}>
                                                    <span className={sortConfig?.key === "customer_with" && sortConfig.dir === "asc" ? "text-[#1e40af]" : ""}>▲</span>
                                                    <span className={`-mt-1 ${sortConfig?.key === "customer_with" && sortConfig.dir === "desc" ? "text-[#1e40af]" : ""}`}>▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.totalInventory && (
                                        <th onClick={() => handleSort("total_inventory")} className="px-5 py-1.5 font-medium text-gray-800 text-[14px] cursor-pointer hover:bg-gray-200/50 transition-colors">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Total Inventory
                                                <span className={`flex flex-col -gap-1 text-[8px] ${sortConfig?.key === "total_inventory" ? "text-[#1e40af]" : "text-gray-400"}`}>
                                                    <span className={sortConfig?.key === "total_inventory" && sortConfig.dir === "asc" ? "text-[#1e40af]" : ""}>▲</span>
                                                    <span className={`-mt-1 ${sortConfig?.key === "total_inventory" && sortConfig.dir === "desc" ? "text-[#1e40af]" : ""}`}>▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading && products.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-gray-200 border-t-[#1e40af] rounded-full animate-spin" />
                                                <span className="text-[16px] text-gray-500">Loading live inventory...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center">
                                            <p className="text-gray-500 text-[16px]">No products match your search.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            {visibleColumns.sku && (
                                                <td className="px-5 py-2 text-[13px] font-medium text-gray-800 border-r border-gray-100">
                                                    {product.product_sku || "—"}
                                                </td>
                                            )}
                                            {visibleColumns.productName && (
                                                <td className="px-5 py-2 text-[13px] font-medium text-gray-800 border-r border-gray-100">
                                                    {product.product_name}
                                                </td>
                                            )}
                                            {visibleColumns.oem && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {product.oem || "—"}
                                                </td>
                                            )}
                                            {visibleColumns.stockQuantity && (
                                                <td className="px-5 py-2 text-[13px] text-gray-800 font-medium border-r border-gray-100 text-center sm:text-left">
                                                    {product.stock_quantity}
                                                </td>
                                            )}
                                            {visibleColumns.withCustomer && (
                                                <td className="px-5 py-2 text-[13px] text-gray-800 font-medium border-r border-gray-100 text-center sm:text-left">
                                                    {product.customer_with}
                                                </td>
                                            )}
                                            {visibleColumns.totalInventory && (
                                                <td className="px-5 py-2 text-[13px] text-gray-900 font-semibold text-center sm:text-left">
                                                    {product.total_inventory}
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PAGINATION (Placeholder to match style) */}
                <div className="flex items-center justify-between mt-7">
                    <div className="text-[13px] text-gray-500 font-medium">
                        Showing <span className="text-gray-800">{filtered.length}</span> of <span className="text-gray-800">{products.length}</span> products
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="px-4 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
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
