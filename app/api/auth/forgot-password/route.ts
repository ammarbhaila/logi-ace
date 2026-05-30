import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import nodemailer from 'nodemailer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

function esc(s: any) {
  if (s === undefined || s === null || s === "") return "N/A";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLES = {
  body: 'margin:0;padding:0;background:transparent;font-family:\'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif;',
  container: 'width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;',
  header: 'background:#f5f5f5;padding:15px 24px;text-align:center;',
  content: 'padding:22px 24px;color:#334b59;font-size:14px;line-height:20px;',
  button: 'display:inline-block;background-color:#c65326;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:400;font-size:18px;margin:24px 0;',
  footer: 'background:#f5f5f5;color:black;padding:20px;text-align:center;font-size:12px;',
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Check if user exists in profile table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profile')
      .select('id, first_name')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.warn(`[DEBUG] Password reset requested for non-existent email: ${email}`);
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    // 2. Generate token (expires in 1 hour)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // 3. Store token in password_reset_tokens
    const { error: resetError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert([{
        user_id: profile.id,
        token_hash: token, // We'll store the token itself as the hash for simplicity in this flow
        expires_at: expiresAt
      }]);

    if (resetError) {
      console.error('[DEBUG] Error storing reset token:', resetError);
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }

    // 4. Send Email
    const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;
    const logoPath = path.join(process.cwd(), "public", "logo1.png");

    const htmlTemplate = `
        <!doctype html>
        <html>
          <body style="${STYLES.body}">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                  <table width="650" style="${STYLES.container}" cellpadding="0" cellspacing="0">
                    
                    <!-- HEADER -->
                    <tr>
                      <td align="center" style="${STYLES.header}">
                        <img src="cid:logoimg" width="170" alt="SHI UC HUB" style="display:inline-block;">
                      </td>
                    </tr>
                    
                    <!-- TITLE -->
                    <tr>
                      <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
                        <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                          Password Reset Request
                        </div>
                      </td>
                    </tr>
                    
                    <!-- CONTENT -->
                    <tr>
                      <td style="${STYLES.content}">
                        <p style="margin-top:0;color:#0f172a;font-size:16px;font-weight:500;">Hello ${esc(profile.first_name)}, </p>
                        <p>We received a request to reset the password for your SHI UC HUB account. Click the button below to choose a new password:</p>
                        
                        <div style="text-align:center;">
                          <a href="${resetLink}" style="${STYLES.button}">Reset My Password</a>
                        </div>
                        
                        <p>This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
                        
                        <p style="margin-bottom:0;">Thanks,<br>The SHI Team</p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        `;

    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: Number(process.env.SMTP_PORT),
    //   secure: false,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT), // 587
      secure: false,
      requireTLS: true, // 🔥 THIS WAS MISSING
      auth: {
        user: process.env.SMTP_USER?.trim(),
        pass: process.env.SMTP_PASS?.trim(),
      },
    });

    const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const FROM_NAME = process.env.SMTP_FROM_NAME || "SHI UC Hub";
    const SENDER = `"${FROM_NAME}" <${FROM_EMAIL}>`;

    await transporter.sendMail({
      from: SENDER,
      to: email,
      bcc: "ammar@works360.com",
      subject: "Reset your SHI UC HUB Password",
      html: htmlTemplate,
      attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }],
    });

    return NextResponse.json({ success: true, message: 'Reset link sent' });
  } catch (error: any) {
    console.error('[DEBUG] Forgot Password API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
