import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import path from "path";

/* ---------------- SUPABASE ADMIN ---------------- */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ---------------- SMTP ---------------- */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true, // 🔥 THIS WAS MISSING
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
const FROM_NAME = process.env.SMTP_FROM_NAME || "Logi-Ace";

const STYLES = {
  body: 'margin:0;padding:0;font-family:\'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif;',
  container: 'width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;',
  header: 'background:#f5f5f5;padding:15px 24px;text-align:left;color:white;font-size:22px;font-weight:bold;',
  footer: 'background:#f5f5f5;color:black;padding:20px;text-align:center;font-size:12px;',
  linkBlue: '#0066ff'
};

/* ---------------- VERIFY API ---------------- */

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect("/login?invalid=1");
    }

    /* ---------------- FIND USER ---------------- */

    const { data: profile } = await supabaseAdmin
      .from("profile")
      .select("id, email, first_name, last_name")
      .eq("verify_token", token)
      .single();

    if (!profile) {
      return NextResponse.redirect("/login?invalid=1");
    }

    /* ---------------- UPDATE STATUS ---------------- */

    await supabaseAdmin
      .from("profile")
      .update({
        verify_token: null,
        is_verified: true,
        is_approved: true,
        approval_status: "approved",
      })
      .eq("id", profile.id);

    /* ---------------- SEND VERIFIED EMAIL ---------------- */

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <body style="${STYLES.body}">
          <table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
            <tr>
              <td align="center">
                <table width="650" style="${STYLES.container}" cellpadding="0" cellspacing="0">
                  
                  <!-- HEADER -->
                  <tr><td align="center" style="${STYLES.header} text-align:center;"><img src="cid:logoimg" width="170" alt="Logi-Ace" style="display:inline-block;"></td></tr>
                  
                  <!-- TITLE -->
                  <tr>
                    <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
                      <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                        Account Verified
                      </div>
                    </td>
                  </tr>

                  <!-- CONTENT -->
                  <tr>
                    <td style="padding:40px; text-align:left;">
                      <p style="font-size:14px;color:#334b59;line-height:20px;">Hi ${profile.first_name},</p>
                      <p style="font-size:14px;color:#334b59;line-height:20px;">Your account has been <strong>successfully verified and activated</strong>.</p>
                      <p style="font-size:14px;color:#334b59;line-height:20px;">You can now log in and access Logi-Ace.</p>
                      
                      <div style="margin-top:24px; background: #f8fafc; padding: 20px; border-radius: 8px; border:1px solid #e7edf2;">
                        <p style="margin:0;font-size:13px;">Email: <strong>${profile.email}</strong></p>
                      </div>
                      
                      <p style="margin-top:24px;font-size:14px;color:#334b59;">Regards,<br/>The Logi-Ace Team</p>
                    </td>
                  </tr>

                  <!-- FOOTER -->
                 
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: profile.email,                  // ✅ USER
      bcc: "ammar@works360.com",      // ✅ ADMIN / SUPPORT
      subject: "Account Verified | Logi-Ace",
      html: emailHtml,
      attachments: [
        {
          filename: "logo1.png",
          path: path.join(process.cwd(), "public/logo1.png"),
          cid: "logoimg",
        },
      ],
    });

    /* ---------------- REDIRECT ---------------- */

    return NextResponse.redirect(
      new URL("/login?verified=1", req.url)
    );

  } catch (err) {
    console.error("Verify error:", err);
    return NextResponse.redirect("/login?error=1");
  }
}
