import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
    try {
        const payload = await request.json();
        const {
            user_id,
            user_name,
            user_email,
            action,
            description,
            route,
            method,
            status_code,
            is_error,
            error_message,
            metadata
        } = payload;

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        // Skip logging if the user is an Admin
        if (user_id) {
            const { data: profile } = await supabaseAdmin
                .from('profile')
                .select('userrole')
                .eq('id', user_id)
                .single();
            
            if (profile?.userrole === 'Admin') {
                return NextResponse.json({ success: true, message: 'Admin activity not logged' });
            }
        }

        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const ip = request.headers.get('x-forwarded-for') || 'Unknown';

        const { error } = await supabaseAdmin
            .from('user_activities')
            .insert({
                user_id,
                user_name,
                user_email,
                action,
                description,
                route,
                method: method || 'GET',
                status_code: status_code || 200,
                ip_address: ip,
                user_agent: userAgent,
                is_error: is_error || false,
                error_message,
                metadata: metadata || {},
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('[DEBUG] Failed to insert activity log:', error);
            return NextResponse.json({ error: 'Failed to record log' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[DEBUG] Error in /api/logs/capture:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
