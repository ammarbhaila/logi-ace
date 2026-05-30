"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { TrashIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

interface EOLItem {
    product_name: string;
    sku: string;
    quantity: string;
    address: string;
    additional_note: string;
}

export default function EOLPage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const [items, setItems] = useState<EOLItem[]>([{
        product_name: '',
        sku: '',
        quantity: '',
        address: '',
        additional_note: ''
    }]);

    useEffect(() => {
        const fetchAuthAndData = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                router.push('/login');
                return;
            }
            setUser(user);

            // Fetch profile for role check and auto-fill
            const profileRes = await fetch('/api/auth/me');
            const profileData = await profileRes.json();

            if (profileData.error || profileData.userrole !== 'Admin') {
                router.push('/');
            } else {
                setProfile(profileData);
            }

            // Fetch products for dropdown
            const productsRes = await fetch('/api/inventory/list');
            const productsData = await productsRes.json();
            if (Array.isArray(productsData)) {
                setProducts(productsData);
            }
        };

        fetchAuthAndData();
    }, [router]);

    const addItem = () => {
        if (items.length < 10) {
            setItems([...items, {
                product_name: '',
                sku: '',
                quantity: '',
                address: '',
                additional_note: ''
            }]);
        }
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
        }
    };

    const handleItemChange = (index: number, field: keyof EOLItem, value: string) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // If product name changes, auto-fill SKU and available quantity (if we want to show it)
        if (field === 'product_name') {
            const selectedProduct = products.find(p => p.product_name === value);
            if (selectedProduct) {
                newItems[index].sku = selectedProduct.product_sku || '';
                newItems[index].quantity = selectedProduct.stock_quantity || '';
                // The user said "fetch sku or quantity from database"
                // We can pre-fill quantity if they want, but usually EOL is for things they HAVE.
                // However, I'll put the stock quantity as a placeholder or just leave it blank for them to enter.
                // Let's leave it blank but maybe show it in a badge later.
            }
        }

        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        for (const item of items) {
            if (!item.product_name || !item.sku || !item.quantity || !item.address) {
                setMessage({ type: 'error', text: 'Please fill in all required fields for each device.' });
                return;
            }
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            const res = await fetch('/api/eol', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    submitted_by: user.email,
                    items
                })
            });

            const result = await res.json();
            if (result.success) {
                setMessage({ type: 'success', text: 'EOL request submitted successfully!' });
                setItems([{
                    product_name: '',
                    sku: '',
                    quantity: '',
                    address: '',
                    additional_note: ''
                }]);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to submit request.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
            <div className="max-w-5xl mx-auto py-5">
                <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
                    {/* GREY HEADER BANNER */}
                    <div className="bg-[#E5E7EB] py-4 flex items-center justify-center border-b border-gray-300">
                        <h1 className="text-3xl font-semibold text-[#112F45] tracking-tight">EOL Devices</h1>
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

                        {/* Submitter Info Section */}
                        <div className="space-y-6">

                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Submitted by <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full md:w-80 h-8 px-3 rounded-md border border-gray-200 bg-gray-100 text-gray-500 font-medium outline-none text-sm cursor-not-allowed"
                                    value={user?.email || 'Loading...'}
                                />
                            </div>
                        </div>

                        {/* Product Details Section */}
                        <div className="space-y-6 pt-4">
                            <h2 className="text-xl font-medium text-[#112F45] border-b pb-2">Device details</h2>
                            {items.map((item, index) => (
                                <div key={index} className="p-6 bg-gray-50 rounded-lg border border-gray-200 space-y-6 relative group">
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove Item"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Product Name <span className="text-red-500">*</span></label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none text-gray-800 text-sm"
                                                    value={item.product_name}
                                                    onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                                                >
                                                    <option value="">Select a Product</option>
                                                    {products.map((p, idx) => (
                                                        <option key={idx} value={p.product_name}>{p.product_name}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Device SKU # <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                readOnly
                                                className="w-full h-8 px-3 rounded-md border border-gray-200 bg-gray-100 text-gray-500 outline-none text-sm cursor-not-allowed"
                                                value={item.sku}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Device Quantity <span className="text-red-500">*</span></label>
                                            <input
                                                type="number"
                                                readOnly
                                                min="1"
                                                className="w-full h-8 px-3 rounded-md border border-gray-200 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                                value={item.quantity}
                                            />
                                        </div>

                                        <div className="md:col-span-1 space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Shipping Address <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Enter shipping address"
                                                className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                                value={item.address}
                                                onChange={(e) => handleItemChange(index, 'address', e.target.value)}
                                            />
                                        </div>

                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-sm font-medium text-gray-700">Additional Note</label>
                                            <input
                                                type="text"
                                                placeholder="Optional notes"
                                                className="w-full h-8 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                                value={item.additional_note}
                                                onChange={(e) => handleItemChange(index, 'additional_note', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    {index === items.length - 1 && index < 9 && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={addItem}
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

                        {/* SUBMIT BUTTON */}
                        <div className="pt-8 flex justify-center border-t border-gray-100">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-[170px] h-[45px] bg-[#c65d2f] hover:bg-[#A84520] text-white text-sm font-medium font-inter tracking-wider rounded-[2px] transition-all disabled:opacity-50 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {isSubmitting ? (
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
