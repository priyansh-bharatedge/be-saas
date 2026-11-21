import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface QuotationPdfItem {
  serviceName: string;
  remarks?: string | null;
  withoutGstAmount: number;
  gstAmount: number;
  totalAmount: number;
}

export interface QuotationPdfData {
  quotationNumber: string;
  createdAt: string;
  validUntil?: string | null;
  preparedByName?: string;
  // Client Info
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientCity?: string | null;
  clientState?: string | null;
  clientAddress?: string | null;
  // Company Info
  companyName?: string | null;
  companyAddress?: string | null;
  companyType?: string | null;
  // Services
  services: QuotationPdfItem[];
  // Totals
  subTotal: number;
  discountAmount?: number;
  gstAmount: number;
  grandTotal: number;
  terms?: string | null;
}

/**
 * Sanitizes any text string before drawing to StandardFonts in pdf-lib (WinAnsi encoding).
 * Converts Unicode currency symbols, quotes, dashes, bullets, and accents to clean WinAnsi/ASCII equivalents.
 */
export function sanitizePdfText(input?: string | number | null): string {
  if (input === null || input === undefined) return "";

  return String(input)
    // Currency symbols (WinAnsi cannot encode ₹ 0x20b9)
    .replace(/₹/g, "Rs. ")
    .replace(/€/g, "EUR ")
    .replace(/£/g, "GBP ")
    .replace(/¥/g, "JPY ")
    // Quotes & apostrophes
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[`´]/g, "'")
    // Dashes & hyphens
    .replace(/[–—]/g, "-")
    .replace(/[−]/g, "-")
    // Bullets & symbols
    .replace(/[•·]/g, "|")
    .replace(/[…]/g, "...")
    .replace(/™/g, "(TM)")
    .replace(/©/g, "(C)")
    .replace(/®/g, "(R)")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Zero-width spaces
    // Normalize unicode accents to base characters
    .normalize("NFKD")
    // Replace any remaining non-WinAnsi / non-ASCII characters
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

/**
 * Currency formatter using Rs. for clean WinAnsi PDF compatibility
 */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(Number(amount) || 0);
  return `Rs. ${rounded.toLocaleString("en-IN")}`;
}

/**
 * Safe wrapper for drawing text on pdf-lib pages with automatic WinAnsi sanitization
 */
function safeDrawText(
  page: any,
  text: string | number | undefined | null,
  options: {
    x: number;
    y: number;
    size?: number;
    font?: any;
    color?: any;
    maxWidth?: number;
  }
) {
  const sanitized = sanitizePdfText(text);
  if (!sanitized) return;
  page.drawText(sanitized, options);
}

export async function generateQuotationPdf(data: QuotationPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 (width, height in points)
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Brand Palette
  const colorOrange = rgb(0.94, 0.58, 0.3); // #F0944D
  const colorSlate = rgb(0.08, 0.09, 0.1);  // #141619
  const colorMuted = rgb(0.45, 0.5, 0.55);
  const colorLine = rgb(0.88, 0.9, 0.92);
  const colorBgLight = rgb(0.97, 0.98, 0.99);

  // Top Accent Banner (8px height)
  page.drawRectangle({
    x: 0,
    y: height - 8,
    width: width,
    height: 8,
    color: colorOrange,
  });

  let curY = height - 42;

  // Header: Brand & Document Title
  safeDrawText(page, "BharatEdge", {
    x: 40,
    y: curY,
    size: 20,
    font: fontBold,
    color: colorSlate,
  });

  safeDrawText(page, "SERVICES & COMPLIANCE OS", {
    x: 40,
    y: curY - 14,
    size: 8,
    font: fontBold,
    color: colorOrange,
  });

  safeDrawText(page, "OFFICIAL QUOTATION", {
    x: width - 210,
    y: curY,
    size: 16,
    font: fontBold,
    color: colorSlate,
  });

  safeDrawText(page, `Ref: ${data.quotationNumber}`, {
    x: width - 210,
    y: curY - 14,
    size: 9,
    font: fontBold,
    color: colorOrange,
  });

  curY -= 45;

  // Metadata Bar
  page.drawRectangle({
    x: 40,
    y: curY,
    width: width - 80,
    height: 24,
    color: colorBgLight,
    borderColor: colorLine,
    borderWidth: 1,
  });

  const createdDateStr = data.createdAt ? data.createdAt.split("T")[0] : new Date().toISOString().split("T")[0];
  safeDrawText(page, `Date: ${createdDateStr}`, {
    x: 50,
    y: curY + 7,
    size: 9,
    font: font,
    color: colorSlate,
  });

  const validUntilStr = data.validUntil ? data.validUntil.split("T")[0] : "30 Days from Issue";
  safeDrawText(page, `Valid Until: ${validUntilStr}`, {
    x: 210,
    y: curY + 7,
    size: 9,
    font: font,
    color: colorSlate,
  });

  safeDrawText(page, `Prepared By: ${data.preparedByName || "Sales Operations"}`, {
    x: 400,
    y: curY + 7,
    size: 9,
    font: font,
    color: colorSlate,
  });

  curY -= 30;

  // Client & Company Information Boxes
  const boxWidth = (width - 95) / 2;
  const boxHeight = 85;

  // Bill To (Client)
  page.drawRectangle({
    x: 40,
    y: curY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: colorLine,
    borderWidth: 1,
  });

  safeDrawText(page, "PROSPECT / CLIENT DETAILS", {
    x: 50,
    y: curY - 16,
    size: 8,
    font: fontBold,
    color: colorOrange,
  });

  safeDrawText(page, data.clientName, {
    x: 50,
    y: curY - 32,
    size: 11,
    font: fontBold,
    color: colorSlate,
  });

  if (data.clientPhone) {
    safeDrawText(page, `Phone: ${data.clientPhone}`, {
      x: 50,
      y: curY - 46,
      size: 9,
      font: font,
      color: colorMuted,
    });
  }

  if (data.clientEmail) {
    safeDrawText(page, `Email: ${data.clientEmail}`, {
      x: 50,
      y: curY - 58,
      size: 9,
      font: font,
      color: colorMuted,
    });
  }

  const clientLoc = [data.clientCity, data.clientState].filter(Boolean).join(", ");
  if (clientLoc) {
    safeDrawText(page, `Location: ${clientLoc}`, {
      x: 50,
      y: curY - 70,
      size: 9,
      font: font,
      color: colorMuted,
    });
  }

  // Company Details Box
  page.drawRectangle({
    x: 55 + boxWidth,
    y: curY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: colorLine,
    borderWidth: 1,
  });

  safeDrawText(page, "ENTERPRISE ENTITY", {
    x: 65 + boxWidth,
    y: curY - 16,
    size: 8,
    font: fontBold,
    color: colorOrange,
  });

  safeDrawText(page, data.companyName || "Individual Client Account", {
    x: 65 + boxWidth,
    y: curY - 32,
    size: 11,
    font: fontBold,
    color: colorSlate,
  });

  if (data.companyType) {
    safeDrawText(page, `Type: ${data.companyType}`, {
      x: 65 + boxWidth,
      y: curY - 46,
      size: 9,
      font: font,
      color: colorMuted,
    });
  }

  if (data.companyAddress) {
    safeDrawText(page, `Address: ${data.companyAddress.slice(0, 35)}...`, {
      x: 65 + boxWidth,
      y: curY - 58,
      size: 9,
      font: font,
      color: colorMuted,
    });
  }

  curY -= boxHeight + 25;

  // Services Table Header
  const tableX = 40;
  const tableW = width - 80;
  const headerH = 22;

  page.drawRectangle({
    x: tableX,
    y: curY - headerH,
    width: tableW,
    height: headerH,
    color: colorSlate,
  });

  safeDrawText(page, "#", { x: tableX + 8, y: curY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  safeDrawText(page, "SERVICE DESCRIPTION", { x: tableX + 30, y: curY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  safeDrawText(page, "REMARKS", { x: tableX + 220, y: curY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  safeDrawText(page, "BASE (INR)", { x: tableX + 325, y: curY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  safeDrawText(page, "GST (18%)", { x: tableX + 405, y: curY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });
  safeDrawText(page, "TOTAL (INR)", { x: tableX + 465, y: curY - 15, size: 8, font: fontBold, color: rgb(1, 1, 1) });

  curY -= headerH;

  // Table Rows
  const rowHeight = 24;
  data.services.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      page.drawRectangle({
        x: tableX,
        y: curY - rowHeight,
        width: tableW,
        height: rowHeight,
        color: colorBgLight,
      });
    }

    page.drawLine({
      start: { x: tableX, y: curY - rowHeight },
      end: { x: tableX + tableW, y: curY - rowHeight },
      color: colorLine,
      thickness: 0.5,
    });

    const textY = curY - 16;
    safeDrawText(page, String(index + 1), { x: tableX + 8, y: textY, size: 8, font: font, color: colorSlate });
    safeDrawText(page, item.serviceName.slice(0, 32), { x: tableX + 30, y: textY, size: 8.5, font: fontBold, color: colorSlate });
    safeDrawText(page, (item.remarks || "-").slice(0, 24), { x: tableX + 220, y: textY, size: 7.5, font: font, color: colorMuted });
    safeDrawText(page, formatCurrency(item.withoutGstAmount), { x: tableX + 325, y: textY, size: 8.5, font: font, color: colorSlate });
    safeDrawText(page, formatCurrency(item.gstAmount), { x: tableX + 405, y: textY, size: 8.5, font: font, color: colorSlate });
    safeDrawText(page, formatCurrency(item.totalAmount), { x: tableX + 465, y: textY, size: 8.5, font: fontBold, color: colorSlate });

    curY -= rowHeight;
  });

  curY -= 15;

  // Summary Totals Table Box (Bottom Right)
  const sumW = 210;
  const sumX = width - 40 - sumW;
  const sumH = 80;

  page.drawRectangle({
    x: sumX,
    y: curY - sumH,
    width: sumW,
    height: sumH,
    color: colorBgLight,
    borderColor: colorLine,
    borderWidth: 1,
  });

  safeDrawText(page, "Subtotal (Base Value):", { x: sumX + 10, y: curY - 20, size: 9, font: font, color: colorMuted });
  safeDrawText(page, formatCurrency(data.subTotal), { x: sumX + 125, y: curY - 20, size: 9, font: fontBold, color: colorSlate });

  safeDrawText(page, "GST Amount (18%):", { x: sumX + 10, y: curY - 38, size: 9, font: font, color: colorMuted });
  safeDrawText(page, formatCurrency(data.gstAmount), { x: sumX + 125, y: curY - 38, size: 9, font: fontBold, color: colorSlate });

  page.drawLine({
    start: { x: sumX + 8, y: curY - 48 },
    end: { x: sumX + sumW - 8, y: curY - 48 },
    color: colorLine,
    thickness: 1,
  });

  safeDrawText(page, "Grand Total:", { x: sumX + 10, y: curY - 66, size: 10, font: fontBold, color: colorSlate });
  safeDrawText(page, formatCurrency(data.grandTotal), { x: sumX + 115, y: curY - 66, size: 11, font: fontBold, color: colorOrange });

  // Payment Bank Information Box (Bottom Left)
  const bankW = width - 80 - sumW - 15;
  page.drawRectangle({
    x: 40,
    y: curY - sumH,
    width: bankW,
    height: sumH,
    color: rgb(1, 1, 1),
    borderColor: colorLine,
    borderWidth: 1,
  });

  safeDrawText(page, "OFFICIAL BANK PAYMENT INSTRUCTIONS", { x: 50, y: curY - 16, size: 8, font: fontBold, color: colorOrange });
  safeDrawText(page, "A/C Name: BharatEdge Services Private Limited (BSPL)", { x: 50, y: curY - 30, size: 8, font: fontBold, color: colorSlate });
  safeDrawText(page, "Bank: HDFC Bank Ltd | A/C No: 50100000000001", { x: 50, y: curY - 44, size: 8, font: font, color: colorMuted });
  safeDrawText(page, "IFSC Code: HDFC0000006 | Branch: Bodakdev, Ahmedabad", { x: 50, y: curY - 56, size: 8, font: font, color: colorMuted });
  safeDrawText(page, "Alternate Entity: BharatEdge Allied Platforms LLP (BSAPL)", { x: 50, y: curY - 68, size: 7.5, font: font, color: colorMuted });

  curY -= sumH + 25;

  // Terms & Conditions
  safeDrawText(page, "TERMS & CONDITIONS", { x: 40, y: curY, size: 8, font: fontBold, color: colorOrange });
  curY -= 12;

  const defaultTerms =
    data.terms ||
    "1. Quotation valid for 30 days from date of issuance. 2. 50% advance payment required upon service order initiation. 3. Government statutory fees will be charged as per actual receipts. 4. Disputed jurisdictions subject to Ahmedabad Court arbitration.";
  
  const termsText = sanitizePdfText(defaultTerms);
  const termLines = termsText.split(/\r?\n/).filter(Boolean);
  if (termLines.length <= 1) {
    safeDrawText(page, termsText.slice(0, 160), {
      x: 40,
      y: curY,
      size: 7.5,
      font: font,
      color: colorMuted,
    });
  } else {
    termLines.slice(0, 3).forEach((line, i) => {
      safeDrawText(page, line.slice(0, 130), {
        x: 40,
        y: curY - (i * 9),
        size: 7,
        font: font,
        color: colorMuted,
      });
    });
  }

  curY -= 35;

  // Signatory & Footer
  page.drawLine({
    start: { x: width - 180, y: curY },
    end: { x: width - 40, y: curY },
    color: colorLine,
    thickness: 1,
  });

  safeDrawText(page, "Authorized Signatory", {
    x: width - 160,
    y: curY - 12,
    size: 8,
    font: fontBold,
    color: colorSlate,
  });

  safeDrawText(page, "BharatEdge Enterprise CRM OS", {
    x: width - 175,
    y: curY - 22,
    size: 7,
    font: font,
    color: colorMuted,
  });

  // Footer bar
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 18,
    color: colorBgLight,
  });

  safeDrawText(page, "BharatEdge Services Pvt Ltd | Headquarters - Ahmedabad, Gujarat | contact@bharatedge.com", {
    x: 100,
    y: 6,
    size: 7.5,
    font: font,
    color: colorMuted,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
