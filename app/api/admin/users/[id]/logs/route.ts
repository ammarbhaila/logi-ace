import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export async function GET(
    request: NextRequest,
    { params }: { params: any }
) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    try {
        const { id } = await (params as any);

        const { data: logs, error } = await supabaseAdmin
            .from('user_logs')
            .select('*')
            .or(`user_id.eq.${id},user_email.eq.${id}`) // id could be UUID or email
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[DEBUG] Error fetching user logs:', error);
            return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
        }

        return NextResponse.json(logs || []);
    } catch (error) {
        console.error('[DEBUG] Unexpected error fetching user logs:', error);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
