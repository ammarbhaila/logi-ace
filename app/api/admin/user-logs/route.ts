import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    // Only Admin, Shop Manager, and Super Subscriber can view user logs
    const allowedRoles = ["Admin", "Shop Manager", "Super Subscriber"];
    if (!auth.profile || !allowedRoles.includes(auth.profile.userrole)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { data: logs, error } = await supabaseAdmin
            .from('user_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

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
