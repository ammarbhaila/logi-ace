import nodemailer from "nodemailer";
import path from "path";

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
const FROM_NAME = process.env.SMTP_FROM_NAME || "Logi-ACE (CDW)";
const SENDER = `"${FROM_NAME}" <${FROM_EMAIL}>`;
const ADMIN_EMAIL = ["ammar@works360.com", "arman@works360.com"];

export async function sendWaitlistSubscribedEmail(data: {
  email: string;
  firstName?: string;
  productName: string;
  companyName?: string;
}) {
  const { email, productName, companyName } = data;
  const logoPath = path.join(process.cwd(), "public", "logo1.png");

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f6f8fb;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
          <tr>
            <td align="center">
              <table width="650" style="background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
                <!-- HEADER -->
                <tr><td align="center" style="background:#f5f5f5;padding:15px 24px;text-align:center;"><img src="cid:logoimg" width="170" alt="Logi-ACE" style="display:inline-block;"></td></tr>
                
                <!-- CONTENT -->
                <tr>
                  <td style="padding:40px; text-align:left;">
                    <h2 style="color: #0b1f2a; margin-bottom: 24px;">Product Subscribed</h2>
                    <p style="font-size:14px;color:#334b59;line-height:20px;">Hi <span style="color: #0066ff; text-decoration: underline;">${email}</span>,</p>
                    <p style="font-size:14px;color:#334b59;line-height:20px;">You have subscribed to an out of stock device on Logi-ACE (CDW). An email notification will be sent once the product is back in stock.</p>
                    
                    <div style="margin-top:24px; background: #f8fafc; padding: 20px; border-radius: 8px; border:1px solid #e7edf2;">
                      <p style="margin:0 0 10px 0;font-size:13px;">Product Name: <strong>${productName}</strong></p>
                      <p style="margin:0;font-size:13px;">Customer Company Name: <strong>${companyName || "N/A"}</strong></p>
                    </div>
                    
                    <p style="margin-top:24px;font-size:14px;color:#334b59;">Thank you for using Logi-ACE (CDW)</p>
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

  return transporter.sendMail({
    from: SENDER,
    to: email,
    cc: ADMIN_EMAIL,
    subject: `Product Subscribed: ${productName}`,
    html,
    attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }],
  });
}

export async function sendBackInStockEmail(data: {

  email: string;
  firstName?: string;
  productName: string;
  productId: string;
}) {
  const { email, firstName, productName, productId } = data;
  const productUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/create-demo-kits/${productId}`;
  const logoPath = path.join(process.cwd(), "public", "logo1.png");

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f6f8fb;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 0;">
          <tr>
            <td align="center">
              <table width="650" style="background:#ffffff;border:1px solid #e8edf3;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
                <!-- HEADER -->
                <tr><td align="center" style="background:#f5f5f5;padding:15px 24px;text-align:center;"><img src="cid:logoimg" width="170" alt="Logi-ACE" style="display:inline-block;"></td></tr>
                
                <!-- CONTENT -->
                <tr>
                  <td style="padding:40px; text-align:left;">
                    <h2 style="color: #0b1f2a; margin-bottom: 24px;">Product back in stock</h2>
                    <p style="font-size:14px;color:#334b59;line-height:20px;">Hello ${firstName || email},</p>
                    <p style="font-size:14px;color:#334b59;line-height:20px;">Your subscribed product <strong>${productName}</strong> is now back in stock!</p>
                    <p style="font-size:14px;color:#334b59;line-height:20px;">You can now add this product directly to your cart using the button below:</p>
                    
                    <div style="text-align:center;padding:30px 0;">
                      <a href="${productUrl}" style="display:inline-block;background-color:#0066ff;color:#ffffff;padding:12px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
                        View Product
                      </a>
                    </div>
                    
                    <p style="font-size:14px;color:#334b59;">Thank you for using Logi-ACE (CDW).</p>
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

  return transporter.sendMail({
    from: SENDER,
    to: email,
    cc: ["ammar@works360.com", "arman@works360.com"],
    subject: `Product back in stock: ${productName}`,
    html,
    attachments: [{ filename: "logo.png", path: logoPath, cid: "logoimg" }],
  });
}
