import { NextRequest, NextResponse } from 'next/server';
import nodemailer from "nodemailer";
import path from "path";

// -----------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------

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
  body: 'margin:0;padding:0;background:#f6f8fb;font-family:\'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif;',
  container: 'width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;',
  header: 'background:#f5f5f5;padding:15px 24px;text-align:left;color:white;font-size:22px;font-weight:bold;',
  sectionTitle: 'background:#f5f5f5;color:black;padding:12px 16px;font-weight:700;font-size:16px;text-transform:uppercase;',
  rowLabel: 'padding:10px 16px;font-size:13px;font-weight:500;color:black;width:45%;background:#f8fafc;border-bottom:1px solid #e7edf2;border-right:1px solid #e7edf2;',
  rowValue: 'padding:10px 16px;font-size:13px;color:#1a202c;border-bottom:1px solid #e7edf2;',
  footer: 'background:#f5f5f5;color:black;padding:20px;text-align:center;font-size:12px;',
  linkBlue: '#0066ff'
};

// -----------------------------------------------------------
// POST HANDLER
// -----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const eolData = await request.json();
    const { submitted_by, items } = eolData;

    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const logoPath = path.join(process.cwd(), "public", "logo1.png");

    // Build items table rows
    const itemsHtml = items.map((item: any, idx: number) => `
            <tr>
              <td colspan="2" style="background:#f8fafc;padding:8px 16px;font-weight:bold;color:black;border-bottom:1px solid #e7edf2;">Device #${idx + 1}</td>
            </tr>
            <tr>
              <td style="${STYLES.rowLabel}">Product Name</td>
              <td style="${STYLES.rowValue}">${esc(item.product_name)}</td>
            </tr>
            <tr>
              <td style="${STYLES.rowLabel}">SKU#</td>
              <td style="${STYLES.rowValue}">${esc(item.sku)}</td>
            </tr>
            <tr>
              <td style="${STYLES.rowLabel}">Quantity</td>
              <td style="${STYLES.rowValue}">${esc(item.quantity)}</td>
            </tr>
            <tr>
              <td style="${STYLES.rowLabel}">Shipping Address</td>
              <td style="${STYLES.rowValue}">${esc(item.address)}</td>
            </tr>
            ${item.additional_note ? `
            <tr>
              <td style="${STYLES.rowLabel}">Additional Note</td>
              <td style="${STYLES.rowValue}">${esc(item.additional_note)}</td>
            </tr>
            ` : ''}
        `).join('');

    const htmlTemplate = `
        <!doctype html>
        <html>
          <body style="${STYLES.body}">
            <table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
              <tr>
                <td align="center">
                  <table width="650" style="${STYLES.container}" cellpadding="0" cellspacing="0">
                    
                    <!-- HEADER -->
                    <tr><td align="center" style="${STYLES.header} text-align:center;"><img src="cid:logoimg" width="170" alt="SHI UC HUB" style="display:inline-block;"></td></tr>
                    
                    <!-- LOGO & DATE -->
                    <tr>
                      <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
                        <div style="font-size:20px;font-weight:700;color:#0b1f2a;">
                          New EOL Device Request Submitted
                        </div>
                        <div style="font-size:12px;color:#6b7b86;margin-top:6px;">Submitted On ${dateStr}</div>
                      </td>
                    </tr>

                    <!-- SUBMITTED BY INFO -->
                    <tr>
                      <td style="padding:14px 24px;">
                        <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                          <tr><td colspan="2" style="${STYLES.sectionTitle}">Submitted By</td></tr>
                          <tr>
                            <td style="${STYLES.rowLabel}">Email</td>
                            <td style="${STYLES.rowValue}">${esc(submitted_by)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- DEVICE LIST -->
                    <tr>
                      <td style="padding:14px 24px;">
                        <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                          <tr><td colspan="2" style="${STYLES.sectionTitle}">Requested Devices</td></tr>
                          ${itemsHtml}
                        </table>
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

    await transporter.sendMail({
      from: SENDER,
      to: ["ammar@works360.com"], // hardcoded admin recipient
      subject: `New EOL Request from ${submitted_by}`,
      html: htmlTemplate,
      attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }],
    });

    return NextResponse.json({ success: true, message: 'EOL notification email sent' });
  } catch (error: any) {
    console.error('[DEBUG] EOL Email API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
