import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';

// ── Helpers ──────────────────────────────────────────────────
function esc(s: any) {
  if (s === undefined || s === null || s === '') return 'N/A';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STYLES = {
  body: "margin:0;padding:0;background:#f6f8fb;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;",
  container: 'width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:2px solid #e8edf3;border-radius:12px;overflow:hidden;',
  header: 'background:#f5f5f5;padding:15px 24px;text-align:left;color:white;font-size:22px;font-weight:bold;',
  sectionTitle: 'background:#f5f5f5;color:black;padding:12px 16px;font-weight:700;font-size:14px;text-transform:uppercase;',
  rowLabel: 'padding:10px 16px;font-size:13px;font-weight:700;color:#1e3a8a;width:45%;background:#f8fafc;border-bottom:1px solid #e7edf2;border-right:1px solid #e7edf2;',
  rowValue: 'padding:10px 16px;font-size:13px;color:#1a202c;border-bottom:1px solid #e7edf2;',
  footer: 'background:#f5f5f5;color:black;padding:20px;text-align:center;font-size:12px;',
};

function buildRow(label: string, value: any) {
  return `<tr>
    <td style="${STYLES.rowLabel}">${label}</td>
    <td style="${STYLES.rowValue}">${esc(value)}</td>
  </tr>`;
}

interface Product {
  product_name: string;
  sku: string;
  quantity: number;
}

function buildProductRows(products: Product[]) {
  return products.map((p) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eef3f7;border-left:1px solid #eef3f7;">
        <div style="font-weight:700;font-size:14px;color:#1e293b;">${esc(p.product_name)}</div>
        <div style="font-size:11px;color:#64748b;">SKU: ${esc(p.sku)}</div>
      </td>
      <td align="center" style="padding:12px;border-bottom:1px solid #eef3f7;border-right:1px solid #eef3f7;font-weight:700;color:#1e293b;width:100px;">
        ${p.quantity}
      </td>
    </tr>
  `).join('');
}

function buildHtml(data: {
  submitted_by: string;
  tracking_number: string;
  shipment_date: string;
  additional_details: string;
  products: Product[];
  dispatch_id: string;
}) {
  const submittedOn = data.shipment_date
    ? new Date(data.shipment_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const shipmentRows = `
    ${buildRow('Submitted By', data.submitted_by)}
    ${buildRow('Tracking #', data.tracking_number || 'N/A')}
    ${buildRow('Date of Shipment', submittedOn)}
    ${buildRow('Additional Details', data.additional_details || 'N/A')}
  `;

  const productRows = buildProductRows(data.products);

  return `<!doctype html>
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
                <div style="font-size:19px;font-weight:700;color:#0b1f2a;margin-top:15px;">
                  New Device Dispatch Submitted (#${esc(data.dispatch_id)})
                </div>
                <div style="font-size:12px;color:#6b7b86;margin-top:6px;">Submitted On ${submittedOn}</div>
              </td>
            </tr>

            <!-- MESSAGE -->
            <tr>
              <td style="padding:22px 24px;font-size:14px;color:#334b59;line-height:20px;">
                A new device dispatch has been submitted on <a href="http://shiuchub.com" style="font-weight:700;color:#0066ff;text-decoration:none;">www.shiuchub.com</a>.<br><br>
                Please review the shipment and product details below.<br><br>
                If you have any questions, contact us at <a href="mailto:support@shiuchub.com" style="color:#0066ff;">support@shiuchub.com</a>.
              </td>
            </tr>

            <!-- SHIPMENT DETAILS -->
            <tr>
              <td style="padding:14px 24px;">
                <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                  <tr><td colspan="2" style="${STYLES.sectionTitle}">Shipment Details</td></tr>
                  ${shipmentRows}
                </table>
              </td>
            </tr>

            <!-- PRODUCT DETAILS -->
            <tr>
              <td style="padding:14px 24px;">
                <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                  <tr><td colspan="2" style="padding:12px 16px;font-weight:700;font-size:16px;border-bottom:1px solid #e7edf2;">Dispatched Products</td></tr>
                  <tr>
                    <td style="padding:0;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr style="background:#f8fafc;">
                          <td style="padding:12px 16px;font-weight:700;border-bottom:1px solid #eee;font-size:13px;border-right:1px solid #eee;">Product</td>
                          <td align="center" style="padding:12px 16px;font-weight:700;border-bottom:1px solid #eee;font-size:13px;width:100px;">Quantity</td>
                        </tr>
                        ${productRows}
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- DELIVERY ADDRESS -->
            <tr>
              <td style="padding:14px 24px;">
                <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                  <tr><td style="${STYLES.sectionTitle}">Delivery Address</td></tr>
                  <tr><td style="padding:12px 16px;font-size:13px;color:#334b59;line-height:22px;">
                    <strong>Works360 LABS (SHI UC HUB)</strong><br>
                    15345 Anacapa Rd Unit A<br>
                    Victorville, CA 92392<br>
                    (442)255-4006
                  </td></tr>
                </table>
              </td>
            </tr>

            <!-- FOOTER -->
           

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ── POST Handler ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submitted_by, tracking_number, shipment_date, additional_details, products, dispatch_id } = body;

    const logoPath = path.join(process.cwd(), 'public', 'logo1.png');

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
    const subject = `New Dispatch Submitted — #${dispatch_id}`;
    const html = buildHtml({ submitted_by, tracking_number, shipment_date, additional_details, products, dispatch_id });
    const attachments = [{ filename: 'logo.png', path: logoPath, cid: 'logoimg' }];

    // Admin copy
    await transporter.sendMail({ from: SENDER, to: ["ammar@works360.com"], subject, html, attachments });

    // Also notify the person who submitted (if their email is available)
    if (submitted_by && submitted_by.includes('@')) {
      await transporter.sendMail({ from: SENDER, to: submitted_by, subject, html, attachments });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Dispatch Email Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
