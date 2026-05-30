"use client";

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { downloadCSV } from '@/lib/exportUtils';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

export default function AllOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const router = useRouter();

    const [visibleColumns, setVisibleColumns] = useState({
        orderId: true,
        orderDate: true,
        customerCompany: true,
        customerContact: true,
        salesExecutive: true,
        executiveEmail: true,
        status: true,
        shippedDate: true,
        returnedDate: false,
        trackingId: true,
        returnTrackingId: true,
        returnLabel: true,
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
                    console.error('[DEBUG] AllOrdersPage API error:', profileData.error);
                    // Fallback
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

                if (role === 'Admin') {
                    setVisibleColumns({
                        orderId: true,
                        orderDate: true,
                        customerCompany: true,
                        customerContact: true,
                        salesExecutive: true,
                        executiveEmail: true,
                        status: true,
                        shippedDate: true,
                        returnedDate: true,
                        trackingId: true,
                        returnTrackingId: true,
                        returnLabel: true,
                    });
                } else if (role === 'Shop Manager') {
                    setVisibleColumns({
                        orderId: true,
                        orderDate: false,
                        customerCompany: false,
                        customerContact: false,
                        salesExecutive: false,
                        executiveEmail: false,
                        status: true,
                        shippedDate: true,
                        returnedDate: false,
                        trackingId: true,
                        returnTrackingId: true,
                        returnLabel: true,
                    });
                }

                const allowedAllOrdersRoles = [
                    'Admin', 'Shop Manager', 'Super Subscriber',
                    'Poly Super Subscriber', 'Logitech Super Subscriber', 'Neat Super Subscriber'
                ];

                if (!allowedAllOrdersRoles.includes(role)) {
                    router.push('/orders/my'); // Redirect to their personal orders
                    return;
                }

                fetchOrders('all');
            } catch (err) {
                console.error('[DEBUG] AllOrdersPage profile fetch catch:', err);
                router.push('/orders/my');
            }
        };

        fetchSession();
    }, [router]);

    const fetchOrders = async (view: string = 'all') => {
        try {
            const res = await fetch(`/api/orders?view=${view}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setOrders(data);
                setFilteredOrders(data);
            }
        } catch (err) {
            console.error('Failed to fetch orders:', err);
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
            o.sales_executive_email?.toLowerCase().includes(q) ||
            o.order_status?.toLowerCase().includes(q)
        );
        setFilteredOrders(filtered);
    }, [search, orders]);

    const getStatusColor = (status: string) => {
        // Return simple text style now as requested
        return 'text-gray-700 font-medium';
    };

    const handleExport = () => {
        const exportData = filteredOrders.map(order => {
            const row: any = {};
            if (visibleColumns.orderId) row['Order ID'] = order.id;
            if (visibleColumns.orderDate) row['Order Date'] = new Date(order.created_at).toLocaleDateString();
            if (visibleColumns.customerCompany) row['Customer Company'] = order.customer_company_name || '—';
            if (visibleColumns.customerContact) row['Customer Contact'] = order.customer_contact_name || '—';
            if (visibleColumns.salesExecutive) row['Sales Executive'] = order.sales_executive || '—';
            if (visibleColumns.executiveEmail) row['Executive Email'] = order.sales_executive_email || '—';
            if (visibleColumns.status) row['Status'] = order.order_status;
            if (visibleColumns.shippedDate) row['Shipped Date'] = order.shipped_at ? new Date(order.shipped_at).toLocaleDateString() : '—';
            if (visibleColumns.returnedDate) row['Returned Date'] = order.returned_at ? new Date(order.returned_at).toLocaleDateString() : '—';
            if (visibleColumns.trackingId) row['Tracking #'] = order.tracking_id || '—';
            if (visibleColumns.returnTrackingId) row['Return Tracking #'] = order.return_tracking_id || '—';
            if (visibleColumns.returnLabel) row['Return Label URL'] = order.return_label_url || '—';
            return row;
        });
        downloadCSV(exportData, 'all_orders');
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
            <div className="max-w-[1400px] mx-auto">
                {/* FILTERS & ACTIONS */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 relative" ref={columnMenuRef}>
                        {userRole !== 'Shop Manager' && (
                            <button
                                onClick={() => setShowColumnMenu(!showColumnMenu)}
                                className="flex items-center gap-2 px-2.5 py-1.5 border border-gray-300 rounded-md bg-[#f0f0f0]/50 text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors h-[34px]"
                            >
                                Columns
                                <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showColumnMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        )}

                        {showColumnMenu && (
                            <div className="absolute top-12 left-0 w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                                <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2">Toggle Columns</div>
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                    {[
                                        { key: 'orderId', label: 'Order #' },
                                        { key: 'orderDate', label: 'Order Date' },
                                        { key: 'customerCompany', label: 'Company' },
                                        { key: 'customerContact', label: 'Contact' },
                                        { key: 'salesExecutive', label: 'Sales Exec' },
                                        { key: 'executiveEmail', label: 'Exec Email' },
                                        { key: 'status', label: 'Status' },
                                        { key: 'shippedDate', label: 'Shipped Date' },
                                        { key: 'returnedDate', label: 'Returned Date' },
                                        { key: 'trackingId', label: 'Tracking #' },
                                        { key: 'returnTrackingId', label: 'Return Tracking #' },
                                        { key: 'returnLabel', label: 'Return Label' },
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
                                    {visibleColumns.orderId && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Order #
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.orderDate && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Order Date
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.customerCompany && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Company Name
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.customerContact && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Receiver name
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.salesExecutive && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Sales Executive
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.executiveEmail && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Executive Email
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.status && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3">
                                                Status
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.shippedDate && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Shipped Date
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.returnedDate && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Returned Date
                                                <span className="text-gray-500 flex flex-col -gap-1 text-[8px]">
                                                    <span>▲</span>
                                                    <span className="-mt-1">▼</span>
                                                </span>
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.trackingId && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px] w-[160px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Tracking #
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.returnTrackingId && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px] w-[170px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Return Tracking #
                                            </div>
                                        </th>
                                    )}
                                    {visibleColumns.returnLabel && (
                                        <th className="px-5 py-2 font-medium text-gray-800 text-[14px] w-[140px]">
                                            <div className="flex items-center gap-3 whitespace-nowrap">
                                                Return Label
                                            </div>
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length || 1} className="px-6 py-20 text-center">
                                            <p className="text-gray-500 text-[16px]">No orders found.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            {visibleColumns.orderId && (
                                                <td className="px-5 py-2 border-r border-gray-100">
                                                    <Link
                                                        href={`/orders/${order.id}`}
                                                        className="text-[13px] font-medium text-[#1e40af] hover:underline"
                                                    >
                                                        #{order.id}
                                                    </Link>
                                                </td>
                                            )}
                                            {visibleColumns.orderDate && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </td>
                                            )}
                                            {visibleColumns.customerCompany && (
                                                <td className="px-5 py-2 text-[13px] font-medium text-gray-800 border-r border-gray-100">
                                                    {order.customer_company_name}
                                                </td>
                                            )}
                                            {visibleColumns.customerContact && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {order.customer_contact_name}
                                                </td>
                                            )}
                                            {visibleColumns.salesExecutive && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {order.sales_executive}
                                                </td>
                                            )}
                                            {visibleColumns.executiveEmail && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {order.sales_executive_email}
                                                </td>
                                            )}
                                            {visibleColumns.status && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 font-medium border-r border-gray-100">
                                                    {order.order_status}
                                                </td>
                                            )}
                                            {visibleColumns.shippedDate && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {order.shipped_at ? new Date(order.shipped_at).toLocaleDateString() : '—'}
                                                </td>
                                            )}
                                            {visibleColumns.returnedDate && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {order.returned_at ? new Date(order.returned_at).toLocaleDateString() : '—'}
                                                </td>
                                            )}
                                            {visibleColumns.trackingId && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {order.tracking_id ? (
                                                        <a href={order.tracking_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                            {order.tracking_id}
                                                        </a>
                                                    ) : '—'}
                                                </td>
                                            )}
                                            {visibleColumns.returnTrackingId && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700 border-r border-gray-100">
                                                    {order.return_tracking_id ? (
                                                        <a href={order.return_tracking_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                            {order.return_tracking_id}
                                                        </a>
                                                    ) : '—'}
                                                </td>
                                            )}
                                            {visibleColumns.returnLabel && (
                                                <td className="px-5 py-2 text-[13px] text-gray-700">
                                                    {order.return_label_url ? (
                                                        <button
                                                            onClick={() => window.open(order.return_label_url, "_blank")}
                                                            className="px-3 py-1 bg-[#213643] text-white font-medium text-[12px] rounded-md hover:bg-[#1a2b35] transition"
                                                        >
                                                            Download
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </td>
                                            )}
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
                        Showing <span className="text-gray-800">{filteredOrders.length}</span> of <span className="text-gray-800">{orders.length}</span> orders
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
