import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import path from "path";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { withAdminAuth } from '@/lib/apiAuth';

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
const FROM_NAME = process.env.SMTP_FROM_NAME || "SHI UC Hub";
const SENDER = `"${FROM_NAME}" <${FROM_EMAIL}>`;

const STYLES = {
  body: 'margin:0;padding:0;font-family:\'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif;',
  container: 'width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;',
  header: 'background:#f5f5f5;padding:15px 24px;text-align:left;color:white;font-size:22px;font-weight:bold;',
  footer: 'background:#f5f5f5;color:black;padding:20px;text-align:center;font-size:12px;',
  linkBlue: '#0066ff'
};

export async function POST(req: NextRequest) {
  const auth = await withAdminAuth(req);
  if (auth.error) return auth.error;

  try {
    const { userId, userrole, is_approved } = await req.json();
    // 👆 NOTE: we now use is_approved

    /* ---------------- FETCH USER ---------------- */

    const { data: user, error } = await supabaseAdmin
      .from("profile")
      .select("email, first_name, approval_status")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    /* ---------------- UPDATE PROFILE ---------------- */

    const updateData: any = {};
    if (userrole !== undefined) updateData.userrole = userrole;

    if (is_approved === true) {
      updateData.is_approved = true;
      updateData.approval_status = "approved";
      updateData.approved_at = new Date().toISOString();
    }

    if (is_approved === false) {
      updateData.is_approved = false;
      updateData.approval_status = "rejected";
    }

    const { error: updateError } = await supabaseAdmin
      .from("profile")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    /* ---------------- EMAILS ---------------- */

    // ✅ APPROVAL EMAIL
    if (is_approved === true && user.approval_status !== "approved") {
      const approveHtml = `
        <!doctype html>
        <html>
          <body style="${STYLES.body}">
            <table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
              <tr>
                <td align="center">
                  <table width="650" style="${STYLES.container}" cellpadding="0" cellspacing="0">
                    
                    <!-- HEADER -->
                    <tr><td align="center" style="${STYLES.header} text-align:center;"><img src="cid:logoimg" width="170" alt="SHI UC HUB" style="display:inline-block;"></td></tr>
                    
                    <!-- TITLE -->
                    <tr>
                      <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
                        <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                          Account Approved
                        </div>
                      </td>
                    </tr>

                    <!-- CONTENT -->
                    <tr>
                      <td style="padding:40px; text-align:left;">
                        <p style="font-size:14px;color:#334b59;line-height:20px;">Hi ${user.first_name},</p>
                        <p style="font-size:14px;color:#334b59;line-height:20px;">Your account has been <strong>approved</strong>.</p>
                        
                        <div style="text-align:center;padding:30px 0;">
                          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login" style="display:inline-block;background-color:#c65326;color:#ffffff;padding:12px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
                            Login to SHI UC Hub
                          </a>
                        </div>
                        
                        <p style="font-size:14px;color:#334b59;">Regards,<br/>SHI UC Hub Team</p>
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
        from: SENDER,
        to: user.email,
        bcc: ["ammar@works360.com"],
        subject: "Your Account Has Been Approved | SHI UC Hub",
        html: approveHtml,
        attachments: [
          {
            filename: "logo1.png",
            path: path.join(process.cwd(), "public/logo1.png"),
            cid: "logoimg",
          },
        ],
      });
    }


    // ❌ REJECTION EMAIL (send only once)
    if (is_approved === false && user.approval_status !== "rejected") {
      const rejectHtml = `
        <!doctype html>
        <html>
          <body style="${STYLES.body}">
            <table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
              <tr>
                <td align="center">
                  <table width="650" style="${STYLES.container}" cellpadding="0" cellspacing="0">
                    
                    <!-- HEADER -->
                    <tr><td align="center" style="${STYLES.header} text-align:center;"><img src="cid:logoimg" width="170" alt="SHI UC HUB" style="display:inline-block;"></td></tr>
                    
                    <!-- TITLE -->
                    <tr>
                      <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
                        <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                          Account Update
                        </div>
                      </td>
                    </tr>

                    <!-- CONTENT -->
                    <tr>
                      <td style="padding:40px; text-align:left;">
                        <p style="font-size:14px;color:#334b59;line-height:20px;">Hi ${user.first_name},</p>
                        <p style="font-size:14px;color:#334b59;line-height:20px;">Your account request was <strong>not approved</strong>.</p>
                        <p style="font-size:14px;color:#334b59;line-height:20px;">If you believe this is a mistake, please contact support.</p>
                        <p style="margin-top:24px;font-size:14px;color:#334b59;">Regards,<br/>SHI UC Hub Team</p>
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
        from: SENDER,
        to: user.email,
        bcc: ["ammar@works360.com"],
        subject: "Account Registration Update | SHI UC Hub",
        html: rejectHtml,
        attachments: [
          {
            filename: "logo1.png",
            path: path.join(process.cwd(), "public/logo1.png"),
            cid: "logoimg",
          },
        ],
      });
    }


    // ✅ LOG THE ACTION
    const { error: logError } = await supabaseAdmin
      .from("user_logs")
      .insert({
        user_id: userId,
        user_email: user.email,
        action: is_approved === true ? "User Approved" : is_approved === false ? "User Rejected" : "User Role Updated",
        performed_by: auth.profile.email || "System",
        details: {
          new_role: userrole,
          is_approved: is_approved,
          user_name: `${user.first_name}`
        }
      });

    if (logError) {
      console.error("[DEBUG] Failed to insert user log:", logError);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Admin update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
