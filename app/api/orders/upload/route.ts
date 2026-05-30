import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
    try {
        // Verify authentication
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

        // Fetch user role to ensure only authorized managers can upload
        const { data: profile } = await supabaseAdmin
            .from('profile')
            .select('userrole')
            .or(`id.eq.${user.id},userId.eq.${user.id}`)
            .single();

        const role = profile?.userrole;
        const isManager = role === 'Admin' || role === 'Shop Manager' || role === 'Super Subscriber';

        if (!isManager) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const orderId = formData.get('orderId') as string;
        const folder = (formData.get('folder') as string) || 'return-labels';

        if (!file || !orderId) {
            return NextResponse.json({ error: 'Missing file or orderId' }, { status: 400 });
        }

        const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
        const filePath = `${orderId}/${folder}/${crypto.randomUUID()}-${safeName}`;

        const buffer = Buffer.from(await file.arrayBuffer());

        const { data, error } = await supabaseAdmin.storage
            .from("order-documents")
            .upload(filePath, buffer, {
                upsert: true,
                contentType: file.type,
            });

        if (error) {
            console.error('[UPLOAD API] Storage error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const { data: publicUrl } = supabaseAdmin.storage
            .from("order-documents")
            .getPublicUrl(data.path);

        return NextResponse.json({ url: publicUrl.publicUrl });
    } catch (error: any) {
        console.error('[UPLOAD API] Unexpected error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
