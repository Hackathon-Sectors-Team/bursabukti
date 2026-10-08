import assert from 'node:assert/strict';
import { parseClaim } from '../src/lib/verification/parser';
import { verifyClaim } from '../src/lib/verification/verifier';
import { SectorsClient } from '../src/lib/sectors/client';

console.log('🧪 Menjalankan Pengujian Penanganan Klaim Prediksi / Masa Depan...\n');

// Mock fixture
const bbriPriceFixture = [
  { symbol: 'BBRI', date: '2026-09-22', close: 3180 },
  { symbol: 'BBRI', date: '2026-09-23', close: 3190 },
];

async function runPredictiveTests() {
  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriPriceFixture;

  try {
    // Kasus 1: "BBRI akan naik di tahun 2026"
    const claim1 = 'BBRI akan naik di tahun 2026';
    const parsed1 = parseClaim(claim1);
    assert.equal(parsed1.symbol, 'BBRI.JK');
    assert.equal(parsed1.date, null, 'Tanggal spesifik harian harus null untuk klaim tahun/masa depan');
    assert.ok(
      parsed1.ambiguity.some((a) => a.includes('prediksi atau proyeksi masa depan')),
      'Ambiguity harus memuat catatan prediksi/proyeksi masa depan'
    );

    const receipt1 = await verifyClaim(claim1, parsed1, 'fallback_heuristic');
    assert.equal(receipt1.status, 'insufficient_evidence', 'Klaim prediksi harus berstatus insufficient_evidence');
    assert.equal(
      receipt1.reason,
      'Klaim ini merupakan prediksi atau proyeksi masa depan yang belum dapat dibuktikan dengan data historis transaksi bursa.'
    );
    assert.ok(
      receipt1.limitations.some((l) => l.includes('Data historis transaksi bursa hanya mencakup catatan masa lalu')),
      'Limitations harus menjelaskan batasan data historis'
    );
    console.log('  ✓ [T-PRED-01] Klaim "BBRI akan naik di tahun 2026" -> status: insufficient_evidence & alasan prediksi tepat');

    // Kasus 2: "BBCA diprediksi menguat ke 12.000 di akhir tahun"
    const claim2 = 'BBCA diprediksi menguat ke 12.000 di akhir tahun';
    const parsed2 = parseClaim(claim2);
    const receipt2 = await verifyClaim(claim2, parsed2, 'fallback_heuristic');
    assert.equal(receipt2.status, 'insufficient_evidence');
    assert.equal(
      receipt2.reason,
      'Klaim ini merupakan prediksi atau proyeksi masa depan yang belum dapat dibuktikan dengan data historis transaksi bursa.'
    );
    console.log('  ✓ [T-PRED-02] Klaim "BBCA diprediksi menguat..." -> status: insufficient_evidence');

    // Kasus 3: "Target harga BMRI 8.000 tahun depan"
    const claim3 = 'Target harga BMRI 8.000 tahun depan';
    const parsed3 = parseClaim(claim3);
    const receipt3 = await verifyClaim(claim3, parsed3, 'fallback_heuristic');
    assert.equal(receipt3.status, 'insufficient_evidence');
    assert.equal(
      receipt3.reason,
      'Klaim ini merupakan prediksi atau proyeksi masa depan yang belum dapat dibuktikan dengan data historis transaksi bursa.'
    );
    console.log('  ✓ [T-PRED-03] Klaim "Target harga BMRI..." -> status: insufficient_evidence');

    // Kasus 4: Klaim historis valid tetap supported (tidak terpengaruh)
    const claimHistorical = 'BBRI naik 0,31% pada 23 September 2026';
    const parsedHistorical = parseClaim(claimHistorical);
    const receiptHistorical = await verifyClaim(claimHistorical, parsedHistorical, 'fallback_heuristic');
    assert.equal(receiptHistorical.status, 'supported');
    console.log('  ✓ [T-HIST-01] Klaim historis 23 September 2026 tetap supported');
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

runPredictiveTests().then(() => {
  console.log('\n🎉 Seluruh pengujian klaim prediksi lolos 100%!\n');
}).catch((err) => {
  console.error('❌ Pengujian gagal:', err);
  process.exit(1);
});
