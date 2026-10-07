import assert from 'node:assert/strict';
import { generateReceiptPdf } from '../src/lib/pdf/generator';
import { VerificationReceipt } from '../src/lib/verification/types';

console.log('🧪 Menjalankan Pengujian Modul PDF Receipt BursaBukti...\n');

// 1. Uji Pembuatan PDF untuk Klaim Harga Saham (dengan Perhitungan)
console.log('1. Uji Pembuatan PDF Snapshot Klaim Harga Saham:');

const priceReceipt: VerificationReceipt = {
  receiptId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  claim: 'BBRI naik 0,31% pada 23 September 2026',
  interpreted: {
    category: 'price_change',
    symbol: 'BBRI.JK',
    date: '2026-09-23',
    statedValue: 0.31,
    unit: 'percent',
  },
  status: 'supported',
  reason: 'Penutupan BBRI berubah dari 3.180 menjadi 3.190 (+0,31%) pada 23 September 2026 sesuai data transaksi harian.',
  calculation: {
    formula: '(current - previous) / previous * 100',
    previous: 3180,
    current: 3190,
    resultPercent: 0.3144654,
  },
  evidence: [
    {
      id: 'ev-1',
      sourceType: 'sectors_api',
      endpoint: '/daily/BBRI/',
      safeParams: { start: '2026-09-13', end: '2026-09-23' },
      dataDate: '2026-09-23',
      fetchedAt: '2026-09-28T05:00:00.000Z',
      publicUrl: null,
    },
  ],
  limitations: [
    'Data harga bersumber dari Sectors API untuk pasar reguler BEI.',
    'Verifikasi mengasumsikan zona waktu Asia/Jakarta.',
  ],
  rulesVersion: 'price-v1',
  disclaimer: 'Hasil adalah bukti pemeriksaan informasi, bukan rekomendasi investasi, ajakan membeli/menjual efek, atau jaminan kinerja masa depan.',
  extractorSource: 'ai_agent',
  modelUsed: 'gemini-3.7-flash',
  verifiedAt: '2026-09-28T05:00:00.000Z',
};

async function testPdfGeneration() {
  const pdfBuffer = await generateReceiptPdf(priceReceipt);

  assert(Buffer.isBuffer(pdfBuffer), 'Hasil harus berupa Buffer');
  assert(pdfBuffer.length > 1000, `Ukuran PDF harus memadai (didapat: ${pdfBuffer.length} bytes)`);

  // Header file PDF standar selalu dimulai dengan %PDF-
  const header = pdfBuffer.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-', 'Buffer harus memiliki magic bytes header PDF (%PDF-)');

  console.log(`  ✓ PDF klaim harga berhasil dibuat (${pdfBuffer.length} bytes, format valid %PDF-)`);

  // 2. Uji Pembuatan PDF untuk Berita / Media (tanpa Perhitungan)
  console.log('\n2. Uji Pembuatan PDF Snapshot Klaim Berita Media:');
  const newsReceipt: VerificationReceipt = {
    receiptId: 'c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f',
    claim: 'Media memberitakan BBCA meluncurkan inovasi paylater digital',
    interpreted: {
      category: 'news_sentiment',
      symbol: 'BBCA.JK',
      date: '2026-09-24',
      statedValue: null,
      unit: null,
    },
    status: 'supported',
    reason: 'Ditemukan artikel relevan yang mengonfirmasi bahwa BBCA merilis inovasi paylater.',
    evidence: [
      {
        id: 'ev-news-1',
        sourceType: 'news_article',
        endpoint: '/news/',
        safeParams: { symbol: 'BBCA' },
        dataDate: '2026-09-24',
        fetchedAt: '2026-09-28T06:00:00.000Z',
        publicUrl: 'https://example.com/news/bbca-paylater',
      },
    ],
    limitations: [
      'Pemberitaan media hanya memverifikasi adanya publikasi berita, bukan jaminan kinerja saham.',
    ],
    rulesVersion: 'news-v1',
    disclaimer: 'Pemeriksaan informasi, bukan nasihat finansial.',
    extractorSource: 'heuristic',
    verifiedAt: '2026-09-28T06:00:00.000Z',
  };

  const newsPdfBuffer = await generateReceiptPdf(newsReceipt);
  assert(Buffer.isBuffer(newsPdfBuffer), 'Hasil harus berupa Buffer');
  assert(newsPdfBuffer.length > 1000, `Ukuran PDF berita harus memadai (didapat: ${newsPdfBuffer.length} bytes)`);
  assert.equal(newsPdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'Header PDF harus %PDF-');
  console.log(`  ✓ PDF klaim berita berhasil dibuat (${newsPdfBuffer.length} bytes, format valid %PDF-)`);

  // 3. Uji Pembuatan PDF untuk Kasus Anomali / Kontradiksi & Kasus Bukti Belum Cukup
  console.log('\n3. Uji Pembuatan PDF untuk Status Kontradiksi & Insufficient Evidence:');
  const contradictedReceipt: VerificationReceipt = {
    ...priceReceipt,
    receiptId: 'd3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7a',
    status: 'contradicted',
    reason: 'Klaim menyatakan naik 5%, tetapi data riil BEI menunjukkan harga saham turun -1,2%.',
  };
  const contradictedPdf = await generateReceiptPdf(contradictedReceipt);
  assert(contradictedPdf.length > 1000);

  const insufficientReceipt: VerificationReceipt = {
    ...priceReceipt,
    receiptId: 'e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7a8b',
    status: 'insufficient_evidence',
    reason: 'Tanggal perdagangan tidak disebutkan dalam klaim.',
    calculation: undefined,
    evidence: [],
  };
  const insufficientPdf = await generateReceiptPdf(insufficientReceipt);
  assert(insufficientPdf.length > 1000);

  console.log('  ✓ Seluruh status verdict (supported, contradicted, insufficient_evidence) berhasil dibuat dalam PDF.');
  console.log('\n✅ Seluruh Pengujian Modul PDF Receipt Berhasil Lolos 100%!\n');
}

testPdfGeneration().catch((err) => {
  console.error('❌ Pengujian PDF gagal:', err);
  process.exit(1);
});
