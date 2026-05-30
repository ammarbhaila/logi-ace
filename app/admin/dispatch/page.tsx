/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TrashIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

interface ProductItem {
    id: string;
    product_name: string;
    sku: string;
    quantity: string;
}

export default function DispatchPage() {
    const router = useRouter();
    const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
    const [submittedBy, setSubmittedBy] = useState("");

    // Shipment details
    const [trackingNumber, setTrackingNumber] = useState("");
    const [shipmentDate, setShipmentDate] = useState("");
    const [additionalDetails, setAdditionalDetails] = useState("");

    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

    // Products list
    const [products, setProducts] = useState<ProductItem[]>([
        { id: generateId(), product_name: "", sku: "", quantity: "" },
    ]);

    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    /* ── Auth check ── */
    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((data) => {
                if (data.error) { router.push("/login"); return; }
                const role = data.userrole as string;
                // Subscribers cannot access this page
                if (role === "Subscriber") { router.push("/"); return; }
                setCurrentUserRole(role);
                setSubmittedBy(data.email || "");
            });
    }, [router]);

    /* ── Product helpers ── */
    const addProduct = () =>
        setProducts((prev) => [
            ...prev,
            { id: generateId(), product_name: "", sku: "", quantity: "" },
        ]);

    const removeProduct = (id: string) =>
        setProducts((prev) => prev.filter((p) => p.id !== id));

    const updateProduct = (id: string, field: keyof ProductItem, value: string) =>
        setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
        );

    /* ── Submit ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validate products
        for (const p of products) {
            if (!p.product_name.trim() || !p.sku.trim() || !p.quantity.trim()) {
                setMessage({ type: 'error', text: "Please fill in all product fields (Name, SKU, Quantity)." });
                return;
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/dispatch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    submitted_by: submittedBy,
                    tracking_number: trackingNumber,
                    shipment_date: shipmentDate,
                    additional_details: additionalDetails,
                    products: products.map((p) => ({
                        product_name: p.product_name,
                        sku: p.sku,
                        quantity: parseInt(p.quantity, 10),
                    })),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Submission failed.");

            setMessage({ type: 'success', text: "Dispatch submitted successfully! Email notification sent." });
            // Reset form
            setTrackingNumber("");
            setShipmentDate("");
            setAdditionalDetails("");
            setProducts([{ id: generateId(), product_name: "", sku: "", quantity: "" }]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSubmitting(false);
        }
    };

    if (!currentUserRole) return null;

    /* ── Render ── */
    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
            <div className="max-w-5xl mx-auto py-5">
                <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
                    {/* GREY HEADER BANNER */}
                    <div className="bg-[#E5E7EB] py-4 flex items-center justify-center border-b border-gray-300">
                        <h1 className="text-3xl font-semibold text-[#112F45] tracking-tight">Dispatched Devices</h1>
                    </div>

                    {message && (
                        <div className={`mx-10 mt-8 p-4 rounded-xl border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'} shadow-sm animate-in fade-in slide-in-from-top-4 duration-300`}>
                            <div className="flex items-center gap-3">
                                {message.type === 'success' ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                )}
                                <p className="font-bold">{message.text}</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="px-12 py-12 space-y-8">
                        {/* Shipment Details Section */}
                        <div className="space-y-6">
                            <h2 className="text-xl font-medium text-[#112F45] border-b pb-2">Shipment details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Submitted by <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full h-8 px-3 rounded-md border border-gray-200 bg-gray-100 text-gray-500 font-medium cursor-not-allowed outline-none text-sm"
                                        value={submittedBy}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Tracking #</label>
                                    <input
                                        type="text"
                                        className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Date of Shipment</label>
                                    <input
                                        type="date"
                                        className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        value={shipmentDate}
                                        onChange={(e) => setShipmentDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Additional details</label>
                                    <input
                                        type="text"
                                        className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                        value={additionalDetails}
                                        onChange={(e) => setAdditionalDetails(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Product Details Section */}
                        <div className="space-y-6 pt-4">
                            <h2 className="text-xl font-medium text-[#112F45] border-b pb-2">Product details</h2>
                            {products.map((product, idx) => (
                                <div key={product.id} className="p-6 bg-gray-50 rounded-lg border border-gray-200 space-y-6 relative group">
                                    {products.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeProduct(product.id)}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Product Name <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                                value={product.product_name}
                                                onChange={(e) => updateProduct(product.id, "product_name", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Device SKU # <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                                value={product.sku}
                                                onChange={(e) => updateProduct(product.id, "sku", e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Device Quantity <span className="text-red-500">*</span></label>
                                            <input
                                                type="number"
                                                required
                                                min={1}
                                                className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                                value={product.quantity}
                                                onChange={(e) => updateProduct(product.id, "quantity", e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {idx === products.length - 1 && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={addProduct}
                                                className="flex items-center gap-1.5 text-gray-600 font-bold text-sm transition-colors"
                                            >
                                                <PlusCircleIcon className="h-5 w-5" />
                                                Add Another Device
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Delivery Address */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm max-w-sm mt-8">
                            <h3 className="text-sm font-bold text-[#112F45] mb-3 uppercase tracking-wider">Send devices to:</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                                <p className="font-bold text-[#112F45]">Works360 LABS (SHI UC HUB)</p>
                                <p>15345 Anacapa Rd Unit A</p>
                                <p>Victorville, CA 92392</p>
                                <p>(442) 255-4006</p>
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="pt-8 flex justify-center border-t">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-[170px] h-[45px] bg-[#c65d2f] hover:bg-[#A84520] text-white text-sm font-medium font-inter tracking-wider rounded-[2px] transition-all disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    'Submit'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
