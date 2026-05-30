import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: any }
) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    const userRole = auth.profile.userrole;
    const isManager = userRole === 'Admin' || userRole === 'Shop Manager' || userRole === 'Super Subscriber';

    if (!isManager) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = await (params as any);

        // Fetch win by order_id (matching user's URL request)
        const { data: winData, error: winError } = await supabaseAdmin
            .from('wins')
            .select('*')
            .eq('order_id', id)
            .single();

        if (winError) {
            console.error('[DEBUG] Error fetching win details:', winError);
            return NextResponse.json({ error: 'Failed to fetch win details' }, { status: 500 });
        }

        if (!winData) {
            return NextResponse.json({ error: 'Win not found' }, { status: 404 });
        }

        // Fetch product info separately since there is no direct FK relationship
        let productInfo = null;
        if (winData.sku) {
            const { data: prodData } = await supabaseAdmin
                .from('inventory_products')
                .select('product_name, product_sku')
                .eq('product_sku', winData.sku)
                .single();
            if (prodData) productInfo = prodData;
        }

        // Attach product info for the UI
        const result = {
            ...winData,
            inventory_products: productInfo
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/wins/[id]:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
