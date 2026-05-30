import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';

// -----------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------

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
  container: 'width:100%;max-width:650px;margin:24px auto;background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;',
  header: 'background:#f5f5f5;padding:15px 24px;text-align:left;color:white;font-size:22px;font-weight:bold;',
  sectionTitle: 'background:#f5f5f5;color:black;padding:12px 16px;font-weight:500;font-size:15px;text-transform:uppercase;',
  rowLabel: 'padding:10px 16px;font-size:12px;font-weight:400;color:black;width:45%;background:#f8fafc;border-bottom:1px solid #e7edf2;border-right:1px solid #e7edf2;',
  rowValue: 'padding:10px 16px;font-size:12px;color:#1a202c;border-bottom:1px solid #e7edf2;',
  footer: 'background:#f5f5f5;color:black;padding:20px;text-align:center;font-size:12px;',
  linkBlue: '#1a202c',
};

function buildRow(label: string, value: any) {
  return `
    <tr>
      <td style="${STYLES.rowLabel}">${label}</td>
      <td style="${STYLES.rowValue}">${esc(value)}</td>
    </tr>
  `;
}

function buildItemsRows(cartItems: any[]) {
  return cartItems.map((item: any) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eef3f7;border-left:1px solid #eef3f7;">
        <div style="font-weight:400;font-size:14px;color:#1e293b;">${esc(item.product_name || item.product?.product_name)}</div>
        <div style="font-size:11px;color:#64748b;">SKU: ${esc(item.product_sku || item.product?.product_sku || 'N/A')}</div>
      </td>
      <td align="center" style="padding:12px;border-bottom:1px solid #eef3f7;border-right:1px solid #eef3f7;font-weight:400;color:#1e293b;width:100px;">
        ${item.quantity}
      </td>
    </tr>
  `).join('');
}

// -----------------------------------------------------------
// EMAIL SENDING LOGIC
// -----------------------------------------------------------

async function sendReturnReminderEmail(orderId: string, orderData: any, cartItems: any[], shippedDate: string) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const logoPath = path.join(process.cwd(), 'public', 'logo1.png');

  // Manufacturer Detection
  const manufacturers = new Set(cartItems.map((item: any) =>
    item.product?.manufacturer?.toLowerCase() ||
    item.product?.oem?.toLowerCase() ||
    item.oem?.toLowerCase() ||
    item.manufacturer?.toLowerCase()
  ));
  const hasPoly = manufacturers.has('poly');
  const hasLogitech = manufacturers.has('logitech') || manufacturers.has('logi');
  const hasNeat = manufacturers.has('neat');

  const itemsRows = buildItemsRows(cartItems);

  const summaryRows = `
    ${buildRow('Sales Executive Name', orderData.sales_executive)}
    ${buildRow('Sales Executive Email', orderData.sales_executive_email)}
    ${buildRow('Sales Manager Name', orderData.sales_manager)}
    ${buildRow('Customer Company Name', orderData.customer_company_name)}
    ${buildRow('Customer Email', orderData.customer_contact_email)}
    ${buildRow('Contact Name', orderData.customer_contact_name)}
    ${buildRow('Shipped Date', shippedDate)}
    <tr>
      <td style="${STYLES.rowLabel}">Return Tracking</td>
      <td style="${STYLES.rowValue}">
        ${(() => {
      if (!orderData.return_tracking_id) return '<span style="color:#9ca3af;">N/A</span>';
      const ids = String(orderData.return_tracking_id).split(/\s+/).filter(Boolean);
      const formattedIds = ids.map(id => esc(id)).join('<br />');
      if (orderData.return_tracking_link) {
        return `<a href="${orderData.return_tracking_link}" target="_blank" style="color:${STYLES.linkBlue};font-weight:400;text-decoration:underline;">${formattedIds}</a>`;
      }
      return `<span style="color:${STYLES.linkBlue};font-weight:400;">${formattedIds}</span>`;
    })()}
      </td>
    </tr>
  `;

  const buildHtml = () => `
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
                    <div style="font-size:20px;font-weight:500;color:#000000;">
                      Return Reminder for Order #${orderId}
                    </div>
                    <div style="font-size:12px;color:#6b7b86;margin-top:6px;">Placed On ${currentDate}</div>
                  </td>
                </tr>

                <!-- MESSAGE -->
                <tr>
                  <td style="padding:22px 24px;font-size:14px;color:#334b59;line-height:20px;">
                    
                    Thank you for using SHI UC HUB! We hope your experience was very positive.<br><br>
                    Your order for ${esc(orderData.customer_company_name)} is now due for return, use the provided return label to ship back the devices & accessories.<br><br>
                    <div style="text-align:center;padding:20px 0;">
                      ${orderData.return_label_url
      ? `<a href="${orderData.return_label_url}" style="display:inline-block;background-color:#c65326;color:#ffffff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:400;font-size:16px;">Download Return Label</a>`
      : ''}
                    </div>
                  </td>
                </tr>

                <!-- ORDERED PRODUCTS -->
                <tr>
                  <td style="padding:14px 24px;">
                    <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                      
                      <tr>
                        <td style="padding:0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr style="background:#f8fafc;">
                              <td style="padding:12px 16px;font-weight:700;border-bottom:1px solid #eee;font-size:13px;border-right:1px solid #eee;">Product</td>
                              <td align="center" style="padding:12px 16px;font-weight:700;border-bottom:1px solid #eee;font-size:13px;width:100px;">Quantity</td>
                            </tr>
                            ${itemsRows}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- SUMMARY DETAILS -->
                <tr>
                  <td style="padding:14px 24px;">
                    <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                      <tr><td colspan="2" style="${STYLES.sectionTitle}">Order Details</td></tr>
                      ${summaryRows}
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // --- SMTP TRANSPORT ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const subject = `Return Reminder — Order #${orderId}`;
  const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const FROM_NAME = process.env.SMTP_FROM_NAME || "SHI UC Hub";
  const SENDER = `"${FROM_NAME}" <${FROM_EMAIL}>`;

  // Determine recipient
  let sendTo = orderData.sales_executive_email;
  if (!sendTo) {
    console.error(`[DEBUG] No sales executive email found for order ${orderId}. Falling back to support.`);
    sendTo = FROM_EMAIL;
  }

  // Send Email ONLY to Sales Exec
  await transporter.sendMail({
    from: SENDER,
    // to: [sendTo, "support@works360.com"],
    to: "ammar@works360.com",
    subject,
    html: buildHtml(),
    attachments: [{ filename: 'logo.png', path: logoPath, cid: 'logoimg' }],
  });

  console.log(`[DEBUG] Return reminder email sent for order #${orderId} to ${sendTo}`);
}

// -----------------------------------------------------------
// POST HANDLER
// -----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    let { orderId, orderData, cartItems, shippedDate } = payload;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing required field: orderId' }, { status: 400 });
    }

    const { supabaseAdmin } = await import('@/lib/supabaseAdmin');

    // Fetch orderData if missing
    if (!orderData) {
      const { data: fetchedOrder, error: orderError } = await supabaseAdmin
        .from('checkout_requests')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError || !fetchedOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      orderData = fetchedOrder;
    }

    // Fetch cartItems if missing
    if (!cartItems || cartItems.length === 0) {
      const { data: fetchedItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*, product:inventory_products(*)')
        .eq('order_id', orderId);

      if (itemsError) {
        return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
      }
      cartItems = fetchedItems || [];
    }

    // Determine shippedDate if missing
    if (!shippedDate && orderData.shipped_at) {
      shippedDate = new Date(orderData.shipped_at).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
    }

    console.log(`[DEBUG] Processing Return Reminder email for order #${orderId}`);

    await sendReturnReminderEmail(orderId, orderData, cartItems, shippedDate || 'N/A');

    return NextResponse.json({ success: true, message: 'Return Reminder email sent' });
  } catch (error: any) {
    console.error('[DEBUG] Return Reminder Email API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
