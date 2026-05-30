"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function WinDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [win, setWin] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch(`/api/wins/${id}`);
                const data = await res.json();
                if (data.error) {
                    console.error(data.error);
                } else {
                    setWin(data);
                }
            } catch (err) {
                console.error('Failed to fetch win details:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchWin();
    }, [id, router]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#112F45]"></div>
            </div>
        );
    }

    if (!win) {
        return (
            <div className="flex flex-col justify-center items-center min-h-screen">
                <h1 className="text-2xl font-bold text-gray-800">Win Not Found</h1>
                <button 
                    onClick={() => router.push('/wins/all')}
                    className="mt-4 text-blue-600 hover:underline"
                >
                    Back to all wins
                </button>
            </div>
        );
    }

    const detailRows = [
        { label: 'Order #', value: win.order_id },
        { label: 'User Name', value: win.user_name },
        { label: 'User Email', value: win.user_email },
        { label: 'Customer Name', value: win.customer_name },
        { label: 'Customer Contact Email', value: win.customer_contact_email },
        { label: 'CRM Account #', value: win.crm_account_number },
        { label: 'Sale Executive', value: win.sales_executive },
        { label: 'Is this a one-time purchase or a roll out?', value: win.purchase_type },
        { label: 'Total Deal Value (Including Services)?', value: win.total_revenue ? `$${Number(win.total_revenue).toLocaleString()}` : '' },
        { label: 'Date of Closing', value: win.date_of_purchase ? new Date(win.date_of_purchase).toLocaleDateString() : '' },
        { label: 'Number of Devices Closed', value: win.num_units },
        { label: 'Customer experience with the Program', value: win.feedback },
        { label: 'Your experience with the Program', value: '' }, // Omitted as per user request
        { label: 'If other select please specify SKU#', value: win.sku },
        { label: 'Please provide additional details if any', value: '' } // Omitted as per user request
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <button 
                    onClick={() => router.push('/wins/all')}
                    className="mb-6 flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Reported Wins
                </button>

                <div className="border border-gray-200 overflow-hidden shadow-sm">
                    {/* DEVICES SECTION */}
                    <div className="bg-[#003B5C] px-6 py-3 border-b border-gray-200">
                        <h2 className="text-white text-lg font-bold">Devices</h2>
                    </div>
                    <div className="bg-gray-50 px-6 py-6 border-b border-gray-200">
                        <p className="text-[15px] text-gray-800">
                            {win.inventory_products?.product_name || win.sku || '—'}
                            {win.inventory_products?.product_sku && ` (#${win.inventory_products.product_sku})`}
                        </p>
                    </div>

                    {/* WIN FORM DETAIL SECTION */}
                    <div className="bg-[#003B5C] px-6 py-3 border-b border-gray-200">
                        <h2 className="text-white text-lg font-bold">Win Form Detail</h2>
                    </div>

                    <div className="divide-y divide-gray-200">
                        {detailRows.map((row, idx) => (
                            <div key={idx} className="flex flex-col md:flex-row bg-white">
                                <div className="md:w-1/3 bg-gray-50 px-6 py-3 border-r border-gray-200 flex items-center">
                                    <span className="text-[14px] font-semibold text-gray-700">{row.label}</span>
                                </div>
                                <div className="md:w-2/3 px-6 py-3 flex items-center">
                                    <span className="text-[14px] text-gray-800">{row.value || '—'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTTOM FEEDBACK SUMMARY */}
                {win.feedback && (
                    <div className="mt-8 bg-gray-50 p-6 border border-gray-200 rounded-sm">
                        <p className="text-[15px] text-gray-700 leading-relaxed italic whitespace-pre-wrap">
                            {win.feedback}
                        </p>
                    </div>
                )}
            </div>

            {/* COPYRIGHT FOOTER */}
            <div className="text-center py-10 text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} All Rights Reserved. Design by <span className="text-blue-600">Worko360</span></p>
            </div>
        </div>
    );
}
