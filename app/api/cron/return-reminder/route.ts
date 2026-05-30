import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Vercel Cron routes can be triggered by GET requests
export async function GET(request: Request) {
    // Basic security: allow authorization via cron secret in headers if using vercel cron
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET_APIKEY && authHeader !== `Bearer ${process.env.CRON_SECRET_APIKEY}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('[DEBUG] Running Return Reminder Cron Job...');

        // Ensure today is not Saturday (6) or Sunday (0)
        const todayUrl = new Date();
        const dayOfWeek = todayUrl.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            console.log('[DEBUG] It is the weekend. Skipping email delivery until Monday.');
            return NextResponse.json({ success: true, message: 'Skipped - Weekend' });
        }

        // 1. Fetch all orders that are Shipped and haven't had the 25-day reminder sent
        // Using `is` literal allows fallback checking if the column was recently added as default false
        // But some rows might have NULL if the default didn't apply retrospectively in some engines.
        const { data: orders, error: fetchError } = await supabaseAdmin
            .from('checkout_requests')
            .select('*')
            .eq('order_status', 'Shipped')
            .or('return_reminder_sent.is.null,return_reminder_sent.eq.false');

        if (fetchError) {
            console.error('[DEBUG] Failed to fetch eligible orders:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
        }

        console.log(`[DEBUG] Found ${orders?.length} potential orders for return reminder.`);

        if (!orders || orders.length === 0) {
            return NextResponse.json({ success: true, message: 'No eligible orders found' });
        }

        const now = Date.now();
        let sentCount = 0;

        for (const order of orders) {
            // Find when the order was actually marked as Shipped
            const { data: logs } = await supabaseAdmin
                .from('order_logs')
                .select('*')
                .eq('order_id', order.id)
                .ilike('action', '%Shipped%')
                .order('created_at', { ascending: true }) // Look for the FIRST time it was shipped
                .limit(1);

            let shippedDateMs = 0;
            if (logs && logs.length > 0) {
                shippedDateMs = new Date(logs[0].created_at).getTime();
            } else {
                shippedDateMs = new Date(order.updated_at || order.created_at).getTime();
            }

            const diffTime = Math.abs(now - shippedDateMs);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 25) {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
                try {
                    const { data: cartItems } = await supabaseAdmin
                        .from('order_items')
                        .select('*, product:inventory_products(*)')
                        .eq('order_id', order.id);

                    const emailRes = await fetch(`${siteUrl}/api/email/return-reminder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: order.id,
                            orderData: order,
                            cartItems: cartItems || [],
                            shippedDate: new Date(shippedDateMs).toLocaleDateString("en-US", {
                                month: "long", day: "numeric", year: "numeric",
                            })
                        })
                    });

                    if (emailRes.ok) {
                        await supabaseAdmin
                            .from('checkout_requests')
                            .update({ return_reminder_sent: true })
                            .eq('id', order.id);
                        sentCount++;
                    }
                } catch (err) {
                    console.error(`[DEBUG] Failed for #${order.id}:`, err);
                }
            }
        }

        return NextResponse.json({ success: true, processed: sentCount, message: `Sent ${sentCount} reminders.` });
    } catch (error: any) {
        console.error('[DEBUG] Return Reminder Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
