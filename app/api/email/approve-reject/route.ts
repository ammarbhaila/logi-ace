import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// -----------------------------------------------------------
// HELPER FUNCTIONS (same as order-confirmation)
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

async function sendOrderStatusEmail(
  orderId: string,
  status: 'Processing' | 'Rejected',
  orderData: any,
  cartItems: any[]
) {
  const isApproved = status === 'Processing';
  const placedOn = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const logoPath = path.join(process.cwd(), 'public', 'logo1.png');
  const placedStepPath = path.join(process.cwd(), 'public', 'placed.png');
  const stepPath = path.join(process.cwd(), 'public', 'step02.png');

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

  // Pull data from orderData (DB column names)
  const teamRows = `
    ${buildRow('Sales Executive', orderData.sales_executive)}
    ${buildRow('Sales Executive Email', orderData.sales_executive_email)}
    ${buildRow('Account Opportunity Owner Name', orderData.sales_manager)}
  `;

  const shippingRows = `
    ${buildRow('Customer Company Name', orderData.customer_company_name)}
    ${buildRow('Customer Contact Name', orderData.customer_contact_name)}
    ${buildRow('Customer Contact Email', orderData.customer_contact_email)}
    ${buildRow('Customer Shipping Address', orderData.customer_shipping_address)}
    ${buildRow('City', orderData.city)}
    ${buildRow('State', orderData.state)}
    ${buildRow('Zip', orderData.zip)}
  `;

  const opportunityRows = `
    ${buildRow('Opportunity size (Number of rooms)', orderData.device_opportunity_size_units)}
    ${buildRow('Has the customer determined a project budget?', orderData.technical_resource)}
    ${buildRow('Estimated Budget Amount', orderData.expected_participants)}
    ${buildRow('Revenue Opportunity Size ($ Device Rev)', orderData.revenue_opportunity_size)}
    ${buildRow('Is your customer evaluating any other collaboration solutions?', orderData.in_house_expertise)}
    ${orderData.in_house_expertise === 'Yes' ? buildRow('If yes, provide competitive vendor', orderData.opportunity_link) : ''}
    ${buildRow('Has a Logitech AE been engaged?', orderData.logitech_engaged)}
    ${orderData.logitech_engaged === 'Yes' ? buildRow('Logitech AE Name (If Logitech AE Engaged)', orderData.engaged_ae_name) : ''}
    ${buildRow('Approved Deal Reg', orderData.approved_deal_reg)}
    ${buildRow('Reg #', orderData.reg_number)}
    ${buildRow('Is this a Staged Roll out?', orderData.room_upgrade)}
    ${buildRow('SPS Account #', orderData.crm_account_number)}
    ${buildRow('Desired Demo Delivery Date', orderData.customer_planning_version)}
    ${buildRow('Estimated Closed Date', orderData.estimated_closed_date)}
    ${buildRow('Notes', orderData.notes)}
  `;

  // Status badge config
  const statusBadgeColor = isApproved ? '#2563eb' : '#dc2626';
  const statusBadgeText = isApproved ? 'Processing' : 'Rejected';
  const stepImage = isApproved
    ? 'cid:stepimg'
    : 'cid:placedstep';

  const buildHtml = () => `
    <!doctype html>
    <html>
      <body style="${STYLES.body}">
        <table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
          <tr>
            <td align="center">
              <table width="650" style="${STYLES.container}" cellpadding="0" cellspacing="0">

                <!-- HEADER -->
                <tr><td align="center" style="${STYLES.header} text-align:center;"><img src="cid:logoimg" width="170" alt="Logi-ace" style="display:inline-block;"></td></tr>

                <!-- LABEL & DATE -->
                <tr>
                  <td style="padding:22px 24px;border-bottom:1px solid #eef3f7;">
                    <div style="font-size:20px;font-weight:600;color:#0b1f2a;">
                      ${isApproved
      ? `Approved Order (#${orderId})`
      : `Rejected Order (#${orderId})`}
                    </div>
                    <div style="font-size:12px;color:#6b7b86;margin-top:6px;">Updated On ${placedOn}</div>
                  </td>
                </tr>

               
                ${isApproved ? `
                <tr>
                  <td style="padding:24px 24px 4px;text-align:center;">
                    <img src="${stepImage}" width="500" style="max-width:100%;">
                  </td>
                </tr>
                ` : ''}

                <!-- MESSAGE -->
                <tr>
                  <td style="padding:22px 24px;font-size:14px;color:#334b59;line-height:20px;">
                    Hello ${esc(orderData.sales_executive)},<br><br>
                    ${isApproved
      ? `Your order on <a href="http://localhost:3000" style="font-weight:500;color:${STYLES.linkBlue};text-decoration:none;">www.logi-ace.com</a> has been approved. Once your package ships, you will receive a shipping email with tracking information and a prepaid  Return Label for your order.<br><br>
                           If you have any questions please contact us at <a href="mailto:support@logi-ace.com" style="color:${STYLES.linkBlue};">support@logi-ace.com</a>.`
      : `We regret to inform you that your order request <strong>#${orderId}</strong> on <a href="http://localhost:3000" style="font-weight:700;color:${STYLES.linkBlue};text-decoration:none;">www.logi-ace.com</a> has been <strong>rejected</strong>.<br><br>
                           If you have any questions please contact us at <a href="mailto:support@logi-ace.com" style="color:${STYLES.linkBlue};">support@logi-ace.com</a>.`}
                  </td>
                </tr>

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
  const FROM_NAME = process.env.SMTP_FROM_NAME || "Logi-ACE";
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

  const subject = isApproved
    ? `Order Approved (#${orderId}) | Logi-ACE (CDW)${oemBrackets ? ' ' + oemBrackets : ''}`
    : `Order Rejected (#${orderId}) | Logi-ACE (CDW)${oemBrackets ? ' ' + oemBrackets : ''}`;

  // 3. Define OEM recipients (Only for Approval)
  const recipientsSet = new Set<string>();
  if (orderData.sales_executive_email) {
    recipientsSet.add(orderData.sales_executive_email);
  }

  if (isApproved) {
    const OEM_RECIPIENT_MAP: Record<string, string[]> = {
      logitech: [''],
      poly: [''],
      neat: [''],
    };

    for (const oem of foundOems) {
      if (OEM_RECIPIENT_MAP[oem]) {
        for (const email of OEM_RECIPIENT_MAP[oem]) {
          recipientsSet.add(email);
        }
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
      attachments: [
        { filename: 'logo.png', path: logoPath, cid: 'logoimg' },
        isApproved
          ? { filename: 'step02.png', path: stepPath, cid: 'stepimg' }
          : { filename: 'placed.png', path: placedStepPath, cid: 'placedstep' }
      ],
    });
    console.log(`[DEBUG] ${isApproved ? 'Approval' : 'Rejection'} email sent to ${allRecipients.length} recipients for order #${orderId}`);
  }
}

// -----------------------------------------------------------
// POST HANDLER
// -----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { orderId, status, orderData, cartItems } = payload;

    if (!orderId || !status || !orderData || !cartItems) {
      return NextResponse.json({ error: 'Missing required fields: orderId, status, orderData, cartItems' }, { status: 400 });
    }

    if (status !== 'Processing' && status !== 'Rejected') {
      return NextResponse.json({ error: 'Invalid status. Must be "Processing" or "Rejected"' }, { status: 400 });
    }

    console.log(`[DEBUG] Processing ${status} email for order #${orderId}`);

    // Insert Log Entry for status change
    await supabaseAdmin
      .from('order_logs')
      .insert({
        order_id: orderId,
        action: status === 'Processing' ? 'Order approved' : 'Order rejected',
        performed_by: status === 'Processing' ? orderData.approved_by : orderData.rejected_by,
      });

    await sendOrderStatusEmail(orderId, status as 'Processing' | 'Rejected', orderData, cartItems);

    return NextResponse.json({ success: true, message: `${status} notification email sent` });
  } catch (error: any) {
    console.error('[DEBUG] Approve/Reject Email API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
