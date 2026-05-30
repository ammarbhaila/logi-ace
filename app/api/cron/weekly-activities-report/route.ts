import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import nodemailer from 'nodemailer';

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET_APIKEY && authHeader !== `Bearer ${process.env.CRON_SECRET_APIKEY}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('[DEBUG] Running Weekly User Activity Report Cron Job...');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const cutoffIso = cutoffDate.toISOString();

        const { data: logs, error: fetchError } = await supabaseAdmin
            .from('user_activities')
            .select('*')
            .lt('created_at', cutoffIso)
            .order('created_at', { ascending: true });

        if (fetchError) {
            console.error('[DEBUG] Failed to fetch activities for report:', fetchError);
            return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
        }

        if (!logs || logs.length === 0) {
            console.log('[DEBUG] No activity logs older than one week to report.');
            return NextResponse.json({ success: true, message: 'No logs to process' });
        }

        console.log(`[DEBUG] Found ${logs.length} logs to export and clean up.`);

        const headers = ['id', 'user_id', 'user_name', 'user_email', 'action', 'description', 'route', 'method', 'status_code', 'ip_address', 'user_agent', 'is_error', 'error_message', 'metadata', 'created_at'];
        const csvRows = [headers.join(',')];

        for (const log of logs) {
            const row = headers.map(header => {
                let val = log[header];
                if (val === null || val === undefined) return '';
                if (typeof val === 'object') val = JSON.stringify(val);
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(row.join(','));
        }
        const csvContent = csvRows.join('\n');

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
        const FROM_NAME = process.env.SMTP_FROM_NAME || "SHI UC Hub System";
        const SENDER = `"${FROM_NAME}" <${FROM_EMAIL}>`;
        
        const adminEmails = ["arman@works360.com", "faizan@works360.com"]; 
        const subject = `Weekly User Activity Report — ${new Date().toLocaleDateString()}`;
        const html = `
            <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
                <h2>Weekly User Activity Report</h2>
                <p>Attached is the user activity log export for the period ending ${cutoffDate.toLocaleDateString()}.</p>
                <p><strong>Summary:</strong></p>
                <ul>
                    <li><strong>Total Records:</strong> ${logs.length}</li>
                    <li><strong>Errors Detected:</strong> ${logs.filter(l => l.is_error).length}</li>
                </ul>
                <p>These records have been automatically removed from the live database to maintain performance.</p>
                <hr />
                <p style="font-size: 12px; color: #777;">This is an automated system notification.</p>
            </div>
        `;

        await transporter.sendMail({
            from: SENDER,
            to: adminEmails,
            subject,
            html,
            attachments: [
                {
                    filename: `user_activities_${new Date().toISOString().split('T')[0]}.csv`,
                    content: csvContent
                }
            ]
        });

        console.log('[DEBUG] Weekly report email sent successfully.');

        const { error: deleteError } = await supabaseAdmin
            .from('user_activities')
            .delete()
            .lt('created_at', cutoffIso);

        if (deleteError) {
            console.error('[DEBUG] Failed to delete old activity logs:', deleteError);
        } else {
            console.log('[DEBUG] Old activity logs successfully deleted.');
        }

        return NextResponse.json({ 
            success: true, 
            message: `Report sent and ${logs.length} records cleaned up.` 
        });

    } catch (error: any) {
        console.error('[DEBUG] Weekly Activities Cron Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
