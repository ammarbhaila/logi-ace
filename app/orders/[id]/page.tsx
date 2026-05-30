"use client";

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function OrderDetailsPage() {
    const { id } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [navigating, setNavigating] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [orderLogs, setOrderLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchSessionAndData = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                router.push('/login');
                return;
            }
            setUser(user);

            try {
                const profileRes = await fetch("/api/auth/me");
                const profileData = await profileRes.json();

                if (profileData.error) {
                    console.error('[DEBUG] OrderDetailsPage API error:', profileData.error);
                    // Fallback to client-side (though likely restricted)
                    const { data: profile } = await supabase
                        .from('profile')
                        .select('userrole')
                        .or(`id.eq.${user.id},userId.eq.${user.id}`)
                        .single();
                    setUserRole(profile?.userrole || null);
                } else {
                    setUserRole(profileData.userrole || null);
                }
            } catch (profileErr) {
                console.error('[DEBUG] OrderDetailsPage profiles fetch catch:', profileErr);
            }

            try {
                const res = await fetch(`/api/orders/${id}`);
                const data = await res.json();
                if (data.error) {
                    setError(data.error);
                } else {
                    setOrder(data);
                }
            } catch (err) {
                console.error('Failed to fetch order details:', err);
                setError('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };

        fetchSessionAndData();
    }, [id, router]);

    const manufacturers = useMemo(() => {
        if (!order || !order.items) return new Set();
        return new Set(order.items.map((item: any) => item.product?.manufacturer?.toLowerCase() || item.product?.oem?.toLowerCase()));
    }, [order]);

    const hasPoly = manufacturers.has('poly');
    const hasLogitech = manufacturers.has('logitech') || manufacturers.has('logi');
    const hasNeat = manufacturers.has('neat');

    const handleStatusUpdate = async (newStatus: string) => {
        if (!order) return;
        setActionLoading(true);

        const updateData: any = { order_status: newStatus };
        if (newStatus === 'Processing') {
            updateData.approved_by = user.email;
            updateData.approved_at = new Date().toISOString();
        } else if (newStatus === 'Rejected') {
            updateData.rejected_by = user.email;
            updateData.rejected_at = new Date().toISOString();
        }

        try {
            const res = await fetch(`/api/orders/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData),
            });

            if (res.ok) {
                // Refresh full order data (with items)
                const fullRes = await fetch(`/api/orders/${id}`);
                const fullData = await fullRes.json();
                setOrder(fullData);

                // Send approved/rejected notification email
                if (newStatus === 'Processing' || newStatus === 'Rejected') {
                    try {
                        await fetch('/api/email/approve-reject', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                orderId: id,
                                status: newStatus,
                                orderData: fullData,
                                cartItems: fullData.items || [],
                            }),
                        });
                        console.log(`[DEBUG] ${newStatus} notification email sent for order #${id}`);
                    } catch (emailErr) {
                        // Email failure should not block the UI update
                        console.error('[DEBUG] Failed to send status email:', emailErr);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewLogs = async () => {
        setShowLogs(true);
        setLogsLoading(true);
        try {
            const res = await fetch(`/api/orders/${id}/logs`);
            const data = await res.json();
            setOrderLogs(data);
        } catch (err) {
            console.error('[DEBUG] Failed to fetch order logs:', err);
        } finally {
            setLogsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="max-w-4xl mx-auto p-8 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">{error || 'Order Not Found'}</h1>
                <p className="text-gray-500 mb-6 max-w-md">
                    {error === 'Unauthorized to view this order'
                        ? "You do not have permission to view this order. Please contact your administrator if you believe this is an error."
                        : "The order you are looking for might have been removed or the ID is incorrect."}
                </p>
                <Link
                    href="/orders/my"
                    className="px-6 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e41af] transition-colors shadow-sm"
                >
                    Return to My Orders
                </Link>
            </div>
        );
    }

    const isManager = userRole === 'Admin' || userRole === 'Shop Manager';
    const showApprovalButtons = (userRole === 'Admin' || userRole === 'Super Subscriber') && order.order_status === 'Awaiting Approval';
    // const showApprovalButtons = userRole === 'Admin' && order.order_status === 'Awaiting Approval';

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'awaiting approval': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'shipped': return 'bg-green-100 text-green-800 border-green-200';
            case 'returned': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-black-100 text-black-800 border-black-200';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 bg-gray-50 min-h-screen font-sans">
            {/* HEADER SECTION */}
            <div className="mb-8">
                <Link href="/orders/all" className="flex items-center text-sm text-gray-500 hover:text-gray-800 mb-4 group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Orders
                </Link>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            {/* <h1 className="text-2xl mb-1 text-gray-800 font-bold">Order #{String(order.id).padStart(4, '0')}</h1> */}
                            <h1 className="text-2xl mb-1 text-gray-800 font-semibold">Order #{order.id}</h1>
                            <p className="text-gray-500 text-sm font-inter">Order placed on {new Date(order.created_at).toLocaleDateString()}</p>
                            <div className={`mt-4 inline-flex px-4 py-2 rounded-xl text-sm font-inter border ${getStatusColor(order.order_status)}`}>
                                {order.order_status}
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-3">
                            {order.return_label_url && (
                                <button
                                    onClick={() => window.open(order.return_label_url, "_blank")}
                                    className="bg-[#16A34A] hover:bg-[#15803d] text-white px-4 py-2 rounded-lg text-[13px] font-inter flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download Return Label
                                </button>
                            )}

                            {!['Subscriber', 'Poly Super Subscriber', 'Logitech Super Subscriber', 'Neat Super Subscriber'].includes(userRole || '') && (
                                <button
                                    onClick={handleViewLogs}
                                    className="bg-white text-gray-500 px-2 py-2 rounded-lg border border-gray-200 text-[13px] font-inter flex items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 2 0 01.707.293l5.414 5.414a1 2 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    View Logs
                                </button>
                            )}

                            {isManager && (
                                <button
                                    onClick={() => {
                                        setNavigating(true);
                                        router.push(`/orders/${order.id}/edit`);
                                    }}
                                    disabled={navigating}
                                    className="bg-[#4285f4] hover:bg-[#3b77db] text-white px-4 py-2 rounded-lg text-[13px] font-inter flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60 whitespace-nowrap w-fit"
                                >
                                    {navigating ? (
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    )}
                                    {navigating ? 'Loading...' : 'Edit'}
                                </button>
                            )}

                            {showApprovalButtons && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleStatusUpdate('Rejected')}
                                        disabled={actionLoading}
                                        className="border border-black-1000 text-black-500 bg-white hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-[13px] font-inter flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate('Processing')}
                                        disabled={actionLoading}
                                        className="bg-[#00a651] hover:bg-[#008c44] text-white px-3 py-2 rounded-lg text-[13px] font-inter flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Approve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* APPROVAL INFO - Integrated into Header Card */}
                    {(order.approved_by || order.rejected_by) && (
                        <div className="mt-8 pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-4">
                                {/* <div className={`p-3 rounded-xl ${order.approved_by ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={order.approved_by ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                    </svg>
                                </div> */}
                                <div>
                                    <p className="text-[10px] font-medium-inter text-gray-400 uppercase tracking-widest mb-1">
                                        {order.approved_by ? 'Approved By' : 'Rejected By'}
                                    </p>
                                    <p className="text-[14px] font-medium-inter text-gray-800">{order.approved_by || order.rejected_by}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-medium-inter text-gray-400 uppercase tracking-widest mb-1">
                                    {order.approved_by ? 'Approved At' : 'Rejected At'}
                                </p>
                                <p className="text-[14px] font-medium-inter text-gray-800">
                                    {order.approved_by
                                        ? (order.approved_at ? new Date(order.approved_at).toLocaleString() : new Date(order.created_at).toLocaleString())
                                        : (order.rejected_at ? new Date(order.rejected_at).toLocaleString() : 'N/A')}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>



            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 gap-6 mb-6">


                {/* SHIPPING & TRACKING (TIMELINE) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center">
                        <div className="p-1 px-2.5  text-gray-500 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 2 0 01.707.293l2.414 2.414a1 2 0 00.707.293h3.172a1 2 0 00.707-.293l2.414-2.414a1 2 0 01.707-.293H20" />
                            </svg>
                        </div>
                        <h3 className="text-[16px] font-semibold text-[#111827]">Shipping & Tracking</h3>
                    </div>
                    <div className="p-8">
                        <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase mb-1">Tracking #</p>
                                {order.tracking_id ? (
                                    <a href={order.tracking_link} target="_blank" rel="noopener noreferrer" className="font-medium-inter text-blue-600 hover:underline">
                                        {order.tracking_id}
                                    </a>
                                ) : <p className="text-sm font-medium text-gray-400">N/A</p>}
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase mb-1">Return Tracking #</p>
                                {order.return_tracking_id ? (
                                    <a href={order.return_tracking_link} target="_blank" rel="noopener noreferrer" className="font-medium-inter text-blue-600 hover:underline">
                                        {order.return_tracking_id}
                                    </a>
                                ) : <p className=" font-medium text-gray-400">N/A</p>}
                            </div>

                        </div>

                        <div className="relative flex items-center justify-between">
                            {/* LINE */}
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
                            <div
                                className="absolute top-1/2 left-0 h-0.5 bg-green-500 -translate-y-1/2 z-0 transition-all duration-500"
                                style={{ width: ['Shipped', 'Returned'].includes(order.order_status) ? (order.order_status === 'Returned' ? '100%' : '50%') : '0%' }}
                            ></div>

                            {/* STEP 1: CONFIRMED */}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md ${['Processing', 'Shipped', 'Returned'].includes(order.order_status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <p className="mt-2 text-xs font-semibold text-gray-800">Confirmed</p>
                                <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                            </div>

                            {/* STEP 2: SHIPPED */}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md ${['Shipped', 'Returned'].includes(order.order_status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                    </svg>
                                </div>
                                <p className="mt-2 text-xs font-semibold text-gray-800">Shipped</p>
                                <p className="text-[10px] text-gray-400">{order.shipped_at ? new Date(order.shipped_at).toLocaleDateString() : '—'}</p>
                            </div>

                            {/* STEP 3: RETURNED */}
                            <div className="relative z-10 flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-md ${['Returned'].includes(order.order_status) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                </div>
                                <p className="mt-2 text-xs font-semibold text-gray-800">Returned</p>
                                <p className="text-[10px] text-gray-400">{order.returned_at ? new Date(order.returned_at).toLocaleDateString() : '—'}</p>
                            </div>
                        </div>

                    </div>
                </div>



                {/* ORDER ITEMS */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="p-1 px-2.5 text-gray-500 rounded-lg mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <h3 className="text-[16px] font-semibold text-[#111827]">Order Items ({order.items?.length || 0})</h3>
                        </div>

                    </div>
                    <div className="p-6 space-y-4">
                        {order.items?.map((item: any, idx: number) => (
                            <div key={item.id ?? `item-${idx}`} className="border border-gray-100 p-4 rounded-xl hover:bg-gray-50/50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4 items-start">
                                        {/* Product Image */}
                                        {/* <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-gray-50">
                                            {item.product?.main_image_url ? (
                                                <img
                                                    src={item.product.main_image_url}
                                                    alt={item.product?.product_name || 'Product'}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div> */}

                                        {/* Product Details */}
                                        <div>
                                            <h4 className="font-medium-inter text-[15px] text-[#2563eb] mb-1">{item.product?.product_name}</h4>
                                            <p className="text-[11px] font-medium-inter text-gray-400 mb-4">{item.product?.product_sku}</p>

                                            <div className="grid grid-cols-3 gap-8">
                                                {/* <div>
                                                    <p className="text-[10px] font-medium-inter text-gray-400 uppercase mb-0.5">Manufacturer</p>
                                                    <p className="text-[12px] font-medium-inter text-gray-700">{item.product?.oem || 'N/A'}</p>
                                                </div> */}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-3">
                                        <span className="bg-white text-black text-xs px-3 py-1 rounded-md border border-blue-100">
                                            Qty: {item.quantity}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


                {/* TEAM DETAILS */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center">
                        <div className="p-1 px-2.5 text-gray-500 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-[16px] font-semibold text-[#111827]">Team Details</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-y-6 gap-x-4">
                        <div>
                            <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Sales Executive</p>
                            <p className="text-[12px] text-[#111827] font-medium">{order.sales_executive}</p>
                        </div>
                        <div>
                            <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Sales Executive Email</p>
                            <p className="text-[12px] text-[#111827] font-medium">{order.sales_executive_email}</p>
                        </div>
                        <div>
                            <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Sales Manager</p>
                            <p className="text-[12px] text-[#111827] font-medium">{order.sales_manager}</p>
                        </div>
                        <div>
                            <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Sales Manager Email</p>
                            <p className="text-[12px] text-[#111827] font-medium">{order.sales_manager_email}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CUSTOMER INFORMATION */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center">
                            <div className="p-1 px-2.5 text-gray-500 rounded-lg mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-[16px] font-semibold text-[#111827]">Customer Information</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Company Name</p>
                                <p className="text-[12px] text-[#111827] font-medium">{order.customer_company_name}</p>
                            </div>
                            <div>
                                <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Receiver Name</p>
                                <p className="text-[12px] text-[#111827] font-medium">{order.customer_contact_name}</p>
                            </div>
                            <div>
                                <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Receiver Email</p>
                                <a href={`mailto:${order.customer_contact_email}`} className="text-[12px] text-[#111827] font-medium hover:underline">{order.customer_contact_email}</a>
                            </div>
                        </div>
                    </div>

                    {/* OPPORTUNITY DETAILS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center">
                            <div className="p-1 px-2.5 text-gray-500 rounded-lg mr-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-[16px] font-semibold text-[#111827]">Opportunity Details</h3>
                        </div>

                        <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
                            <div>
                                <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Device Size (Units)</p>
                                <p className="text-[12px] text-[#111827] font-medium">{order.device_opportunity_size_units}</p>
                            </div>
                            <div>
                                <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Revenue ($ Size)</p>
                                <p className="text-[12px] text-[#111827] font-medium">${Number(order.revenue_opportunity_size).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="font-medium-inter text-[13px] text-gray-500 mb-1">CRM Account #</p>
                                <p className="text-[12px] text-[#111827] font-medium">{order.crm_account_number}</p>
                            </div>
                            <div>
                                <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Segment</p>
                                <p className="text-[12px] text-[#111827] font-medium">{order.segment}</p>
                            </div>
                            <div>
                                <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Estimated Close Date</p>
                                <p className="text-[12px] text-[#111827] font-medium">
                                    {order.estimated_closed_date ? new Date(order.estimated_closed_date).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium-inter text-[14px] text-gray-500 mb-1">Opportunity Link</p>
                                <a href={order.opportunity_link} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-600 font-medium hover:underline break-all">
                                    {order.opportunity_link || 'N/A'}
                                </a>
                            </div>

                            {/* POLY FIELDS */}
                            {hasPoly && (
                                <>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">In-house Expertise</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.in_house_expertise}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Technical Resource</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.technical_resource}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Approved Deal Reg</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.approved_deal_reg || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Planning Version</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.customer_planning_version || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Deal Reg Number</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.reg_number || 'N/A'}</p>
                                    </div>
                                </>
                            )}

                            {/* LOGITECH SPECIFIC */}
                            {hasLogitech && (
                                <>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Logitech AE Engaged</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.logitech_engaged}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">AE Name</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.engaged_ae_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Technical Support</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.technical_support}</p>
                                    </div>
                                </>
                            )}

                            {/* NEAT SPECIFIC */}
                            {hasNeat && (
                                <div>
                                    <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Virtual Support</p>
                                    <p className="text-[12px] text-[#111827] font-medium">{order.virtual_support}</p>
                                </div>
                            )}

                            {/* SHARED LOGITECH / NEAT FIELDS */}
                            {(hasLogitech || hasNeat) && (
                                <>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Rooms to Upgrade</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.room_upgrade}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Expected Participants</p>
                                        <p className="text-[12px] text-[#111827] font-medium">{order.expected_participants}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* SHIPPING DETAILS */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center">
                        <div className="p-1 px-2.5 text-gray-500 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h3 className="text-[16px] font-semibold text-[#111827]">Shipping Details</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-y-6 gap-x-4">
                        <div>
                            <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Address</p>
                            <p className="text-[12px] text-[#111827] font-medium">{order.customer_shipping_address}</p>
                        </div>
                        <div>
                            <p className="font-medium-inter text-[13px] text-gray-500 mb-1">City</p>
                            <p className="text-[12px] text-[#111827] font-medium">{order.city}</p>
                        </div>
                        <div>
                            <p className="font-medium-inter text-[13px] text-gray-500 mb-1">State</p>
                            <p className="text-[12px] text-[#111827] font-medium">{order.state}</p>
                        </div>
                        <div>
                            <p className="font-medium-inter text-[13px] text-gray-500 mb-1">Zip</p>
                            <p className="text-[12px] text-[#111827] font-medium">{order.zip}</p>
                        </div>
                    </div>
                </div>





                {/* NOTES SECTION */}
                {order.notes && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-10">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center">

                            <h3 className="text-[16px] font-semibold text-[#111827]">Order Notes</h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-900 text-[13px] font-medium-inter whitespace-pre-wrap">{order.notes}</p>
                        </div>
                    </div>
                )}
            </div>



            {/* ORDER LOGS POPUP */}
            {showLogs && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* HEADER */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 2 0 01.707.293l5.414 5.414a1 2 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-800">Order Logs</h2>
                            </div>
                            <button
                                onClick={() => setShowLogs(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="p-6">
                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-200 w-1/4">Time</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-200 w-1/2">Action</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-200 w-1/4">Performed By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {logsLoading ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-12 text-center text-gray-400 italic">Loading logs...</td>
                                            </tr>
                                        ) : orderLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-12 text-center text-gray-400 italic">No activity logs found for this order.</td>
                                            </tr>
                                        ) : (
                                            orderLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">
                                                        {new Date(log.created_at).toLocaleString([], {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                                                        {log.action}
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] font-medium text-gray-500 break-all">
                                                        {log.performed_by}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setShowLogs(false)}
                                className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
