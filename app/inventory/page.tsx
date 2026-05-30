"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  useEffect(() => {
    fetch("/api/inventory/list")
      .then(res => res.json())
      .then(setItems);
  }, []);

  /* ---------------- SEARCH & SORTING ---------------- */
  const filteredItems = useMemo(() => {
    let result = [...items];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.product_name?.toLowerCase().includes(q) ||
        i.product_sku?.toLowerCase().includes(q) ||
        i.oem?.toLowerCase().includes(q)
      );
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] || "";
        const bVal = b[sortConfig.key] || "";
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.dir === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.dir === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    return result;
  }, [items, searchTerm, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  };

  /* ---------------- ACTIONS ---------------- */
  const deleteItem = async (id: string) => {
    if (!confirm("This action cannot be undone. Delete this product?")) return;

    await fetch("/api/inventory/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setItems(prev => prev.filter(i => i.id !== id));
  };

  const togglePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "published" ? "private" : "published";

    const res = await fetch("/api/inventory/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        post_status: newStatus,
      }),
    });

    if (!res.ok) {
      alert("Failed to update status");
      return;
    }

    setItems((prev) =>
      prev.map((item) => item.id === id ? { ...item, post_status: newStatus } : item)
    );
  };

  const handleExport = () => {
    const csvContent = [
      ["Product Name", "SKU", "OEM", "Stock", "Status"].join(","),
      ...filteredItems.map(i =>
        [`"${i.product_name.replace(/"/g, '""')}"`, i.product_sku || "—", i.oem || "—", i.stock_quantity, i.post_status].join(",")
      )
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white py-12 px-6 lg:px-12 font-sans">
      <div className="max-w-[1400px] mx-auto">
        {/* HEADER & ACTIONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-[280px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="w-full h-[42px] pl-10 pr-4 border border-gray-300 rounded-lg bg-white text-[15px] outline-none focus:border-gray-400 transition-all text-gray-600 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 w-[130px] h-[39px] px-4 border border-gray-300 rounded-lg bg-[#f0f0f0]/50 text-[12px] font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>

            <a
              href="/inventory/create"
              className="flex items-center justify-center gap-2 px-5 h-[39px] bg-[#112F45] text-white text-[12px] font-medium rounded-lg hover:bg-[#1a4a6b] transition-all shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </a>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f2f2f2] border-b border-gray-200">
                <tr>
                  <th className="px-5 py-2 font-medium text-gray-800 text-[14px] w-[40%]">
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => handleSort('product_name')}>
                      Product Details
                      <span className={`${sortConfig?.key === 'product_name' ? 'text-blue-600' : 'text-gray-400'} flex flex-col -gap-1 text-[8px]`}>
                        <span className={sortConfig?.key === 'product_name' && sortConfig.dir === 'asc' ? 'opacity-100' : 'opacity-40'}>▲</span>
                        <span className={`-mt-1 ${sortConfig?.key === 'product_name' && sortConfig.dir === 'desc' ? 'opacity-100' : 'opacity-40'}`}>▼</span>
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => handleSort('product_sku')}>
                      SKU
                      <span className={`${sortConfig?.key === 'product_sku' ? 'text-blue-600' : 'text-gray-400'} flex flex-col -gap-1 text-[8px]`}>
                        <span className={sortConfig?.key === 'product_sku' && sortConfig.dir === 'asc' ? 'opacity-100' : 'opacity-40'}>▲</span>
                        <span className={`-mt-1 ${sortConfig?.key === 'product_sku' && sortConfig.dir === 'desc' ? 'opacity-100' : 'opacity-40'}`}>▼</span>
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => handleSort('stock_quantity')}>
                      Stock
                      <span className={`${sortConfig?.key === 'stock_quantity' ? 'text-blue-600' : 'text-gray-400'} flex flex-col -gap-1 text-[8px]`}>
                        <span className={sortConfig?.key === 'stock_quantity' && sortConfig.dir === 'asc' ? 'opacity-100' : 'opacity-40'}>▲</span>
                        <span className={`-mt-1 ${sortConfig?.key === 'stock_quantity' && sortConfig.dir === 'desc' ? 'opacity-100' : 'opacity-40'}`}>▼</span>
                      </span>
                    </div>
                  </th>
                  <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">Status</th>
                  <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-24 text-center">
                      <p className="text-gray-500 text-[15px] italic font-medium">No results found matching your requirements</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 border-r border-gray-100">
                        <div className="flex items-center gap-4">
                          {item.main_image_url ? (
                            <img src={item.main_image_url} alt="" className="w-10 h-10 object-contain bg-white border border-gray-100 rounded-md p-1 flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-md flex-shrink-0 flex items-center justify-center text-gray-300">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          )}
                          <div>
                            <Link href={`/create-demo-kits/${item.id}`} className="text-[13px] font-medium text-gray-900 block leading-tight hover:text-blue-600 transition-colors">
                              {item.product_name}
                            </Link>
                            <span className="text-[10px] font-medium text-gray-400 uppercase mt-1 block">{item.oem || item.manufacturer || 'General'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-gray-600 font-medium border-r border-gray-100">{item.product_sku || "—"}</td>
                      <td className="px-5 py-3 text-[13px] font-medium text-gray-800 border-r border-gray-100">
                        {item.bundle_type === "Multiproduct" ? <span className="text-gray-300">—</span> : item.stock_quantity}
                      </td>
                      <td className="px-5 py-3 border-r border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className={`${item.post_status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full`}>
                            {item.post_status}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {/* Toggle status */}
                          <button
                            onClick={() => togglePublish(item.id, item.post_status)}
                            className="w-[28px] h-[28px] flex items-center justify-center rounded-full bg-[#E6E8EB] text-gray-700 hover:bg-gray-300 transition-colors"
                            title={item.post_status === "published" ? "Private" : "Publish"}
                          >
                            {item.post_status === "published" ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.04M10.333 4.826A9.953 9.953 0 0112 4c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l3.59 3.59m0 0A9.956 9.956 0 0112 12a9.956 9.956 0 01-3.59-3.59z" /></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            )}
                          </button>

                          {/* Edit */}
                          <a
                            href={`/inventory/edit/${item.id}`}
                            className="w-[28px] h-[28px] flex items-center justify-center rounded-full bg-[#E6E8EB] text-gray-700 hover:bg-gray-300 transition-colors"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </a>

                          {/* Delete */}
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="w-[28px] h-[28px] flex items-center justify-center rounded-full border border-red-500 text-red-500 bg-white hover:bg-red-500 hover:text-white transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        <div className="flex items-center justify-end gap-1 mt-10">
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
  );
}
