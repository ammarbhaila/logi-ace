import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import path from "path";

/* ---------------- SUPABASE ---------------- */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

/* ---------------- DOMAIN LOGIC ---------------- */

function isAutoDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return ["works360.com", "cdwg.com", "cdw.com", "logitech.com"].includes(domain);
}

/* ---------------- REGISTER ---------------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      username,
      first_name,
      last_name,
      email,
      password,
      shi_segment,
    } = body;

    const autoDomain = isAutoDomain(email);
    const verifyToken = crypto.randomBytes(32).toString("hex");

    /* ---------------- AUTH ---------------- */

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !authData.user) {
      return NextResponse.json({ error: error?.message }, { status: 400 });
    }

    const userId = authData.user.id;

    /* ---------------- PROFILE ---------------- */

    const { error: profileError } = await supabase.from("profile").insert({
      id: userId,
      username: username || email,
      first_name,
      last_name,
      email,
      shi_segment,
      verify_token: verifyToken,
      is_verified: false,
      is_approved: autoDomain ? true : false,
      approval_status: autoDomain ? "approved" : "pending",
      userrole: "Subscriber",
      registered_at: new Date().toISOString(),
      approved_at: null,
      login_count: 0,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    /* ---------------- EMAILS ---------------- */

    const logoPath = path.join(process.cwd(), "public", "logo1.png");

    // 🔹 AUTO DOMAIN → ACTIVATE EMAIL
    if (autoDomain) {
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: email,
        cc: "ammar@works360.com",
        subject: "Welcome | Logi-Ace",
        attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }],
        html: `
      <html>
        <body style="margin:0;padding:0;background:#f6f8fb;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table style="width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;border-collapse:collapse;">
            <tr><td align="center" style="background:#f5f5f5;padding:15px 24px;text-align:center;"><img src="cid:logoimg" width="170" alt="Logi-Ace" style="display:inline-block;" /></td></tr>
            <tr>
              <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
                <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                  Activate Account | Logi-Ace
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:20px;font-size:15px;line-height:26px;">
                <p>Hi ${first_name},</p>

                <p>
                  Thank you for registering with <strong>Logi-Ace</strong>.
                </p>

                <p>
                  Please click the button below to verify your email
                  and activate your account.
                </p>

                <p style="text-align:center;margin:30px 0;">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL}/api/verify?token=${verifyToken}"
                     style="background:#c65326;color:#fff;
                     padding:14px 20px;text-decoration:none;
                     border-radius:4px;font-size:16px;">
                    Activate Account
                  </a>
                </p>

                <p>Regards,<br/>Logi-Ace Team</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
      });
    }


    // 🔹 NON DOMAIN → USER + ADMIN EMAIL
    if (!autoDomain) {
      // Admin
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: "ammar@works360.com",
        subject: "New User Pending Approval | Logi-Ace",
        attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }],
        html: `
    <html>
      <body style="margin:0;padding:0;background:#f6f8fb;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table style="width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;border-collapse:collapse;">
          <tr><td align="center" style="background:#f5f5f5;padding:15px 24px;text-align:center;"><img src="cid:logoimg" width="170" alt="Logi-Ace" style="display:inline-block;" /></td></tr>
          <tr>
            <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
              <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                New User Pending Approval
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px;font-size:15px;line-height:26px;">
              <p>A new user has registered and requires approval.</p>

              <p><strong>Email:</strong> ${email}</p>

              <p style="text-align:center;margin:30px 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/users"
                   style="background:#c65326;color:#fff;
                   padding:14px 20px;text-decoration:none;
                   border-radius:4px;font-size:16px;">
                  Review Pending Users
                </a>
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
      });


      // User
      await transporter.sendMail({
        from: `"Logi-Ace" <${process.env.SMTP_FROM_EMAIL}>`,
        to: email,
        cc: "ammar@works360.com",
        subject: "Registration Pending Approval | Logi-Ace",
        attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }],
        html: `
    <html>
      <body style="margin:0;padding:0;background:#f6f8fb;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table style="width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;border-collapse:collapse;">
          <tr><td align="center" style="background:#f5f5f5;padding:15px 24px;text-align:center;"><img src="cid:logoimg" width="170" alt="Logi-Ace" style="display:inline-block;" /></td></tr>
          <tr>
            <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
              <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                Registration Received | Logi-Ace
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px;font-size:15px;line-height:26px;">
              <p>Hi ${first_name},</p>

              <p>
                Thank you for registering with <strong>Logi-Ace</strong>.
              </p>

              <p>
                Your account is currently <strong>pending approval</strong>
                by our team.
              </p>

              <p>
                You will receive an email once your account is approved.
              </p>

              <p>Regards,<br/>Logi-Ace Team</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
      });

    }

    return NextResponse.json({
      success: true,
      message: autoDomain
        ? "Activation email sent."
        : "Registration pending approval.",
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
