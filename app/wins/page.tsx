"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ReportAWinPage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [returnedOrders, setReturnedOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [orderProducts, setOrderProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const router = useRouter();

    const [formData, setFormData] = useState({
        order_id: '',
        customer_name: '',
        customer_contact_email: '',
        crm_account_number: '',
        sales_executive: '',
        num_units: '',
        total_revenue: '',
        purchase_type: 'One-time',
        date_of_purchase: '',
        current_manufacturer: '',
        feedback: '',
        selected_product_id: '', // Added for selection
        other_sku: '' // Added for custom SKU
    });

    useEffect(() => {
        const fetchAuthAndData = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                router.push('/login');
                return;
            }
            setUser(user);

            // Fetch profile for auto-fill
            const profileRes = await fetch('/api/auth/me');
            const profileData = await profileRes.json();
            if (!profileData.error) {
                setProfile(profileData);
                setFormData(prev => ({
                    ...prev,
                    sales_executive: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
                }));
            }

            // Fetch returned orders
            const ordersRes = await fetch(`/api/orders/returned?email=${user.email}`);
            const ordersData = await ordersRes.json();
            if (Array.isArray(ordersData)) {
                setReturnedOrders(ordersData);
            }
        };

        fetchAuthAndData();
    }, [router]);

    const handleOrderChange = async (orderId: string) => {
        setFormData(prev => ({ ...prev, order_id: orderId, selected_product_id: '', other_sku: '' }));
        if (!orderId) {
            setSelectedOrder(null);
            setOrderProducts([]);
            return;
        }

        const order = returnedOrders.find(o => String(o.id) === orderId);
        if (order) {
            setSelectedOrder(order);
            // Pre-fill some fields from order
            setFormData(prev => ({
                ...prev,
                customer_name: order.customer_company_name || '',
                customer_contact_email: order.customer_contact_email || '',
                crm_account_number: order.crm_account_number || '',
            }));

            // Fetch order products
            setIsLoading(true);
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                const data = await res.json();
                if (data.items) {
                    setOrderProducts(data.items);
                }
            } catch (err) {
                console.error('Failed to fetch order products:', err);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.selected_product_id) {
            setMessage({ type: 'error', text: 'Please select a device or "Other".' });
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            // If "other" is selected, we might not have a numeric product_id
            // The API expects product_ids as integer[]. We'll handle this.
            // If it's a specific product, we send its ID in the array.
            // If it's "other", we might send an empty array or 0, and put the SKU in feedback or a new column.
            // For now, let's keep it simple and send the selected product ID if it's not "other".

            const productIds = formData.selected_product_id === 'other' ? [] : [formData.selected_product_id];

            // Determine the SKU and OEM to save
            let finalSku = '';
            let finalOem = '';
            let finalProductName = '';
            if (formData.selected_product_id === 'other') {
                finalSku = formData.other_sku;
                finalOem = 'Other';
                finalProductName = 'Custom Device / Other';
            } else {
                const selectedItem = orderProducts.find(i => String(i.product_id) === formData.selected_product_id);
                finalSku = selectedItem?.product?.product_sku || '';
                finalOem = selectedItem?.product?.oem || '';
                finalProductName = selectedItem?.product?.product_name || '';
            }

            const res = await fetch('/api/wins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    product_ids: productIds,
                    sku: finalSku, // Send specifically to the sku field
                    oem: finalOem, // Send specifically to the oem field
                    product_name: finalProductName, // Send product name for the email
                    user_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
                    user_email: user?.email,
                    num_units: parseInt(formData.num_units) || 0,
                    total_revenue: parseFloat(formData.total_revenue) || 0
                })
            });

            const result = await res.json();
            if (result.success) {
                setMessage({ type: 'success', text: 'Win reported successfully!' });
                setFormData({
                    order_id: '',
                    customer_name: '',
                    customer_contact_email: '',
                    crm_account_number: '',
                    sales_executive: '',
                    num_units: '',
                    total_revenue: '',
                    purchase_type: 'One-time',
                    date_of_purchase: '',
                    current_manufacturer: '',
                    feedback: '',
                    selected_product_id: '',
                    other_sku: ''
                });
                setOrderProducts([]);
                setSelectedOrder(null);
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to report win.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
            <div className="max-w-5xl mx-auto py-5">
                <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
                    {/* GREY HEADER BANNER */}
                    <div className="bg-[#E5E7EB] py-4 flex items-center justify-center border-b border-gray-300">
                        <h1 className="text-3xl font-semibold text-[#112F45] tracking-tight">Wins</h1>
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
                        {/* FIRST ROW: Order and Devices */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    SHI UC HUB Order # <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <select
                                        required
                                        className="w-full h-9 px-4 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 appearance-none cursor-pointer text-sm"
                                        value={formData.order_id}
                                        onChange={(e) => handleOrderChange(e.target.value)}
                                    >
                                        <option value="">Select Your Order #</option>
                                        {returnedOrders.map(order => (
                                            <option key={order.id} value={order.id}>
                                                {/* {String(order.id).padStart(4, '0')} */}
                                                {order.id}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    Devices <span className="text-red-500">*</span>
                                </label>
                                <div className="min-h-[40px] px-3 py-3 rounded-md border border-gray-300 bg-white flex flex-col justify-center">
                                    {isLoading ? (
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                            <span className="text-xs italic">Loading devices...</span>
                                        </div>
                                    ) : orderProducts.length > 0 ? (
                                        <div className="space-y-2.5">
                                            {orderProducts.map((item, idx) => (
                                                <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                                                    <input
                                                        type="radio"
                                                        name="device_selection"
                                                        className="w-3.5 h-3.5 border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        value={item.product_id}
                                                        checked={formData.selected_product_id === String(item.product_id)}
                                                        onChange={(e) => setFormData({ ...formData, selected_product_id: e.target.value, other_sku: '' })}
                                                    />
                                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                                                        {item.product?.product_name} (#{item.product?.product_sku})
                                                    </span>
                                                </label>
                                            ))}
                                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="device_selection"
                                                    className="w-3.5 h-3.5 border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    value="other"
                                                    checked={formData.selected_product_id === 'other'}
                                                    onChange={(e) => setFormData({ ...formData, selected_product_id: e.target.value })}
                                                />
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Other</span>
                                            </label>

                                            {formData.selected_product_id === 'other' && (
                                                <div className="mt-2 text-gray-500 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Other SKU #"
                                                        required
                                                        className="w-full h-9 px-4 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
                                                        value={formData.other_sku}
                                                        onChange={(e) => setFormData({ ...formData, other_sku: e.target.value })}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[13px] text-gray-400 italic">Please select an order first</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SECOND ROW: User Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">User Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    readOnly
                                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-gray-100 text-gray-500 font-medium cursor-not-allowed outline-none text-sm"
                                    value={profile ? `${profile.first_name} ${profile.last_name}` : 'Loading...'}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">User Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    readOnly
                                    className="w-full h-9 px-3 rounded-md border border-gray-200 bg-gray-100 text-gray-500 font-medium cursor-not-allowed outline-none text-sm"
                                    value={user?.email || 'Loading...'}
                                />
                            </div>
                        </div>

                        {/* THIRD ROW: Customer Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Customer Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    value={formData.customer_name}
                                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Customer Contact Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    required
                                    className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    value={formData.customer_contact_email}
                                    onChange={(e) => setFormData({ ...formData, customer_contact_email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* FOURTH ROW: CRM and Sales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">CRM Account # <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    value={formData.crm_account_number}
                                    onChange={(e) => setFormData({ ...formData, crm_account_number: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Sales Executive <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    value={formData.sales_executive}
                                    onChange={(e) => setFormData({ ...formData, sales_executive: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* FIFTH ROW: Units and Revenue */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Number of Units <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    required
                                    className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    value={formData.num_units}
                                    onChange={(e) => setFormData({ ...formData, num_units: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Total Deal Revenue ($) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    value={formData.total_revenue}
                                    onChange={(e) => setFormData({ ...formData, total_revenue: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* SIXTH ROW: Purchase Type and Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Is this a one time purchase or roll-out? <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        required
                                        className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 appearance-none cursor-pointer text-sm"
                                        value={formData.purchase_type}
                                        onChange={(e) => setFormData({ ...formData, purchase_type: e.target.value })}
                                    >
                                        <option value="One-time">One-time Purchase</option>
                                        <option value="Roll-out">Roll-out</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Date of Purchase <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    required
                                    className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    value={formData.date_of_purchase}
                                    onChange={(e) => setFormData({ ...formData, date_of_purchase: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* SEVENTH ROW: Competition */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Current Manufacturer / Competition <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-gray-800 text-sm"
                                    value={formData.current_manufacturer}
                                    onChange={(e) => setFormData({ ...formData, current_manufacturer: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* EIGHTH ROW: Feedback */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Feedback from the customer on the demo <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                rows={6}
                                className="w-full p-4 rounded-md border border-gray-300 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none text-gray-800 text-sm leading-relaxed"
                                value={formData.feedback}
                                onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                            />
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="pt-4 flex justify-center">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-[170px] h-[45px] bg-[#76E6D1] hover:bg-[#5ccdc0] text-[#333333] text-sm font-medium font-inter tracking-wider rounded-[2px] transition-all disabled:opacity-50 flex items-center justify-center"
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
