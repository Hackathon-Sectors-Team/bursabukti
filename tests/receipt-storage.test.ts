import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { isValidUUID, saveReceiptSnapshot, getReceiptSnapshot } from '../src/lib/db/receipts';
import { VerificationReceipt } from '../src/lib/verification/types';
import { isDatabaseConfigured, closeDbPool } from '../src/lib/db/client';

console.log('🧪 Menjalankan Pengujian Modul Penyimpanan Snapshot & Receipt Permanen...\n');

// 1. Uji Validasi Format UUID
console.log('1. Uji Validasi Format UUID:');
const validUUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
assert.equal(isValidUUID(validUUID), true, 'UUID standar harus valid');

const invalidUUIDs = [
  'invalid-id-123',
  '../../etc/passwd',
  '1; DROP TABLE receipts; --',
  '',
  '   ',
  'a1b2c3d4-e5f6-4a7b-8c9d', // terlalu pendek
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d-extra', // terlalu panjang
];

for (const badId of invalidUUIDs) {
  assert.equal(isValidUUID(badId), false, `ID "${badId}" harus ditolak sebagai UUID tidak valid`);
}
console.log('  ✓ Validasi format UUID aman (menolak string sembarang, injeksi SQL, dan path traversal)');

// 2. Uji Penanganan Database Belum Dikonfigurasi (Unconfigured State)
console.log('\n2. Uji Penanganan Kondisi Database Belum Dikonfigurasi:');
const origDbUrl = process.env.DATABASE_URL;
const origPostgresUrl = process.env.POSTGRES_URL;

delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;

assert.equal(isDatabaseConfigured(), false, 'Database harus terdeteksi belum dikonfigurasi');

const sampleReceipt: VerificationReceipt = {
  receiptId: 'b5c829e1-6d72-4e4b-912a-8ef7a1523c09',
  claim: 'BBRI naik 0,31% pada 23 September 2026',
  interpreted: {
    category: 'price_change',
    symbol: 'BBRI.JK',
    date: '2026-09-23',
    statedValue: 0.31,
    unit: 'percent',
  },
  status: 'supported',
  reason: 'Penutupan BBRI berubah dari 3180 menjadi 3190 (+0,31%) pada 23 September 2026.',
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
  limitations: ['Data melalui Sectors API.'],
  rulesVersion: 'price-v1',
  disclaimer: 'Pemeriksaan informasi, bukan rekomendasi investasi.',
  extractorSource: 'ai_agent',
  modelUsed: 'gemini-3.7-flash',
  verifiedAt: '2026-09-28T05:00:00.000Z',
};

async function testUnconfiguredDb() {
  const saveRes = await saveReceiptSnapshot(sampleReceipt);
  assert.equal(saveRes.success, false, 'Simpan harus gagal jika DB belum dikonfigurasi');
  assert.equal(saveRes.error, 'DATABASE_UNCONFIGURED');

  const getRes = await getReceiptSnapshot(sampleReceipt.receiptId);
  assert.equal(getRes, null, 'getReceiptSnapshot harus return null jika DB belum dikonfigurasi');
  console.log('  ✓ saveReceiptSnapshot & getReceiptSnapshot menangani DB unconfigured secara anggun (graceful)');
}

// 3. Uji Simpan & Ambil Kembali Snapshot dengan Mock PostgreSQL Pool
console.log('\n3. Uji Simpan → Buka Kembali Snapshot (Mock DB):');
async function testSaveAndRetrieveMock() {
  process.env.DATABASE_URL = 'postgresql://mockuser:mockpass@localhost:5432/mockdb';
  await closeDbPool();

  const mockTable = new Map<string, any>();
  const origPoolQuery = Pool.prototype.query;

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
      mockTable.set(id, row);
      return { rows: [row], rowCount: 1, command: 'INSERT', oid: 0, fields: [] };
    }

    if (queryText.startsWith('SELECT') && queryText.includes('FROM RECEIPTS')) {
      const id = params![0] as string;
      const row = mockTable.get(id);
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

  try {
    // A. Simpan receipt harga
    const saveResult = await saveReceiptSnapshot(sampleReceipt);
    assert.equal(saveResult.success, true, 'Penyimpanan snapshot harus berhasil');
    assert.equal(saveResult.id, sampleReceipt.receiptId);

    // B. Ambil kembali receipt dari database
    const retrieved = await getReceiptSnapshot(sampleReceipt.receiptId);
    assert(retrieved !== null, 'Receipt harus berhasil diambil kembali dari database');
    assert.equal(retrieved.receiptId, sampleReceipt.receiptId);
    assert.equal(retrieved.claim, sampleReceipt.claim);
    assert.equal(retrieved.status, 'supported');
    assert.equal(retrieved.reason, sampleReceipt.reason);
    assert.equal(retrieved.interpreted.symbol, 'BBRI.JK');
    assert.equal(retrieved.calculation?.previous, 3180);
    assert.equal(retrieved.calculation?.current, 3190);
    assert.equal(retrieved.evidence[0].endpoint, '/daily/BBRI/');
    assert.equal(retrieved.rulesVersion, 'price-v1');
    assert.equal(retrieved.extractorSource, 'ai_agent');
    assert.equal(retrieved.modelUsed, 'gemini-3.7-flash');
    assert.equal(retrieved.storageStatus, 'saved');
    assert.equal(retrieved.shareableUrl, `/receipt/${sampleReceipt.receiptId}`);
    assert.equal(retrieved.verifiedAt, sampleReceipt.verifiedAt);
    console.log('  ✓ Simpan → Buka kembali snapshot harga persis identik tanpa kalkulasi ulang');

    // C. Simpan & ambil receipt berita (dengan publicUrl sumber bukti)
    const newsReceipt: VerificationReceipt = {
      receiptId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      claim: 'Media CNBC memberitakan investor asing melakukan net sell pada saham BBRI',
      interpreted: {
        category: 'news_mention',
        symbol: 'BBRI.JK',
        date: null,
        statedValue: null,
        unit: null,
        coreAssertion: 'investor asing melakukan net sell pada saham BBRI',
        publisher: 'CNBC',
      },
      status: 'supported',
      reason: 'Ditemukan artikel berita terbitan CNBC Indonesia dengan judul "Investor Asing Net Sell BBRI" yang memberitakan informasi terkait.',
      evidence: [
        {
          id: 'ev-news-1',
          sourceType: 'sectors_api_news',
          endpoint: '/news/',
          safeParams: { extension: 'idx', symbols: 'BBRI' },
          dataDate: '2026-09-22',
          fetchedAt: '2026-09-28T05:00:00.000Z',
          publicUrl: 'https://www.cnbcindonesia.com/market/20260922-investor-asing-net-sell-bbri',
        },
      ],
      limitations: ['Verifikasi berita membuktikan publikasi media resmi pada Sectors API.'],
      rulesVersion: 'news-v1',
      disclaimer: 'Pemeriksaan informasi, bukan rekomendasi investasi.',
      extractorSource: 'ai_agent',
      modelUsed: 'gemini-3.7-flash',
      verifiedAt: '2026-09-28T05:00:00.000Z',
    };

    const saveNews = await saveReceiptSnapshot(newsReceipt);
    assert.equal(saveNews.success, true);

    const retrievedNews = await getReceiptSnapshot(newsReceipt.receiptId);
    assert(retrievedNews !== null);
    assert.equal(retrievedNews.evidence[0].publicUrl, 'https://www.cnbcindonesia.com/market/20260922-investor-asing-net-sell-bbri');
    assert.equal(retrievedNews.interpreted.publisher, 'CNBC');
    assert.equal(retrievedNews.interpreted.date, null);
    console.log('  ✓ Simpan → Buka kembali snapshot berita dengan publicUrl sumber berita berhasil');

    // D. Uji 404 (UUID valid tetapi tidak ada di database)
    const nonExistentUUID = '00000000-0000-4000-8000-000000000000';
    const notFoundRes = await getReceiptSnapshot(nonExistentUUID);
    assert.equal(notFoundRes, null, 'UUID yang tidak ada di database harus mengembalikan null (404)');
    console.log('  ✓ UUID yang tidak ada di database mengembalikan null (404)');
  } finally {
    Pool.prototype.query = origPoolQuery;
    await closeDbPool();
  }
}

// 4. Uji Penanganan Kegagalan Penyimpanan Database (Storage Failure)
console.log('\n4. Uji Penanganan Error Saat Penyimpanan Database:');
async function testStorageFailureHandling() {
  process.env.DATABASE_URL = 'postgresql://mockuser:mockpass@localhost:5432/mockdb';
  await closeDbPool();

  const origPoolQuery = Pool.prototype.query;

  // Mock database error (misal koneksi terputus atau constraint error)
  // @ts-ignore
  Pool.prototype.query = async function () {
    throw new Error('Connection terminated unexpectedly: ECONNREFUSED 5432');
  };

  try {
    const saveResult = await saveReceiptSnapshot(sampleReceipt);
    assert.equal(saveResult.success, false, 'saveReceiptSnapshot harus mengembalikan success: false saat DB error');
    assert(saveResult.error?.includes('ECONNREFUSED'), 'Error message DB harus dicatat');
    console.log('  ✓ DB error ditangani secara aman tanpa unhandled rejection');
  } finally {
    Pool.prototype.query = origPoolQuery;
    await closeDbPool();
  }
}

async function runAll() {
  await testUnconfiguredDb();
  await testSaveAndRetrieveMock();
  await testStorageFailureHandling();

  // Kembalikan environment semula jika ada
  if (origDbUrl) process.env.DATABASE_URL = origDbUrl;
  else delete process.env.DATABASE_URL;

  if (origPostgresUrl) process.env.POSTGRES_URL = origPostgresUrl;
  else delete process.env.POSTGRES_URL;

  await closeDbPool();

  console.log('\n🎉 Seluruh pengujian penyimpanan & pembacaan receipt permanen lolos 100%!\n');
}

runAll().catch((err) => {
  console.error('Error saat pengujian penyimpanan receipt:', err);
  process.exit(1);
});
