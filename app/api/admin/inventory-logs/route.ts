import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    try {
        const { data: logs, error } = await supabaseAdmin
            .from('inventory_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.error('[DEBUG] Error fetching inventory logs:', error);
            return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
        }

        return NextResponse.json(logs || []);
    } catch (error) {
        console.error('[DEBUG] Unexpected error fetching inventory logs:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
