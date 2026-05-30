import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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

function buildItemsRows(cartItems: any[]) {
  return cartItems.map((item: any) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eef3f7;border-left:1px solid #eef3f7;">
        <div style="font-weight:400;font-size:14px;color:#1e293b;">${esc(item.product_name || item.product?.product_name)}</div>
        <div style="font-size:11px;color:#64748b;">SKU: ${esc(item.product_sku || item.product?.product_sku || 'N/A')}</div>
      </td>
      <td align="center" style="padding:12px;border-bottom:1px solid #eef3f7;border-right:1px solid #eef3f7;font-weight:700;color:#1e293b;width:100px;">
        ${item.quantity}
      </td>
    </tr>
  `).join('');
}

// -----------------------------------------------------------
// EMAIL SENDING LOGIC
// -----------------------------------------------------------

async function sendShippedEmail(orderId: string, orderData: any, cartItems: any[]) {
  const shippedOn = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const logoPath = path.join(process.cwd(), 'public', 'logo1.png');
  const stepPath = path.join(process.cwd(), 'public', 'step03.png');

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

  const teamRows = `
    ${buildRow('Sales Executive', orderData.sales_executive)}
    ${buildRow('Sales Executive Email', orderData.sales_executive_email)}
    ${buildRow('Sales Manager', orderData.sales_manager)}
    ${buildRow('Sales Manager Email', orderData.sales_manager_email)}
  `;

  const shippingRows = `
    ${buildRow('Company Name', orderData.customer_company_name)}
    ${buildRow('Receiver name', orderData.customer_contact_name)}
    ${buildRow('Receiver Email', orderData.customer_contact_email)}
    ${buildRow('Shipping Address', orderData.customer_shipping_address)}
    ${buildRow('City', orderData.city)}
    ${buildRow('State', orderData.state)}
    ${buildRow('Zip', orderData.zip)}
  `;

  const opportunityRows = `
    ${buildRow('Device Opportunity Size (Units)', orderData.device_opportunity_size_units)}
    ${buildRow('Revenue Opportunity Size ($ Device Rev)', orderData.revenue_opportunity_size)}
    ${(hasLogitech || hasNeat) ? buildRow('How many rooms is the customer looking to upgrade?', orderData.room_upgrade) : ''}
    ${(hasLogitech || hasNeat) ? buildRow('Approx how many participants expected for each room?', orderData.expected_participants) : ''}
    ${hasLogitech ? buildRow('Has a Logitech AE been engaged?', orderData.logitech_engaged) : ''}
    ${hasLogitech ? buildRow('Logitech AE Name (If Logitech AE Engaged)', orderData.engaged_ae_name) : ''}
    ${hasLogitech ? buildRow('Does your customer need technical support for setup?', orderData.technical_support) : ''}
    ${hasNeat ? buildRow('Does your customer need virtual support for setup?', orderData.virtual_support) : ''}
    ${hasPoly || hasLogitech ? buildRow('Approved Deal Reg ?', orderData.approved_deal_reg) : ''}
    ${hasPoly ? buildRow('If so, do you have the in-house expertise to do so?', orderData.in_house_expertise) : ''}
    ${hasPoly ? buildRow('Does your customer need a technical resource to demo this equipment?', orderData.technical_resource) : ''}
    ${hasPoly ? buildRow('What version is your customer planning to use?', orderData.customer_planning_version) : ''}
    ${hasPoly || hasLogitech ? buildRow('reg_no', orderData.reg_number) : ''}
    ${hasNeat || hasLogitech ? buildRow('primary_platform', orderData.platform) : ''}
    <tr>
      <td style="${STYLES.rowLabel}">Opportunity Link (URL)</td>
      <td style="${STYLES.rowValue}"><a href="${orderData.opportunity_link}" style="color:${STYLES.linkBlue};text-decoration:none;">Click for Link</a></td>
    </tr>
    ${buildRow('CRM Account #', orderData.crm_account_number)}
    ${buildRow('Segment', orderData.segment)}
    ${buildRow('Estimated Closed Date', orderData.estimated_closed_date)}
    ${buildRow('Note', orderData.notes)}
  `;

  // Tracking section rows — ID is the clickable link (matches orders/[id]/page.tsx UI)
  const trackingRows = `
    <tr>
      <td style="${STYLES.rowLabel}">Tracking #</td>
      <td style="${STYLES.rowValue}">
        ${orderData.tracking_id
      ? orderData.tracking_link
        ? `<a href="${orderData.tracking_link}" target="_blank" title="${orderData.tracking_link}" style="color:${STYLES.linkBlue};font-weight:700;text-decoration:underline;">${esc(orderData.tracking_id)}</a>`
        : `<span style="color:${STYLES.linkBlue};font-weight:700;">${esc(orderData.tracking_id)}</span>`
      : '<span style="color:#9ca3af;">N/A</span>'}
      </td>
    </tr>
    <tr>
      <td style="${STYLES.rowLabel}">Return Tracking #</td>
      <td style="${STYLES.rowValue}">
        ${orderData.return_tracking_id
      ? orderData.return_tracking_link
        ? `<a href="${orderData.return_tracking_link}" target="_blank" title="${orderData.return_tracking_link}" style="color:${STYLES.linkBlue};font-weight:700;text-decoration:underline;">${esc(orderData.return_tracking_id)}</a>`
        : `<span style="color:${STYLES.linkBlue};font-weight:700;">${esc(orderData.return_tracking_id)}</span>`
      : '<span style="color:#9ca3af;">N/A</span>'}
      </td>
    </tr>
  `;

  // Return Label button (only if return_label_url is present)
  const returnLabelButton = orderData.return_label_url
    ? `<div style="text-align:center;padding:20px 0 10px;">
             <a href="${orderData.return_label_url}"
                style="display:inline-block;background-color:#c65326; color:#ffffff;padding:12px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
               View Return Label
             </a>
           </div>`
    : '';

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
                    <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                      Shipped Order (#${orderId})
                    </div>
                    <div style="font-size:12px;color:#6b7b86;margin-top:6px;">Shipped On ${shippedOn}</div>
                  </td>
                </tr>

                
                <tr>
                  <td style="padding:24px 24px 4px;text-align:center;">
                    <img src="cid:stepimg" width="500" style="max-width:100%;">
                  </td>
                </tr>

                <!-- MESSAGE -->
                <tr>
                  <td style="padding:22px 24px;font-size:14px;color:#334b59;line-height:20px;">
                    Hello ${esc(orderData.sales_executive)},<br><br>
                    Your order on <a href="http://shiuchub.com" style="font-weight:700;color:${STYLES.linkBlue};text-decoration:none;">www.shiuchub.com</a> has been shipped. You can find below Tracking information and Return Label for your order.<br><br>
                  </td>
                </tr>

                <!-- TRACKING DETAILS -->
                ${trackingRows.trim()
      ? `<tr>
                         <td style="padding:14px 24px;">
                           <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                             <tr><td colspan="2" style="${STYLES.sectionTitle}">Tracking Details</td></tr>
                             ${trackingRows}
                           </table>
                         </td>
                       </tr>`
      : ''}
                ${returnLabelButton
      ? `<tr>
                          <td style="padding:14px 24px;">
                            ${returnLabelButton}
                          </td>
                        </tr>`
      : ''}

                <!-- ORDERED PRODUCTS -->
                <tr>
                  <td style="padding:14px 24px;">
                    <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                     
                      <tr>
                        <td style="padding:0;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr style="background:#f5f5f5;">
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

                <!-- TEAM DETAILS -->
                <tr>
                  <td style="padding:14px 24px;">
                    <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                      <tr><td colspan="2" style="${STYLES.sectionTitle}">Team Details</td></tr>
                      ${teamRows}
                    </table>
                  </td>
                </tr>

                <!-- SHIPPING DETAILS -->
                <tr>
                  <td style="padding:14px 24px;">
                    <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                      <tr><td colspan="2" style="${STYLES.sectionTitle}">Shipping Details</td></tr>
                      ${shippingRows}
                    </table>
                  </td>
                </tr>

                <!-- OPPORTUNITY DETAILS -->
                <tr>
                  <td style="padding:14px 24px;">
                    <table width="100%" style="border:1px solid #e7edf2;border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;">
                      <tr><td colspan="2" style="${STYLES.sectionTitle}">Opportunity Details</td></tr>
                      ${opportunityRows}
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

  // SMTP Transport
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

  // 0. Build Subject with OEM Brackets (Separate from Recipient Logic)
  const recognizedOems = ['logitech', 'poly', 'neat'];
  const foundOems = new Set<string>();
  for (const item of cartItems) {
    const oem = (item.product?.oem || item.oem || '').toLowerCase();
    if (recognizedOems.includes(oem)) foundOems.add(oem);
  }

  const displayNames: Record<string, string> = {
    logitech: 'Logitech',
    poly: 'Poly',
    neat: 'Neat'
  };

  const oemBrackets = Array.from(foundOems)
    .map(oem => `(${displayNames[oem] || oem})`)
    .join(' ');

  const subject = `Order Shipped (#${orderId}) | SHI UC HUB${oemBrackets ? ' ' + oemBrackets : ''}`;


  const OEM_RECIPIENT_MAP: Record<string, string[]> = {
    logitech: [''],
    poly: [''],
    neat: [''],
  };

  // 4. Collect all recipients
  const recipientsSet = new Set<string>();
  if (orderData.sales_executive_email) {
    recipientsSet.add(orderData.sales_executive_email);
  }
  for (const oem of foundOems) {
    if (OEM_RECIPIENT_MAP[oem]) {
      for (const email of OEM_RECIPIENT_MAP[oem]) {
        recipientsSet.add(email);
      }
    }
  }

  const allRecipients = Array.from(recipientsSet);

  if (allRecipients.length > 0) {
    await transporter.sendMail({
      from: SENDER,
      // to: allRecipients,
      to: "ammar@works360.com",
      subject,
      html: buildHtml(),
      attachments: [{ filename: 'logo.png', path: logoPath, cid: 'logoimg' }, { filename: 'step03.png', path: stepPath, cid: 'stepimg' }],
    });
    console.log(`[DEBUG] Shipped email sent to ${allRecipients.length} recipients for order #${orderId}`);
  }
}

// -----------------------------------------------------------
// POST HANDLER
// -----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { orderId, orderData, cartItems } = payload;

    if (!orderId || !orderData || !cartItems) {
      return NextResponse.json({ error: 'Missing required fields: orderId, orderData, cartItems' }, { status: 400 });
    }

    console.log(`[DEBUG] Sending shipped email for order #${orderId}`);

    // Insert Log Entry for Shipping
    await supabaseAdmin
      .from('order_logs')
      .insert({
        order_id: orderId,
        action: 'Order shipped',
        performed_by: orderData.shipping_performed_by || orderData.sales_manager_email || 'System',
      });

    await sendShippedEmail(orderId, orderData, cartItems);

    return NextResponse.json({ success: true, message: 'Shipped notification email sent' });
  } catch (error: any) {
    console.error('[DEBUG] Shipped Email API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
