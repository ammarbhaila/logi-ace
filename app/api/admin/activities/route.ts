import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { withAuth } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
    const auth = await withAuth(request);
    if (auth.error) return auth.error;

    const userRole = auth.profile.userrole;
    const allowedRoles = ['Admin', 'Super Subscriber', 'Program Manager'];
    if (!allowedRoles.includes(userRole)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { data: activities, error } = await supabaseAdmin
            .from('user_activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
            console.error('[DEBUG] Failed to fetch user activities:', error);
            return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
        }

        return NextResponse.json(activities);
    } catch (err) {
        console.error('[DEBUG] Unexpected error fetching activities:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
