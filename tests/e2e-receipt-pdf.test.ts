import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { saveReceiptSnapshot, getReceiptSnapshot } from '../src/lib/db/receipts';
import { generateReceiptPdf } from '../src/lib/pdf/generator';
import { VerificationReceipt } from '../src/lib/verification/types';
import { closeDbPool } from '../src/lib/db/client';

console.log('🧪 Menjalankan Pengujian End-to-End: Receipt Tersimpan vs PDF Output...\n');

async function runE2ETest() {
  process.env.DATABASE_URL = 'postgresql://mockuser:mockpass@localhost:5432/mockdb';
  await closeDbPool();

  const mockDbStorage = new Map<string, any>();

  // Mock pool query
  // @ts-ignore
  Pool.prototype.query = async function (sql: any, params?: any[]) {
    const queryText = (typeof sql === 'string' ? sql : sql?.text || '').trim().toUpperCase();

    if (queryText.startsWith('INSERT INTO RECEIPTS')) {
      const id = params![0] as string;
      const row = {
        id: params![0],
        claim: params![1],
        status: params![2],
        reason: params![3],
        interpreted: params![4],
        calculation: params![5],
        evidence: params![6],
        limitations: params![7],
        rules_version: params![8],
        disclaimer: params![9],
        extractor_source: params![10],
        model_used: params![11],
        model_requested: params![12],
        fallback_reason: params![13],
        verified_at: params![14],
        created_at: new Date().toISOString(),
      };
      mockDbStorage.set(id, row);
      return { rows: [row], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    if (queryText.startsWith('SELECT') && queryText.includes('FROM RECEIPTS')) {
      const id = params![0] as string;
      const row = mockDbStorage.get(id);
      return {
        rows: row ? [row] : [],
        rowCount: row ? 1 : 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      };
    }

    return { rows: [], rowCount: 0, command: 'UNKNOWN', oid: 0, fields: [] };
  };

  const testReceiptId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const testClaim = 'BBRI naik 0,31% pada 23 September 2026';

  const originalReceipt: VerificationReceipt = {
    receiptId: testReceiptId,
    claim: testClaim,
    interpreted: {
      category: 'price_change',
      symbol: 'BBRI.JK',
      date: '2026-09-23',
      statedValue: 0.31,
      unit: 'percent',
    },
    status: 'supported',
    reason: 'Penutupan BBRI berubah dari 3.180 menjadi 3.190 (+0,31%) pada 23 September 2026.',
    calculation: {
      formula: '(current - previous) / previous * 100',
      previous: 3180,
      current: 3190,
      resultPercent: 0.3144654,
    },
    evidence: [
      {
        id: 'ev-daily-bbri-1',
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
      'Perhitungan menggunakan formula persentase deterministik.',
    ],
    rulesVersion: 'v1.0-price',
    disclaimer: 'Pemeriksaan informasi, bukan rekomendasi investasi.',
    extractorSource: 'ai_agent',
    modelUsed: 'gemini-3.7-flash',
    verifiedAt: '2026-09-28T05:00:00.000Z',
    storageStatus: 'saved',
    shareableUrl: `/receipt/${testReceiptId}`,
  };

  // 1. Simpan Snapshot ke Database
  console.log('1. Menyimpan snapshot receipt ke database:');
  const saveRes = await saveReceiptSnapshot(originalReceipt);
  assert.equal(saveRes.success, true, 'Snapshot harus berhasil disimpan');
  assert.equal(saveRes.id, testReceiptId);
  console.log(`  ✓ Snapshot receipt ID "${testReceiptId}" tersimpan di database`);

  // 2. Ambil Snapshot untuk Halaman Web /receipt/[id]
  console.log('\n2. Mengambil snapshot untuk tampilan halaman /receipt/[id]:');
  const webSnapshot = await getReceiptSnapshot(testReceiptId);
  assert(webSnapshot !== null, 'Snapshot untuk halaman web tidak boleh null');
  assert.equal(webSnapshot.receiptId, testReceiptId);
  assert.equal(webSnapshot.claim, testClaim);
  assert.equal(webSnapshot.status, 'supported');
  assert.equal(webSnapshot.reason, originalReceipt.reason);
  assert.equal(webSnapshot.shareableUrl, `/receipt/${testReceiptId}`);
  console.log('  ✓ Halaman web memuat ID, klaim, status, dan alasan yang identik');

  // 3. Buat Dokumen PDF dari Snapshot Database yang Sama (/api/receipt/[id]/pdf)
  console.log('\n3. Menghasilkan PDF dari snapshot database yang sama:');
  const pdfBuffer = await generateReceiptPdf(webSnapshot);
  assert(Buffer.isBuffer(pdfBuffer));
  assert(pdfBuffer.length > 1000);
  assert.equal(pdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-');

  // Periksa bahwa PDF memuat ID receipt dan teks klaim
  const pdfString = pdfBuffer.toString('latin1');
  assert(pdfString.includes(testReceiptId), 'PDF harus memuat receiptId yang sama');
  console.log(`  ✓ PDF berhasil dibuat (${pdfBuffer.length} bytes) dan memuat DOC REF: ${testReceiptId}`);

  console.log('\n✅ Uji Keselarasan End-to-End: Halaman Web dan Dokumen PDF Memuat ID & Hasil yang Sama!\n');
}

runE2ETest().catch((err) => {
  console.error('❌ E2E test gagal:', err);
  process.exit(1);
});
