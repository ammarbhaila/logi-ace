import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => request.cookies.getAll(),
                    setAll: () => { },
                },
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch profile using supabaseAdmin to bypass RLS
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profile')
            .select('*')
            .or(`id.eq.${user.id},userId.eq.${user.id}`)
            .single();

        if (profileError || !profile) {
            console.error('[DEBUG] /api/auth/me profile fetch error:', profileError);
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        return NextResponse.json(profile);
    } catch (error) {
        console.error('[DEBUG] Unexpected error in GET /api/auth/me:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
