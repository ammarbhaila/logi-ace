import { NextRequest, NextResponse } from 'next/server';
import nodemailer from "nodemailer";
import path from "path";

// -----------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------

// Escape helper
function esc(s: any) {
  if (s === undefined || s === null || s === "") return "N/A";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Style Constants
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

// Row Builder
function buildRow(label: string, value: any) {
  return `
    <tr>
      <td style="${STYLES.rowLabel}">${label}</td>
      <td style="${STYLES.rowValue}">${esc(value)}</td>
    </tr>
  `;
}

// Items Table Builder
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

async function sendOrderConfirmationEmail(orderId: string, formData: any, cartItems: any[]) {
  const placedOn = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const logoPath = path.join(process.cwd(), "public", "logo1.png");
  const stepPath = path.join(process.cwd(), "public", "step01.png");

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

  // Shared Data Fragments
  const itemsRows = buildItemsRows(cartItems);

  const teamRows = `
    ${buildRow("Sales Executive", formData.salesExecutive)}
    ${buildRow("Sales Executive Email", formData.salesExecutiveEmail)}
    ${buildRow("Sales Manager", formData.salesManager)}
    ${buildRow("Sales Manager Email", formData.salesManagerEmail)}
  `;

  const shippingRows = `
    ${buildRow("Company Name", formData.customerCompanyName)}
    ${buildRow("Receiver name", formData.customerContactName)}
    ${buildRow("Receiver Email", formData.customerContactEmail)}
    ${buildRow("Shipping Address", formData.customerShippingAddress)}
    ${buildRow("City", formData.city)}
    ${buildRow("State", formData.state)}
    ${buildRow("Zip", formData.zip)}
  `;

  const opportunityRows = `
    ${buildRow("Device Opportunity Size (Units)", formData.deviceOpportunitySizeUnits)}
    ${buildRow("Revenue Opportunity Size ($ Device Rev)", formData.revenueOpportunitySize)}
    ${(hasLogitech || hasNeat) ? buildRow("How many rooms is the customer looking to upgrade?", formData.roomUpgrade) : ''}
    ${(hasLogitech || hasNeat) ? buildRow("Approx how many participants expected for each room?", formData.expectedParticipants) : ''}
    ${hasLogitech ? buildRow("Has a Logitech AE been engaged?", formData.logitechEngaged) : ''}
    ${hasLogitech ? buildRow("Logitech AE Name (If Logitech AE Engaged)", formData.engagedAENAME) : ''}
    ${hasLogitech ? buildRow("Does your customer need technical support for setup?", formData.technicalSupport) : ''}
    ${hasNeat ? buildRow("Does your customer need virtual support for setup?", formData.virtualSupport) : ''}
    ${hasPoly || hasLogitech ? buildRow("Approved Deal Reg ?", formData.approvedDealReg) : ''}
    ${hasPoly ? buildRow("If so, do you have the in-house expertise to do so?", formData.inHouseExpertise) : ''}
    ${hasPoly ? buildRow("Does your customer need a technical resource to demo this equipment?", formData.technicalResource) : ''}
    ${hasPoly ? buildRow("What version is your customer planning to use?", formData.customerPlanningVersion) : ''}
    ${hasPoly || hasLogitech ? buildRow("reg_no", formData.regNumber) : ''}
    ${hasNeat || hasLogitech ? buildRow("primary_platform", formData.platform) : ''}
    <tr>
      <td style="${STYLES.rowLabel}">Opportunity Link (URL)</td>
      <td style="${STYLES.rowValue}"><a href="${formData.opportunityLink}" style="color:${STYLES.linkBlue};text-decoration:none;">Click for Link</a></td>
    </tr>
    ${buildRow("CRM Account #", formData.crmAccount)}
    ${buildRow("Segment", formData.segment)}
    ${buildRow("Estimated Closed Date", formData.estimatedClosedDate)}
    ${buildRow("Note", formData.notes)}
  `;

  // --- USER HTML TEMPLATE BUILDER ---
  const buildUserHtml = () => `
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
                      New SHI UC HUB Order (#${orderId})
                    </div>
                    <div style="font-size:12px;color:#6b7b86;margin-top:6px;">Placed On ${placedOn}</div>
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
                    Hello ${esc(formData.salesExecutive)},<br><br>
                    Thank you for your order from SHI UC HUB. Once your order is approved, you will receive a confirmation email after which it will be shipped to your customer, If you have any questions please contact us at <a href="mailto:support@shiuchub.com" style="color:${STYLES.linkBlue};text-decoration:none;">support@shiuchub.com</a>.<br><br>
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

  // --- ADMIN HTML TEMPLATE BUILDER ---
  const buildAdminHtml = () => `
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
                      New SHI UC HUB Order (#${orderId})
                    </div>
                    <div style="font-size:12px;color:#6b7b86;margin-top:6px;">Placed On ${placedOn}</div>
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
                    Hello Team,<br><br>
                    You have received a new order from <a href="http://shiuchub.com" style="font-weight:500;color:${STYLES.linkBlue};text-decoration:none;">shiuchub.com</a>. Please click below to Review and Approve/Reject.
                    <div style="text-align:center;padding:20px 0;">
                      <a href="${process.env.NEXT_PUBLIC_SITE_URL}/orders/${orderId}" style="display:inline-block;background-color:#c65326;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;font-weight:500;font-size:18px;">View Order</a>
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

  // --- SMTP TRANSPORT ---
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false, // upgrades later with STARTTLS if needed (user had secure: 'true' in snippet but previously 'false'. keeping env driven or 'false' for typical SMTP relay, snippets often vary). keeping existing working config
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

  const subject = `New Order (#${orderId}) | SHI UC HUB${oemBrackets ? ' ' + oemBrackets : ''}`;

  // 1. Send USER email
  // User template -> Sales Executive + Support

  await transporter.sendMail({
    from: SENDER,
    //to: [formData.salesExecutiveEmail],
    to: "ammar@works360.com",
    //cc: "support@shiuchub.com",
    subject,
    html: buildUserHtml(),
    attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }, { filename: "step01.png", path: stepPath, cid: "stepimg" }],
  });


  // 2. Send ADMIN email
  // Admin template -> Support (To) + Ammar (Bcc)
  await transporter.sendMail({
    from: SENDER,
    //bcc: "arman@works360.com",
    to: "ammar@works360.com",
    subject,
    html: buildAdminHtml(),
    attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }, { filename: "step01.png", path: stepPath, cid: "stepimg" }],
  });
  console.log('[DEBUG] Admin email sent successfully');

  // 3. Send same admin email to specific OEM recipients
  // ─────────────────────────────────────────────────────────────────
  // Add or remove emails below to control who gets notified per OEM.
  // ─────────────────────────────────────────────────────────────────

  // 3. Send same admin email to specific OEM recipients (DISABLED)
  /*
  const OEM_RECIPIENT_MAP: Record<string, string[]> = {
    // logitech: [''],
    // poly: [''],
    // neat: [''],
  }

  for (const oem of foundOems) {
    for (const recipientEmail of OEM_RECIPIENT_MAP[oem]) {
      try {
        await transporter.sendMail({
          from: SENDER,
          to: recipientEmail,
          subject,
          html: buildAdminHtml(),
          attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }, { filename: "step01.png", path: stepPath, cid: "stepimg" }],
        });
        console.log(`[DEBUG] OEM email sent to ${recipientEmail} for ${oem} order`);
      } catch (err) {
        console.error(`[DEBUG] Failed to send OEM email to ${recipientEmail}:`, err);
      }
    }
  }
  */
}

// -----------------------------------------------------------
// POST HANDLER
// -----------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { orderId, userEmail, formData, cartItems } = payload;

    if (!orderId || !formData || !cartItems) {
      return NextResponse.json({ error: 'Missing required order details' }, { status: 400 });
    }

    console.log('[DEBUG] Processing Order Email for ID:', orderId);

    // Call the separated email logic
    await sendOrderConfirmationEmail(orderId, formData, cartItems);

    return NextResponse.json({ success: true, message: 'Emails processed successfully' });
  } catch (error: any) {
    console.error('[DEBUG] Email API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
