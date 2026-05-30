import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendWaitlistSubscribedEmail } from "@/lib/emailService";
import { withAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    const userRole = auth.profile.userrole;
    const isManager = userRole === 'Admin' || userRole === 'Shop Manager' || userRole === 'Super Subscriber';

    if (!isManager) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('waitlist')
            .select(`
                *,
                inventory_products (product_name, product_sku, stock_quantity)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DEBUG] Error fetching waitlist:', error);
            return NextResponse.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/waitlist:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await withAuth(req);
    if (auth.error) return auth.error;

    try {
        const { userid, product_id, email_address, company_name, product_name } = await req.json();

        if (!product_id || !email_address) {
            return NextResponse.json({ error: "Product ID and Email are required" }, { status: 400 });
        }

        // 1. Insert into waitlist table
        const { error: insertError } = await supabaseAdmin
            .from("waitlist")
            .insert({
                userid: userid || null,
                product_id,
                email_address,
                company_name,
            });

        if (insertError) {
            console.error("Waitlist insert error:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // 2. Send subscription confirmation email
        try {
            await sendWaitlistSubscribedEmail({
                email: email_address,
                productName: product_name,
                companyName: company_name,
            });
        } catch (emailError) {
            console.error("Waitlist email error:", emailError);
            // We don't fail the request if email fails, but we log it
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Waitlist API error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
