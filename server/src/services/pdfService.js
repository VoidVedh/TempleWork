import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Server-side PDF receipt generator for Shree Siddhivinayak Mandir.
 * Generates an elegant, authentic A5 receipt matching the temple certificate specifications.
 * 
 * Returns a Promise resolving to a Node.js Buffer containing the complete PDF document.
 */
export function generateReceiptPdfBuffer(receipt) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        margin: 25,
        info: {
          Title: `Receipt-${receipt.receipt_no}`,
          Author: 'Shree Siddhivinayak Mandir',
          Subject: 'Official Devotee Contribution Receipt'
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', (err) => reject(err));

      const width = doc.page.width;
      const height = doc.page.height;

      // 1. Auspicious Golden Border
      doc.rect(15, 15, width - 30, height - 30)
         .lineWidth(2)
         .stroke('#b45309');

      doc.rect(18, 18, width - 36, height - 36)
         .lineWidth(0.75)
         .stroke('#d97706');

      // 2. Temple Header
      doc.fontSize(16)
         .fillColor('#7f1d1d')
         .text('॥ श्री गणेशाय नमः ॥', 0, 32, { align: 'center' });

      doc.fontSize(14)
         .fillColor('#991b1b')
         .text('SHREE SIDDHIVINAYAK MANDIR', 0, 52, { align: 'center' });

      doc.fontSize(8.5)
         .fillColor('#475569')
         .text('Airoli Sector-5, Navi Mumbai 400708 | Reg. No: MH/08/2026', 0, 70, { align: 'center' });

      doc.fontSize(9)
         .fillColor('#b45309')
         .text('OFFICIAL CONTRIBUTION RECEIPT (ई-पावती)', 0, 83, { align: 'center' });

      // Decorative divider line
      doc.moveTo(35, 98)
         .lineTo(width - 35, 98)
         .lineWidth(1)
         .stroke('#fde68a');

      // 3. Receipt Details Box
      const leftCol = 35;
      const rightCol = width - 35;
      let y = 110;

      // Receipt No & Date
      doc.fontSize(9).fillColor('#64748b').text('Receipt No:', leftCol, y);
      doc.fontSize(10).fillColor('#0f172a').text(receipt.receipt_no, leftCol + 65, y);

      const issueDateStr = receipt.issue_date ? new Date(receipt.issue_date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) : new Date().toLocaleDateString('en-IN');

      doc.fontSize(9).fillColor('#64748b').text('Date:', width / 2 + 10, y);
      doc.fontSize(9).fillColor('#0f172a').text(issueDateStr, width / 2 + 45, y);

      y += 24;

      // Donor Name
      doc.fontSize(9).fillColor('#64748b').text('Received From:', leftCol, y);
      doc.fontSize(10).fillColor('#0f172a').text(receipt.donor_name || 'Devotee', leftCol + 75, y);

      y += 22;

      // Mobile & Address
      if (receipt.donor_mobile) {
        doc.fontSize(9).fillColor('#64748b').text('Mobile No:', leftCol, y);
        doc.fontSize(9).fillColor('#0f172a').text(receipt.donor_mobile, leftCol + 65, y);
      }

      if (receipt.address_galli) {
        doc.fontSize(9).fillColor('#64748b').text('Address:', width / 2 + 10, y);
        doc.fontSize(9).fillColor('#0f172a').text(receipt.address_galli, width / 2 + 55, y, { width: 110 });
      }

      y += 24;

      // Amount Banner Box
      doc.rect(35, y, width - 70, 36)
         .fillAndStroke('#fffbeb', '#fde68a');

      doc.fontSize(10).fillColor('#92400e').text('AMOUNT RECEIVED:', 45, y + 12);
      const amountStr = `Rs. ${Number(receipt.amount).toLocaleString('en-IN')}/-`;
      doc.fontSize(14).fillColor('#047857').text(amountStr, rightCol - 150, y + 10, { width: 140, align: 'right' });

      y += 44;

      // Amount in words
      doc.fontSize(8.5).fillColor('#64748b').text('In Words:', leftCol, y);
      doc.fontSize(9).fillColor('#1e293b').text(receipt.amount_in_words || `${receipt.amount} Rupees Only`, leftCol + 50, y, { width: width - 95 });

      y += 22;

      // Payment Mode & Transaction Ref / UTR
      doc.fontSize(8.5).fillColor('#64748b').text('Payment Mode:', leftCol, y);
      doc.fontSize(9).fillColor('#0f172a').text(receipt.payment_mode || 'Online UPI', leftCol + 75, y);

      if (receipt.upi_ref_no) {
        doc.fontSize(8.5).fillColor('#64748b').text('UTR / Ref:', width / 2 + 10, y);
        doc.fontSize(9).fillColor('#7f1d1d').text(receipt.upi_ref_no, width / 2 + 55, y);
      }

      y += 24;

      // Status
      doc.fontSize(8.5).fillColor('#64748b').text('Status:', leftCol, y);
      doc.fontSize(9.5).fillColor('#059669').text('PAID (जमा / प्राप्त)', leftCol + 45, y);

      y += 30;

      // 4. Signatures / Authority
      const signY = height - 95;
      doc.moveTo(35, signY).lineTo(width - 35, signY).lineWidth(0.5).stroke('#cbd5e1');

      doc.fontSize(8).fillColor('#64748b').text('Authorized Trustee / Administrator', leftCol, signY + 10);
      doc.fontSize(8).fillColor('#0f172a').text(receipt.collector_name || 'Mandir Management', leftCol, signY + 22);

      doc.fontSize(8).fillColor('#64748b').text('Devotee Signature', rightCol - 110, signY + 10, { align: 'right' });
      doc.fontSize(8).fillColor('#94a3b8').text('[ Verified Digitally ]', rightCol - 110, signY + 22, { align: 'right' });

      // 5. Footer Blessing
      doc.fontSize(8).fillColor('#92400e')
         .text('॥ गणपती बाप्पा मोरया, मंगलमूर्ती मोरया ॥', 0, height - 48, { align: 'center' });
      doc.fontSize(7).fillColor('#94a3b8')
         .text('Shree Siddhivinayak Mandir Trust thanks you for your holy seva. May Lord Ganesha bless you.', 0, height - 36, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
