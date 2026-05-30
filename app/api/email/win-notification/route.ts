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
  body: 'margin:0;padding:0;font-family:\'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif;',
  container: 'width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;',
  header: 'background:#f5f5f5;padding:15px 24px;text-align:left;color:white;font-size:22px;font-weight:bold;',
  sectionTitle: 'background:#f5f5f5;color:black;padding:12px 16px;font-weight:600;font-size:15px;text-transform:uppercase;',
  rowLabel: 'padding:10px 16px;font-size:13px;font-weight:400;color:black;width:45%;border-bottom:1px solid #e7edf2;border-right:1px solid #e7edf2;',
  rowValue: 'padding:10px 16px;font-size:13px;color:#1a202c;border-bottom:1px solid #e7edf2;',
  footer: 'background:#f5f5f5;color:black;padding:20px;text-align:center;font-size:12px;',
  linkBlue: '#0066ff'
};

function buildRow(label: string, value: any) {
  return `
    <tr>
      <td style="${STYLES.rowLabel}">${label}</td>
      <td style="${STYLES.rowValue}">${esc(value)}</td>
    </tr>
  `;
}

// -----------------------------------------------------------
// POST HANDLER
// -----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const winData = await request.json();
    const {
      order_id,
      customer_name,
      customer_contact_email,
      crm_account_number,
      sales_executive,
      num_units,
      total_revenue,
      purchase_type,
      date_of_purchase,
      current_manufacturer,
      feedback,
      sku,
      user_name,
      user_email
    } = winData;

    const reportedOn = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const logoPath = path.join(process.cwd(), "public", "logo1.png");

    const winDetailsRows = `
            ${buildRow("SHI UC HUB Order #", `${order_id}`)}
            ${buildRow("Customer Name", customer_name)}
            ${buildRow("Customer Contact Email", customer_contact_email)}
            ${buildRow("CRM Account #", crm_account_number)}
            ${buildRow("Sales Executive", sales_executive)}
            ${buildRow("Total Deal Revenue", `$${total_revenue}`)}
            ${buildRow("Purchase Type", purchase_type)}
            ${buildRow("Date of Purchase", date_of_purchase)}
            ${buildRow("Competition / Manufacturer", current_manufacturer)}
            ${buildRow("Feedback", feedback)}
            ${buildRow("Reported By", `${user_name} (${user_email})`)}
        `;

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
                    
                    <!-- TITLE & DATE -->
                    <tr>
                      <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
                        <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                         Win Reported Order (#${order_id})
                        </div>
                        <div style="font-size:12px;color:#6b7b86;margin-top:6px;">Reported On ${reportedOn}</div>
                      </td>
                    </tr>

                    <!-- REPORTED PRODUCT -->
                    <tr>
                      <td style="padding:14px 24px;">
                        <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                          <tr><td colspan="2" style="padding:12px 16px;font-weight:600;font-size:18px;border-bottom:1px solid #e7edf2;">Reported Product</td></tr>
                          <tr>
                            <td style="padding:0;">
                              <table width="100%" cellpadding="0" cellspacing="0">
                                <tr style="background:#f5f5f5;">
                                  <td style="padding:12px 16px;font-weight:700;border-bottom:1px solid #eee;font-size:13px;border-right:1px solid #eee;">Product</td>
                                  <td align="center" style="padding:12px 16px;font-weight:700;border-bottom:1px solid #eee;font-size:13px;width:100px;">Quantity</td>
                                </tr>
                                <tr>
                                  <td style="padding:12px;border-bottom:1px solid #eef3f7;border-left:1px solid #eef3f7;">
                                    <div style="font-weight:400;font-size:14px;color:#1e293b;">${esc(winData.product_name || "Device / Product")}</div>
                                    <div style="font-size:11px;color:#64748b;">SKU: ${esc(sku)}</div>
                                  </td>
                                  <td align="center" style="padding:12px;border-bottom:1px solid #eef3f7;border-right:1px solid #eef3f7;font-weight:700;color:#1e293b;width:100px;">
                                    ${num_units}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- WIN DETAILS -->
                    <tr>
                      <td style="padding:14px 24px;">
                        <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                          <tr><td colspan="2" style="${STYLES.sectionTitle}">Win Information</td></tr>
                          ${winDetailsRows}
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
      // to: [user_email, "support@shiuchub.com", "Lillian_miano@shi.com", "rick_almond@shi.com"], // Hardcoded as per project standard for admin notifications
      to: "ammar@works360.com",
      subject: `New Win Reported — ${customer_name}`,
      html: htmlTemplate,
      attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }],
    });

    return NextResponse.json({ success: true, message: 'Win notification email sent' });
  } catch (error: any) {
    console.error('[DEBUG] Win Email API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
