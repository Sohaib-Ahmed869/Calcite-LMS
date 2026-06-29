const PDFDocument = require('pdfkit');

// Brand palette (mirrors the invoice/progress-report PDF services' approach).
const PRIMARY = '#0a2952';
const ACCENT = '#c77700';
const DARK_GREY = '#374151';
const LIGHT_GREY = '#9CA3AF';

const formatDate = (date) =>
  new Date(date || Date.now()).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Build a single-page landscape A4 certificate of completion. Returns a Promise<Buffer> so the caller
 * can upload it straight to S3 (no disk touch) — same pattern as invoicePdf.service.js.
 */
const buildCertificatePdfBuffer = ({ studentName, courseTitle, completionDate, certificateNumber, totalHours }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const H = doc.page.height;

      // Outer + inner decorative borders.
      doc.save();
      doc.lineWidth(6).strokeColor(PRIMARY).rect(24, 24, W - 48, H - 48).stroke();
      doc.lineWidth(1.5).strokeColor(ACCENT).rect(38, 38, W - 76, H - 76).stroke();
      doc.restore();

      const centerText = (text, y, opts = {}) =>
        doc.text(text, 0, y, { width: W, align: 'center', lineBreak: false, ...opts });

      // Heading
      doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(34);
      centerText('Certificate of Completion', 92);

      doc.fillColor(ACCENT).font('Helvetica-Bold').fontSize(12);
      centerText('CALCITE LMS', 138);

      doc.fillColor(DARK_GREY).font('Helvetica').fontSize(13);
      centerText('This is proudly presented to', 178);

      // Recipient
      doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(30);
      centerText(studentName || 'Student', 208);

      // Accent underline beneath the name
      const lineWidth = 280;
      doc.lineWidth(1).strokeColor(ACCENT)
        .moveTo((W - lineWidth) / 2, 250).lineTo((W + lineWidth) / 2, 250).stroke();

      doc.fillColor(DARK_GREY).font('Helvetica').fontSize(13);
      centerText('for successfully completing the course', 268);

      doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(20);
      centerText(courseTitle || 'Course', 296, { width: W - 160 });

      if (totalHours) {
        doc.fillColor(LIGHT_GREY).font('Helvetica').fontSize(11);
        centerText(`${totalHours} hour(s) of learning content`, 332);
      }

      // Footer: date (left) and certificate number (right)
      const footY = H - 96;
      doc.lineWidth(0.8).strokeColor(LIGHT_GREY).moveTo(90, footY).lineTo(290, footY).stroke();
      doc.moveTo(W - 290, footY).lineTo(W - 90, footY).stroke();

      doc.fillColor(DARK_GREY).font('Helvetica').fontSize(11);
      doc.text(formatDate(completionDate), 90, footY + 6, { width: 200, align: 'center' });
      doc.text(certificateNumber || '', W - 290, footY + 6, { width: 200, align: 'center' });

      doc.fillColor(LIGHT_GREY).font('Helvetica').fontSize(9);
      doc.text('Date of Completion', 90, footY + 24, { width: 200, align: 'center' });
      doc.text('Certificate Number', W - 290, footY + 24, { width: 200, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

module.exports = { buildCertificatePdfBuffer };
