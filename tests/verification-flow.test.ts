import assert from 'node:assert/strict';
import { parseClaim } from '../src/lib/verification/parser';
import { verifyPriceClaim } from '../src/lib/verification/verifier';
import { SectorsClient } from '../src/lib/sectors/client';

console.log('🧪 Menjalankan Pengujian Alur Verifikasi P0 dengan Fixture BBRI...\n');

// Buat mock fixture untuk data Sectors API BBRI (22 & 23 Sep 2026)
const bbriFixture = [
  { symbol: 'BBRI', date: '2026-09-22', close: 3180 },
  { symbol: 'BBRI', date: '2026-09-23', close: 3190 },
];

// Test T-01: Supported
async function testT01() {
  const claim = 'BBRI naik 0,31% pada 23 September 2026';
  const extracted = parseClaim(claim);

  // Jalankan verifier langsung dengan mock getDailyPrices
  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriFixture;

  try {
    const receipt = await verifyPriceClaim(claim, extracted);
    assert.equal(receipt.status, 'supported', 'Status harus supported');
    assert.equal(receipt.interpreted.symbol, 'BBRI.JK');
    assert.equal(receipt.interpreted.date, '2026-09-23');
    assert.equal(receipt.calculation?.previous, 3180);
    assert.equal(receipt.calculation?.current, 3190);
    assert.equal(receipt.evidence[0].endpoint, '/daily/BBRI/');
    assert.equal(receipt.evidence[0].publicUrl, null);
    assert.equal(receipt.rulesVersion, 'price-v1');
    console.log('  ✓ [T-01] Klaim BBRI +0,31% 23/09/2026 -> Status: supported');
    console.log('           Alasan:', receipt.reason);
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

// Test T-02: Contradicted
async function testT02() {
  const claim = 'BBRI naik 3% pada 23 September 2026';
  const extracted = parseClaim(claim);

  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriFixture;

  try {
    const receipt = await verifyPriceClaim(claim, extracted);
    assert.equal(receipt.status, 'contradicted', 'Status harus contradicted');
    assert(receipt.reason.includes('Klaim menyatakan +3,00%'), 'Harus menjelaskan klaim bertentangan');
    assert(receipt.reason.includes('3180'), 'Harus mengutip penutupan sebelumnya 3180');
    assert(receipt.reason.includes('3190'), 'Harus mengutip penutupan target 3190');
    console.log('  ✓ [T-02] Klaim BBRI +3% 23/09/2026 -> Status: contradicted');
    console.log('           Alasan:', receipt.reason);
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

// Test T-03: Insufficient evidence (Target date missing)
async function testT03() {
  const claim = 'BBRI naik 0,31% pada 24 September 2026';
  const extracted = parseClaim(claim);

  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriFixture; // hanya ada s.d 23 Sep

  try {
    const receipt = await verifyPriceClaim(claim, extracted);
    assert.equal(receipt.status, 'insufficient_evidence', 'Status harus insufficient_evidence');
    assert(receipt.reason.includes('tidak ditemukan'), 'Harus menyatakan data tanggal target tidak ditemukan');
    assert.equal(receipt.evidence[0].dataDate, null, 'dataDate harus null jika tanggal target tidak ada record');
    assert.deepEqual(receipt.evidence[0].safeParams, { start: '2026-09-14', end: '2026-09-24' }, 'safeParams harus sesuai request aktual');
    console.log('  ✓ [T-03] Baris target tidak ada -> Status: insufficient_evidence, dataDate: null');
    console.log('           Alasan:', receipt.reason);
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

// Test T-04: Insufficient evidence (Ambiguous relative date "kemarin")
async function testT04() {
  const claim = 'BBRI naik kemarin';
  const extracted = parseClaim(claim);

  const receipt = await verifyPriceClaim(claim, extracted);
  assert.equal(receipt.status, 'insufficient_evidence', 'Status harus insufficient_evidence');
  assert(receipt.reason.includes('kemarin'), 'Harus mendeteksi ambiguitas kata kemarin');
  console.log('  ✓ [T-04] Klaim ambigu "kemarin" -> Status: insufficient_evidence');
  console.log('           Alasan:', receipt.reason);
}

// Test T-09: Provenance and null publicUrl
async function testT09() {
  const claim = 'BBRI naik 0,31% pada 23 September 2026';
  const extracted = parseClaim(claim);

  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriFixture;

  try {
    const receipt = await verifyPriceClaim(claim, extracted);
    assert.equal(receipt.evidence[0].publicUrl, null, 'publicUrl harus null untuk data harga');
    assert.equal(receipt.evidence[0].endpoint, '/daily/BBRI/');
    assert(receipt.limitations.length > 0, 'limitations harus terisi');
    console.log('  ✓ [T-09] Receipt harga: publicUrl=null, provenance endpoint & limitasi tercatat.');
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

async function runAll() {
  await testT01();
  await testT02();
  await testT03();
  await testT04();
  await testT09();
  console.log('\n🏆 Seluruh skenario pengujian verifikasi P0 lolos dengan sempurna!\n');
}

runAll().catch(err => {
  console.error('Error saat pengujian:', err);
  process.exit(1);
});
