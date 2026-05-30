"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';
import { CheckCircle2, XCircle, Mail } from 'lucide-react';

export default function OverdueOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [userRole, setUserRole] = useState<string | null>(null);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());
    const [sendingReminders, setSendingReminders] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchSession = async () => {
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

                const allowedRoles = ['Admin', 'Shop Manager', 'Super Subscriber', 'Program Manager'];
                if (!allowedRoles.includes(role)) {
                    router.push('/orders/my');
                    return;
                }

                fetchOverdueOrders();
            } catch (err) {
                console.error('[DEBUG] OverdueOrdersPage profile fetch error:', err);
                router.push('/orders/my');
            }
        };

        fetchSession();
    }, [router]);

    const fetchOverdueOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/orders/overdue');
            const data = await res.json();
            if (Array.isArray(data)) {
                setOrders(data);
                setFilteredOrders(data);
            }
        } catch (err) {
            console.error('Failed to fetch overdue orders:', err);
        } finally {
            setLoading(false);
        }
    };

    // Search filtering
    useEffect(() => {
        if (!search.trim()) {
            setFilteredOrders(orders);
            return;
        }
        const q = search.toLowerCase();
        const filtered = orders.filter(o =>
            String(o.id).toLowerCase().includes(q) ||
            o.customer_company_name?.toLowerCase().includes(q) ||
            o.customer_contact_name?.toLowerCase().includes(q) ||
            o.sales_executive?.toLowerCase().includes(q) ||
            o.sales_executive_email?.toLowerCase().includes(q)
        );
        setFilteredOrders(filtered);
    }, [search, orders]);

    const toggleSelectAll = () => {
        if (selectedOrderIds.size === filteredOrders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
        }
    };

    const toggleSelectOrder = (id: number) => {
        const newSelected = new Set(selectedOrderIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedOrderIds(newSelected);
    };

    const handleSendReminders = async () => {
        if (selectedOrderIds.size === 0) return;
        if (!confirm(`Are you sure you want to send reminders for ${selectedOrderIds.size} orders?`)) return;

        setSendingReminders(true);
        const idsArray = Array.from(selectedOrderIds);

        let successCount = 0;
        for (const id of idsArray) {
            try {
                const res = await fetch('/api/email/overdue-reminder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: id })
                });
                if (res.ok) successCount++;
            } catch (err) {
                console.error(`Failed to send reminder for order #${id}:`, err);
            }
        }

        alert(`Successfully sent ${successCount} reminders.`);
        setSendingReminders(false);
        setSelectedOrderIds(new Set());
        fetchOverdueOrders(); // Refresh to update status icons
    };

    const handleExport = () => {
        const exportData = filteredOrders.map(order => ({
            'Order #': order.id,
            'Customer': order.customer_contact_name,
            'Company': order.customer_company_name,
            'Email': order.customer_contact_email,
            'Days Shipped': calculateDaysShipped(order.shipped_at),
            'Shipped Date': order.shipped_at ? new Date(order.shipped_at).toLocaleDateString() : '—',
            'Reminder Sent': order.overdue_reminder_sent ? 'Yes' : 'No',
            'Return Tracking #': order.return_tracking_id || '—',
            'Order Date': new Date(order.created_at).toLocaleDateString(),
            'Sales Executive': order.sales_executive,
            'Sales Executive Email': order.sales_executive_email
        }));
        downloadCSV(exportData, 'overdue_orders');
    };

    const calculateDaysShipped = (shippedAt: string) => {
        if (!shippedAt) return 0;
        const diff = Date.now() - new Date(shippedAt).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a]"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white py-12 px-6 lg:px-12 font-sans">
            <div className="max-w-[1600px] mx-auto">

                {/* TOP ACTIONS */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={handleSendReminders}
                        disabled={selectedOrderIds.size === 0 || sendingReminders}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${selectedOrderIds.size > 0 && !sendingReminders
                            ? 'bg-[#112F45] text-white hover:bg-[#1a4a6e]'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <Mail className="w-4 h-4" />
                        {sendingReminders ? 'Sending...' : 'Send Reminder'}
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="relative w-[300px]">
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full h-10 pl-4 pr-10 border border-gray-300 rounded-md text-sm outline-none focus:border-[#112F45]"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <img src="https://www.shiuchub.com/download.png" alt="Excel" className="w-5 h-5 object-contain" />
                            Download
                        </button>
                    </div>
                </div>

                {/* TABLE SECTION */}
                <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
                    <div className="bg-[#112F45] text-white px-6 py-3 text-center">
                        <h1 className="text-xl font-bold tracking-wider">Overdue Orders</h1>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#f8fafc] border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-[#112F45] border-gray-300 rounded focus:ring-[#112F45]"
                                            checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Order #</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Customer</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Customer Company Name</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Customer Contact Email</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Days Shipped</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Shipped Date</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm text-center">Reminder Status</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Return Tracking #</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Order Date</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Sales Executive</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-sm">Sales Executive email</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-20 text-center text-gray-500">
                                            No overdue orders found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-[#112F45] border-gray-300 rounded focus:ring-[#112F45]"
                                                    checked={selectedOrderIds.has(order.id)}
                                                    onChange={() => toggleSelectOrder(order.id)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-blue-600 hover:underline">
                                                <Link href={`/orders/${order.id}`}>#{order.id}</Link>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.customer_contact_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.customer_company_name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.customer_contact_email}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{calculateDaysShipped(order.shipped_at)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {order.shipped_at ? new Date(order.shipped_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {order.overdue_reminder_sent ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                                ) : (
                                                    <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.return_tracking_id || '—'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.sales_executive}</td>
                                            <td className="px-4 py-3 text-sm text-gray-700">{order.sales_executive_email}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PAGINATION INFO */}
                <div className="mt-4 text-sm text-gray-500">
                    Showing 1 to {filteredOrders.length} of {orders.length} entries
                </div>
            </div>
        </div>
    );
}
