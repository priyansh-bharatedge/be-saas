import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpUser = process.env.SMTP_USER || "testerbemain@gmail.com";
const smtpPass = process.env.SMTP_PASS || "qyquibvuwwefczsy";
const smtpFrom = process.env.SMTP_FROM || `"BharatEdge Services" <${smtpUser}>`;

// Configure reusable Nodemailer transporter with connection pooling
export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  pool: true,
  maxConnections: 3,
});

/**
 * Generates an enterprise-branded HTML template matching BharatEdge aesthetic
 */
function generateOtpEmailHtml(otpCode: string, recipientName?: string): string {
  const name = recipientName || "Enterprise Member";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your BharatEdge Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FCFAF7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #141619;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #FCFAF7;
      padding: 40px 16px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 10px 25px -5px rgba(240, 148, 77, 0.08), 0 8px 10px -6px rgba(172, 202, 213, 0.1);
      overflow: hidden;
    }
    .header-bar {
      height: 6px;
      background: linear-gradient(90deg, #ACCAD5 0%, #E4B592 50%, #F0944D 100%);
    }
    .content {
      padding: 36px 32px 32px 32px;
    }
    .brand-row {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
    }
    .brand-badge {
      display: inline-block;
      width: 36px;
      height: 36px;
      line-height: 36px;
      text-align: center;
      border-radius: 10px;
      background: linear-gradient(135deg, #ACCAD5 0%, #F0944D 100%);
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.5px;
      vertical-align: middle;
      margin-right: 12px;
    }
    .brand-title {
      display: inline-block;
      vertical-align: middle;
      font-size: 15px;
      font-weight: 700;
      color: #141619;
      letter-spacing: -0.2px;
    }
    .headline {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
      color: #141619;
      margin: 0 0 12px 0;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: #64748B;
      margin: 0 0 24px 0;
    }
    .otp-box {
      background: linear-gradient(135deg, rgba(172, 202, 213, 0.12) 0%, rgba(240, 148, 77, 0.12) 100%);
      border: 1px solid rgba(240, 148, 77, 0.35);
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #C66318;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SF Mono', 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #141619;
      margin: 0;
      padding-left: 10px;
    }
    .expiry-badge {
      display: inline-block;
      margin-top: 10px;
      font-size: 11px;
      font-weight: 600;
      color: #588594;
      background-color: #EBF3F6;
      padding: 4px 10px;
      border-radius: 20px;
    }
    .divider {
      height: 1px;
      background-color: #F1F5F9;
      margin: 28px 0 20px 0;
    }
    .footer-note {
      font-size: 12px;
      line-height: 1.6;
      color: #94A3B8;
      margin: 0;
    }
    .footer-copyright {
      padding: 20px 32px 28px 32px;
      background-color: #FAFAF9;
      border-top: 1px solid #F1F5F9;
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header-bar"></div>
      <div class="content">
        <div class="brand-row">
          <span class="brand-badge">BE</span>
          <span class="brand-title">BharatEdge Services • Enterprise OS</span>
        </div>

        <h1 class="headline">One-Time Security Passcode</h1>
        <p class="paragraph">
          Hello ${name},<br>
          We received an authentication request to access your BharatEdge Enterprise account. Use the one-time passcode (OTP) below to complete your login:
        </p>

        <div class="otp-box">
          <div class="otp-label">Security Verification Code</div>
          <div class="otp-code">${otpCode}</div>
          <div class="expiry-badge">⏱ Valid for 5 minutes</div>
        </div>

        <p class="paragraph" style="margin-bottom: 0;">
          Do not share this code with anyone. BharatEdge personnel will never ask for your authentication token.
        </p>

        <div class="divider"></div>

        <p class="footer-note">
          If you did not request this login attempt, please notify your system administrator immediately to secure your credentials.
        </p>
      </div>

      <div class="footer-copyright">
        © ${new Date().getFullYear()} BharatEdge Services Pvt. Ltd. Enterprise Security Gateway.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatches an OTP verification email using Nodemailer
 */
export async function sendOtpEmail(
  toEmail: string,
  otpCode: string,
  recipientName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const htmlContent = generateOtpEmailHtml(otpCode, recipientName);

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `${otpCode} is your BharatEdge Enterprise verification code`,
      text: `Your BharatEdge Enterprise verification code is: ${otpCode}. This code is valid for 5 minutes. Do not share it with anyone.`,
      html: htmlContent,
    });

    console.log(`[SMTP DISPATCH SUCCESS] Sent OTP ${otpCode} to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "SMTP transport failure";
    console.error(`[SMTP DISPATCH ERROR] Failed to send email to ${toEmail}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Dispatches an Official Quotation email to the client with PDF attachment and download link
 */
export async function sendQuotationEmail({
  toEmail,
  clientName,
  quotationNumber,
  grandTotal,
  pdfBuffer,
  pdfUrl,
}: {
  toEmail: string;
  clientName: string;
  quotationNumber: string;
  grandTotal: number;
  pdfBuffer?: Buffer;
  pdfUrl?: string | null;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .top-bar { height: 6px; background: linear-gradient(90deg, #ACCAD5, #F0944D); }
    .body { padding: 32px; }
    .title { font-size: 20px; font-weight: bold; color: #0f172a; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
    .details { background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px 20px; margin-bottom: 24px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .btn { display: inline-block; background: #F0944D; color: #ffffff !important; padding: 12px 24px; font-size: 13px; font-weight: bold; text-decoration: none; border-radius: 9999px; }
    .footer { font-size: 11px; color: #94a3b8; text-align: center; padding: 20px; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="top-bar"></div>
    <div class="body">
      <div class="title">BharatEdge Quotation: ${quotationNumber}</div>
      <div class="desc">Dear ${clientName},<br><br>Thank you for expressing interest in our corporate compliance and enterprise services. Please find attached our detailed proposal and price quotation for your review.</div>
      
      <div class="details">
        <div class="row"><strong>Quotation Number:</strong> <span>${quotationNumber}</span></div>
        <div class="row"><strong>Grand Total:</strong> <span style="color: #F0944D; font-weight: bold;">₹${Math.round(grandTotal).toLocaleString("en-IN")} (Incl. GST)</span></div>
        <div class="row"><strong>Valid Until:</strong> <span>30 Days from Issue</span></div>
      </div>

      ${
        pdfUrl
          ? `<div style="text-align: center; margin-bottom: 24px;">
               <a href="${pdfUrl}" target="_blank" class="btn">View & Download Quotation PDF</a>
             </div>`
          : ""
      }

      <div style="font-size: 12px; color: #64748b; line-height: 1.4;">
        If you have any questions regarding service deliverables, timelines, or statutory requirements, feel free to reply directly to this email.
      </div>
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} BharatEdge Services Pvt. Ltd. • Operating OS • Ahmedabad, Gujarat
    </div>
  </div>
</body>
</html>
    `.trim();

    const attachments: any[] = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `${quotationNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      });
    }

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `Official Quotation ${quotationNumber} from BharatEdge Services`,
      text: `Dear ${clientName},\n\nPlease find attached your quotation ${quotationNumber} for ₹${grandTotal.toLocaleString("en-IN")}.\n\nBest regards,\nBharatEdge Services Team`,
      html: htmlContent,
      attachments,
    });

    console.log(`[SMTP QUOTATION DISPATCH] Sent ${quotationNumber} to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "SMTP transport failure";
    console.error(`[SMTP QUOTATION ERROR] Failed to send quotation to ${toEmail}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}
