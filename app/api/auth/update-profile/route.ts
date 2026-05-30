import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
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

        const body = await request.json();
        const { first_name, last_name, username, title, city, state, shi_segment } = body;

        // Update the profile — handles both new users (id=UUID) and migrated users (userId=UUID)
        const { data, error } = await supabaseAdmin
            .from('profile')
            .update({ first_name, last_name, username, title, city, state, shi_segment })
            .or(`id.eq.${user.id},userId.eq.${user.id}`)
            .select()
            .single();

        if (error) {
            console.error('[update-profile] Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, profile: data });
    } catch (err: any) {
        console.error('[update-profile] Unexpected error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
