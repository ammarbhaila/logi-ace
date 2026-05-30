import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export type AuthResult =
    | { user: any; profile: any; error: null }
    | { user: null; profile: null; error: NextResponse };

const ADMIN_ROLES = ['Admin', 'Shop Manager', 'Super Subscriber'];

/**
 * Verifies the request has a valid Supabase session and the user is approved.
 * Use for any route that any logged-in user can access.
 */
export async function withAuth(request: NextRequest): Promise<AuthResult> {
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
        return {
            user: null,
            profile: null,
            error: NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 }),
        };
    }

    const { data: profile } = await supabaseAdmin
        .from('profile')
        .select('userrole, is_approved, email, first_name')
        .or(`id.eq.${user.id},userId.eq.${user.id}`)
        .single();

    if (!profile) {
        return {
            user: null,
            profile: null,
            error: NextResponse.json({ error: 'Unauthorized: Profile not found' }, { status: 401 }),
        };
    }

    if (!profile.is_approved) {
        return {
            user: null,
            profile: null,
            error: NextResponse.json({ error: 'Forbidden: Account not yet approved' }, { status: 403 }),
        };
    }

    return { user, profile, error: null };
}

/**
 * Verifies the request has a valid Supabase session AND the user has an admin-level role.
 * Use for admin-only routes (Admin, Shop Manager, Super Subscriber).
 */
export async function withAdminAuth(request: NextRequest): Promise<AuthResult> {
    const auth = await withAuth(request);
    if (auth.error) return auth;

    const isAdmin = ADMIN_ROLES.includes(auth.profile.userrole);
    if (!isAdmin) {
        return {
            user: null,
            profile: null,
            error: NextResponse.json(
                { error: 'Forbidden: Admin access required' },
                { status: 403 }
            ),
        };
    }

    return auth;
}
