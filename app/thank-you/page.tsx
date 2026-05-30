"use client";

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';

type OrderItem = {
    id: string;
    quantity: number;
    product: {
        product_name: string;
        product_sku: string;
        main_image_url: string | null;
        oem: string;
    } | null;
};

type Order = {
    id: number;
    created_at: string;
    customer_company_name: string;
    items: OrderItem[];
};

function ThankYouContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }
        fetch(`/api/orders/${orderId}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                setOrder(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [orderId]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    return (
        <div className="max-w-5xl mx-auto px-4 w-full">
            <div className="relative bg-white rounded-[3rem] shadow-[0_20px_70px_rgba(0,0,0,0.05)] p-12 md:p-16 pt-16 md:pt-20">
                {/* Centered Checkmark Icon */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#008000] rounded-full flex items-center justify-center border-8 border-[#f9fafb] shadow-sm">
                    <svg
                        className="w-10 h-10 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M5 13l4 4L19 7"
                        ></path>
                    </svg>
                </div>

                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-4xl font-medium-inter text-gray-900 tracking-tight">Order Submitted</h1>
                </div>

                {loading ? (
                    <div className="text-gray-400 text-sm py-12 text-center italic">Loading order details...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-16 px-1">
                        {/* Order No# */}
                        <div className="text-center">
                            <h3 className="text-[15px] font-medium-inter text-gray-900 mb-2 font-sans">Order#</h3>
                            <p className="text-[14px] text-gray-800 font-medium">{order?.id ?? orderId}</p>
                        </div>

                        {/* Order Details: */}
                        <div className="text-center">
                            <h3 className="text-[16px] font-medium-inter text-gray-900 mb-2 font-sans">Order Details:</h3>
                            <div className="space-y-1.5">
                                {order?.items && order.items.length > 0 ? (
                                    order.items.map((item) => (
                                        <div key={item.id} className="flex flex-col items-center">
                                            <p className="text-[14px] text-gray-800 font-regular leading-relaxed max-w-[390px] whitespace-nowrap">
                                                {item.product?.product_name ?? 'Unknown Product'}
                                            </p>
                                            {item.product?.product_sku && (
                                                <p className="text-[10px] text-gray-600 font-medium-inter uppercase mt-0.5">
                                                    SKU# {item.product.product_sku}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-base text-gray-400">No items found</p>
                                )}
                            </div>
                        </div>

                        {/* Date */}
                        <div className="text-center">
                            <h3 className="text-[15px] font-medium text-gray-900 mb-2 font-sans">Date</h3>
                            <p className="text-[14px] text-gray-800 font-medium whitespace-nowrap">
                                {order?.created_at ? formatDate(order.created_at) : '—'}
                            </p>
                        </div>

                        {/* Company Name */}
                        <div className="text-center">
                            <h3 className="text-[15px] font-medium text-gray-900 mb-2 font-sans">Company Name</h3>
                            <p className="text-[14px] text-gray-800 font-medium">
                                {order?.customer_company_name ?? '—'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer Link */}
                <div className="text-center">
                    <Link
                        href="/orders/my"
                        className="text-base text-[16px] font-medium-inter text-gray-800 transition-colors"
                    >
                        Track order details on{' '}
                        <span className="text-[#0056C7] hover:text-[#2563eb] font-medium underline decoration-2 underline-offset-8">
                            My Orders
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ThankYouPage() {
    return (
        <div className="min-h-[75vh] bg-[#f9fafb] flex items-center justify-center pt-[54px] pb-10">
            <Suspense fallback={<div className="text-center p-20 text-gray-400">Loading...</div>}>
                <ThankYouContent />
            </Suspense>
        </div>
    );
}
