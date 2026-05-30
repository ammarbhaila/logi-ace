import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
        }

        // 1. Verify token
        const { data: resetData, error: fetchError } = await supabaseAdmin
            .from('password_reset_tokens')
            .select('user_id, expires_at, used_at')
            .eq('token_hash', token)
            .single();

        if (fetchError || !resetData) {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
        }

        // Check if already used
        if (resetData.used_at) {
            return NextResponse.json({ error: 'This link has already been used' }, { status: 400 });
        }

        // Check expiration
        if (new Date(resetData.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
        }

        // 2. Look up the profile to get userId (auth.users ID) and email
        const { data: profile } = await supabaseAdmin
            .from('profile')
            .select('id, email, "userId"')
            .eq('id', resetData.user_id)
            .single();

        // 3. Hash the new password and save to profile.password as bcrypt fallback
        const hashedPassword = await bcrypt.hash(password, 12);

        const { error: profileUpdateError } = await supabaseAdmin
            .from('profile')
            .update({ password: hashedPassword })
            .eq('id', resetData.user_id);

        if (profileUpdateError) {
            console.error('[DEBUG] Profile password update error:', profileUpdateError);
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        // 4. Try to update Supabase Auth password so normal signInWithPassword works.
        //    Use profile.userId (set during WP migration) first; fall back to profile.id.
        const authUserId: string = profile?.userId ?? resetData.user_id;

        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            authUserId,
            { password: password }
        );

        if (authUpdateError) {
            console.warn('[DEBUG] Supabase Auth update failed — bcrypt hash in profile.password will be the login fallback:', authUpdateError.message);
        } else {
            // Auth is now the source of truth — clear the legacy hash so verify-login
            // doesn't try to re-verify a stale bcrypt hash on the next login attempt.
            await supabaseAdmin
                .from('profile')
                .update({ password: null })
                .eq('id', resetData.user_id);
            console.log('[DEBUG] Supabase Auth password updated and profile.password cleared');
        }

        // 5. Mark token as used
        await supabaseAdmin
            .from('password_reset_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('token_hash', token);

        return NextResponse.json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
        console.error('[DEBUG] Reset Password API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
