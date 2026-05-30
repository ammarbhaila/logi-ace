"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function AwaitingApprovalOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                router.push('/login');
                return;
            }
            setUser(user);

            try {
                const profileRes = await fetch("/api/auth/me");
                const profileData = await profileRes.json();

                let role = null;
                if (profileData.error) {
                    const { data: profile } = await supabase
                        .from('profile')
                        .select('userrole')
                        .or(`id.eq.${user.id},userId.eq.${user.id}`)
                        .single();
                    role = profile?.userrole || null;
                } else {
                    role = profileData.userrole || null;
                }

                setUserRole(role);

                // Access control: Only managers can view all orders
                if (role !== 'Admin' && role !== 'Shop Manager' && role !== 'Super Subscriber') {
                    router.push('/orders/my'); // Redirect to their personal orders
                    return;
                }

                fetchOrders();
            } catch (err) {
                router.push('/orders');
            }
        };

        fetchSession();
    }, [router]);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`/api/orders?view=all`);
            const data = await res.json();
            if (Array.isArray(data)) {
                // Filter only for Awaiting Approval
                const awaiting = data.filter(o => o.order_status?.toLowerCase() === 'awaiting approval');
                setOrders(awaiting);
                setFilteredOrders(awaiting);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    };

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

    const handleExport = () => {
        const exportData = filteredOrders.map(order => ({
            'Order ID': order.id,
            'Order Date': new Date(order.created_at).toLocaleDateString(),
            'Customer Company': order.customer_company_name || '—',
            'Customer Contact': order.customer_contact_name || '—',
            'Sales Executive': order.sales_executive || '—',
            'Executive Email': order.sales_executive_email || '—',
            'Status': order.status
        }));
        downloadCSV(exportData, 'awaiting_approval_orders');
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
            <div className="max-w-[1400px] mx-auto">
                {/* FILTERS & ACTIONS */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">

                    </div>

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
                                className="w-full h-[34px] pl-8 pr-3 border border-gray-300 rounded-md bg-white text-[13px] outline-none focus:border-gray-400 transition-all text-gray-600"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 h-[34px] px-3 border border-gray-300 rounded-md bg-[#f0f0f0]/50 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
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
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2">
                                            Order #
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2">
                                            Order Date
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            Customer Company
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            Customer Contact
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            Sales Executive
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                    <th className="px-5 py-1.5 font-medium text-gray-800 text-[14px]">
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            Executive Email
                                            <span className="text-gray-400 flex flex-col -gap-1 text-[8px]">
                                                <span>▲</span>
                                                <span className="-mt-1">▼</span>
                                            </span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-10 text-center">
                                            <p className="text-gray-500 text-[15px]">No orders found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-2 border-r border-gray-100 last:border-0">
                                                <Link
                                                    href={`/orders/${order.id}`}
                                                    className="text-[14px] font-medium text-[#1e40af] hover:underline"
                                                >
                                                    {/* #{String(order.id).padStart(4, '0')} */}
                                                    #{order.id}
                                                </Link>
                                            </td>
                                            <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100 last:border-0">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-2 text-[13px] font-medium text-gray-800 border-r border-gray-100 last:border-0">
                                                {order.customer_company_name}
                                            </td>
                                            <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100 last:border-0">
                                                {order.customer_contact_name}
                                            </td>
                                            <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100 last:border-0">
                                                {order.sales_executive}
                                            </td>
                                            <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100 last:border-0">
                                                {order.sales_executive_email}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PAGINATION */}
                <div className="flex items-center justify-between mt-7">
                    <div className="text-[13px] text-gray-500 font-medium">
                        Showing <span className="text-gray-800">{filteredOrders.length}</span> of <span className="text-gray-800">{orders.length}</span> awaiting approval
                    </div>
                    <div className="flex items-center gap-1">
                        {/* <button className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                            Previous
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-900 text-white text-[14px] font-medium">
                            1
                        </button>
                        <button className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors">
                            Next
                        </button> */}
                    </div>
                </div>
            </div>
        </div>
    );
}
