import PDFDocument from 'pdfkit';
import { VerificationReceipt } from '../verification/types';

/**
 * Format status ke label Bahasa Indonesia dan warna
 */
function getStatusDetails(status: string) {
  switch (status) {
    case 'supported':
      return {
        label: 'DIDUKUNG DATA RESMI (VALID)',
        color: '#059669', // Emerald green
        bgColor: '#ECFDF5',
        borderColor: '#10B981',
      };
    case 'contradicted':
      return {
        label: 'BERTENTANGAN DENGAN DATA (ANOMALI)',
        color: '#DC2626', // Red
        bgColor: '#FEF2F2',
        borderColor: '#EF4444',
      };
    case 'insufficient_evidence':
      return {
        label: 'BUKTI BELUM CUKUP / TIDAK LENGKAP',
        color: '#D97706', // Amber
        bgColor: '#FFFBEB',
        borderColor: '#F59E0B',
      };
    case 'failed':
    default:
      return {
        label: 'GAGAL MEMERIKSA LAYANAN',
        color: '#4B5563', // Gray
        bgColor: '#F3F4F6',
        borderColor: '#9CA3AF',
      };
  }
}

/**
 * Membuat PDF Snapshot Resmi BursaBukti dari objek VerificationReceipt
 * Murni membaca snapshot tersimpan, tanpa memanggil Gemini AI atau Sectors API ulang.
 */
export function generateReceiptPdf(receipt: VerificationReceipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `BursaBukti Receipt - ${receipt.receiptId}`,
          Author: 'BursaBukti Verification Engine',
          Subject: 'Tanda Bukti Verifikasi Klaim Pasar Modal',
          Keywords: 'BursaBukti, Sectors API, IDX, Fact-Check, Financial Verification',
          CreationDate: receipt.verifiedAt ? new Date(receipt.verifiedAt) : new Date(),
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      const statusInfo = getStatusDetails(receipt.status);
      const pageWidth = doc.page.width - 80; // 40 margin each side

      // ==========================================
      // 1. HEADER & BRANDING
      // ==========================================
      doc.rect(40, 40, pageWidth, 44).fill('#0F172A'); // Slate 900 header bar

      doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica-Bold');
      doc.text('BURSABUKTI', 52, 48, { continued: true });
      doc.fontSize(9).font('Helvetica').fillColor('#94A3B8');
      doc.text('  |  OFFICIAL AUDIT & VERIFICATION RECEIPT', { continued: false });

      doc.fontSize(7.5).font('Helvetica').fillColor('#CBD5E1');
      doc.text(`DOC REF: ${receipt.receiptId}`, 52, 66);
      doc.text(`ATURAN: ${receipt.rulesVersion || 'v1.0'}`, 40 + pageWidth - 100, 66, { align: 'right', width: 90 });

      doc.moveDown(2);

      // ==========================================
      // 2. DOCUMENT TITLE & STATUS BADGE
      // ==========================================
      const currentYAfterHeader = 100;
      doc.y = currentYAfterHeader;

      doc.fillColor('#0F172A').fontSize(16).font('Helvetica-Bold');
      doc.text('Tanda Bukti Verifikasi Klaim Pasar Modal', 40, doc.y);

      doc.fontSize(8.5).font('Helvetica').fillColor('#64748B');
      const formattedDate = receipt.verifiedAt
        ? new Date(receipt.verifiedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
        : new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
      doc.text(`Diterbitkan: ${formattedDate}`, 40, doc.y + 4);

      doc.moveDown(0.8);

      // Status Badge Box
      const badgeY = doc.y;
      doc.roundedRect(40, badgeY, pageWidth, 36, 4)
        .fillAndStroke(statusInfo.bgColor, statusInfo.borderColor);

      doc.fillColor(statusInfo.color).fontSize(11).font('Helvetica-Bold');
      doc.text(`STATUS: ${statusInfo.label}`, 52, badgeY + 11);

      doc.y = badgeY + 46;

      // ==========================================
      // 3. KLAIM YANG DIAUDIT
      // ==========================================
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
      doc.text('1. KLAIM YANG DIAUDIT', 40, doc.y);
      doc.moveDown(0.3);

      const claimBoxY = doc.y;
      doc.roundedRect(40, claimBoxY, pageWidth, 48, 4)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.fillColor('#1E293B').fontSize(9.5).font('Helvetica-Oblique');
      doc.text(`"${receipt.claim}"`, 50, claimBoxY + 10, { width: pageWidth - 20 });

      const extractorLabel = receipt.extractorSource === 'ai_agent'
        ? `Metode: AI Agent Extraction (${receipt.modelUsed || 'Gemini'}${receipt.modelRequested && receipt.modelUsed && receipt.modelRequested !== receipt.modelUsed ? ` - failover dari ${receipt.modelRequested}` : ''})`
        : `Metode: Heuristic Rule-based Parser${receipt.fallbackReason ? ` (${receipt.fallbackReason})` : ''}`;

      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica');
      doc.text(extractorLabel, 50, claimBoxY + 34, { width: pageWidth - 20 });

      doc.y = claimBoxY + 58;

      // ==========================================
      // 4. HASIL EVALUASI & ALASAN
      // ==========================================
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
      doc.text('2. HASIL PEMERIKSAAN & ALASAN VERIFIKASI', 40, doc.y);
      doc.moveDown(0.3);

      const reasonBoxY = doc.y;
      const reasonText = receipt.reason || 'Tidak ada keterangan alasan tambahan.';
      doc.fontSize(9).font('Helvetica');
      const reasonHeight = Math.max(40, doc.heightOfString(reasonText, { width: pageWidth - 20 }) + 16);

      doc.roundedRect(40, reasonBoxY, pageWidth, reasonHeight, 4)
        .fillAndStroke('#F8FAFC', '#E2E8F0');

      doc.fillColor('#334155').fontSize(9).font('Helvetica');
      doc.text(reasonText, 50, reasonBoxY + 8, { width: pageWidth - 20 });

      doc.y = reasonBoxY + reasonHeight + 12;

      // ==========================================
      // 5. PERHITUNGAN DETERMINISTIK (JIKA ADA)
      // ==========================================
      if (receipt.calculation) {
        doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
        doc.text('3. RINCIAN PERHITUNGAN PERSENTASE (DETERMINISTIK)', 40, doc.y);
        doc.moveDown(0.3);

        const calcY = doc.y;
        doc.roundedRect(40, calcY, pageWidth, 42, 4)
          .fillAndStroke('#F8FAFC', '#E2E8F0');

        const colW = (pageWidth - 20) / 4;

        // Col 1: Prev Close
        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Penutupan Sebelumnya', 50, calcY + 8);
        doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(receipt.calculation.previous.toLocaleString('id-ID'), 50, calcY + 22);

        // Col 2: Target Close
        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Penutupan Target', 50 + colW, calcY + 8);
        doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold').text(receipt.calculation.current.toLocaleString('id-ID'), 50 + colW, calcY + 22);

        // Col 3: Result
        const pctColor = receipt.calculation.resultPercent >= 0 ? '#059669' : '#DC2626';
        const sign = receipt.calculation.resultPercent >= 0 ? '+' : '';
        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Hasil Perubahan', 50 + colW * 2, calcY + 8);
        doc.fillColor(pctColor).fontSize(9).font('Helvetica-Bold').text(`${sign}${receipt.calculation.resultPercent.toFixed(2).replace('.', ',')}%`, 50 + colW * 2, calcY + 22);

        // Col 4: Formula
        doc.fillColor('#64748B').fontSize(7.5).font('Helvetica').text('Rumus', 50 + colW * 3, calcY + 8);
        doc.fillColor('#475569').fontSize(8).font('Helvetica').text('(target-prev)/prev*100', 50 + colW * 3, calcY + 22);

        doc.y = calcY + 52;
      }

      // ==========================================
      // 6. BUKTI DATA & PROVENANCE (SECTORS API)
      // ==========================================
      const secTitle = receipt.calculation ? '4. BUKTI DATA & REKAM JEJAK (PROVENANCE)' : '3. BUKTI DATA & REKAM JEJAK (PROVENANCE)';
      doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
      doc.text(secTitle, 40, doc.y);
      doc.moveDown(0.3);

      if (receipt.evidence && receipt.evidence.length > 0) {
        receipt.evidence.forEach((ev, idx) => {
          const evY = doc.y;
          doc.roundedRect(40, evY, pageWidth, 44, 4)
            .fillAndStroke('#F8FAFC', '#E2E8F0');

          doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold');
          doc.text(`[${ev.id}] Sumber: ${ev.sourceType} | Endpoint: ${ev.endpoint}`, 50, evY + 8);

          doc.fillColor('#475569').fontSize(7.5).font('Helvetica');
          const fetchTime = new Date(ev.fetchedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
          doc.text(`Tanggal Data: ${ev.dataDate || '-'} | Waktu Diambil: ${fetchTime}`, 50, evY + 20);

          if (ev.publicUrl) {
            doc.fillColor('#2563EB').fontSize(7.5).font('Helvetica');
            doc.text(`Tautan Sumber: ${ev.publicUrl}`, 50, evY + 31, { width: pageWidth - 20 });
          } else {
            doc.fillColor('#64748B').fontSize(7.5).font('Helvetica');
            doc.text('Tautan Sumber: Data Resmi Sectors Financial API Langsung', 50, evY + 31);
          }

          doc.y = evY + 50;
        });
      } else {
        const noEvY = doc.y;
        doc.roundedRect(40, noEvY, pageWidth, 28, 4)
          .fillAndStroke('#F8FAFC', '#E2E8F0');
        doc.fillColor('#64748B').fontSize(8).font('Helvetica');
        doc.text('Tidak ada bukti data yang terhubung.', 50, noEvY + 8);
        doc.y = noEvY + 36;
      }

      // ==========================================
      // 7. BATASAN PEMERIKSAAN & CATATAN
      // ==========================================
      if (receipt.limitations && receipt.limitations.length > 0) {
        doc.moveDown(0.3);
        const limTitle = receipt.calculation ? '5. BATASAN PEMERIKSAAN' : '4. BATASAN PEMERIKSAAN';
        doc.fillColor('#0F172A').fontSize(10).font('Helvetica-Bold');
        doc.text(limTitle, 40, doc.y);
        doc.moveDown(0.2);

        receipt.limitations.forEach((lim) => {
          doc.fillColor('#64748B').fontSize(8).font('Helvetica');
          doc.text(`• ${lim}`, 48, doc.y, { width: pageWidth - 16 });
          doc.moveDown(0.1);
        });
        doc.moveDown(0.4);
      }

      // ==========================================
      // 8. DISCLAIMER & LEGAL
      // ==========================================
      const discY = Math.max(doc.y + 10, doc.page.height - 90);
      doc.roundedRect(40, discY, pageWidth, 42, 4)
        .fillAndStroke('#FEF3C7', '#FDE68A'); // Amber warning tint

      doc.fillColor('#92400E').fontSize(7.5).font('Helvetica-Bold');
      doc.text('CATATAN BATASAN & DISCLAIMER:', 50, discY + 6);
      doc.fillColor('#78350F').fontSize(7).font('Helvetica');
      doc.text(
        receipt.disclaimer || 'Hasil adalah bukti pemeriksaan informasi berbasis data historis Sectors API dan Bursa Efek Indonesia, bukan merupakan nasihat investasi, ajakan membeli/menjual efek, atau jaminan kinerja masa depan.',
        50,
        discY + 17,
        { width: pageWidth - 20 }
      );

      // Footer line
      doc.fontSize(6.5).font('Helvetica').fillColor('#94A3B8');
      doc.text(
        '© 2026 BursaBukti — Sectors Hackathon Track 01. Snapshot data bersifat permanen dan tidak dapat diubah (immutable).',
        40,
        doc.page.height - 30,
        { align: 'center', width: pageWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
