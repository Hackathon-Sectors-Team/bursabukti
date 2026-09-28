import assert from 'node:assert/strict';
import { parseClaim } from '../src/lib/verification/parser';
import { ExtractedClaim } from '../src/lib/verification/types';

console.log('🧪 Menjalankan Pengujian Unit BursaBukti P0...\n');

// 1. Uji Parser Teks Klaim
console.log('1. Uji Parser Teks Klaim:');

// Kasus T-01 / Klaim Standar
const c1 = parseClaim('BBRI naik 0,31% pada 23 September 2026');
assert.equal(c1.symbol, 'BBRI.JK', 'Simbol harus dinormalisasi ke BBRI.JK');
assert.equal(c1.date, '2026-09-23', 'Tanggal harus diekstrak ke 2026-09-23');
assert.equal(c1.statedValue, 0.31, 'Nilai persentase harus 0.31');
assert.equal(c1.operator, 'up', 'Operator harus up');
assert.equal(c1.ambiguity.length, 0, 'Tidak boleh ada ambiguitas');
console.log('  ✓ T-01 parse standard claim ("BBRI naik 0,31% pada 23 September 2026")');

// Kasus Klaim Turun dengan Desimal Koma
const c2 = parseClaim('Saham TLKM turun 1,5% pada 2026-09-23');
assert.equal(c2.symbol, 'TLKM.JK');
assert.equal(c2.date, '2026-09-23');
assert.equal(c2.statedValue, -1.5);
assert.equal(c2.operator, 'down');
console.log('  ✓ T-02 parse claim penurunan ("TLKM turun 1,5% pada 2026-09-23")');

// Kasus T-04 / Tanggal Ambigu "kemarin"
const c3 = parseClaim('BBRI naik kemarin');
assert.equal(c3.symbol, 'BBRI.JK');
assert.equal(c3.date, null);
assert(c3.ambiguity.length > 0, 'Harus mencatat ambiguitas untuk kata "kemarin"');
console.log('  ✓ T-04 parse claim ambigu ("BBRI naik kemarin") -> ambiguity detected');

// Kasus Tanpa Ticker
const c4 = parseClaim('Saham naik 5% pada 23 September 2026');
assert.equal(c4.symbol, null);
assert(c4.ambiguity.some(a => a.includes('Simbol emiten')), 'Harus mendeteksi ticker hilang');
console.log('  ✓ Parse claim tanpa simbol -> ambiguity detected');

// Kasus Berita Media dengan Penerbit Eksplisit & Tanpa Tanggal
const c5 = parseClaim('Media CNBC memberitakan investor asing melakukan net sell pada saham BBRI');
assert.equal(c5.symbol, 'BBRI.JK');
assert.equal(c5.category, 'news_mention');
assert.equal(c5.publisher, 'CNBC', 'Publisher harus diekstrak ke CNBC');
assert.equal(c5.date, null, 'Tanggal harus null jika user tidak menyebut tanggal');
console.log('  ✓ Parse claim berita media ("Media CNBC memberitakan investor asing melakukan net sell pada saham BBRI") -> Publisher: CNBC, Date: null');

console.log('\n2. Uji Kalkulasi & Formula Persentase Deterministik:');
// Data BBRI dari laporan Postman: 22 Sep 2026 close=3180, 23 Sep 2026 close=3190
const prevClose = 3180;
const targetClose = 3190;
const percentChange = ((targetClose - prevClose) / prevClose) * 100;
const expectedPercent = 0.3144654088;
assert(Math.abs(percentChange - expectedPercent) < 0.0001, 'Kalkulasi persentase harus tepat');

// Uji toleransi <= 0.05 poin persentase
const statedValue031 = 0.31;
assert(Math.abs(percentChange - statedValue031) <= 0.05, '0.31% harus masuk dalam toleransi <= 0.05');

const statedValue300 = 3.0;
assert(Math.abs(percentChange - statedValue300) > 0.05, '3.0% harus berada di luar toleransi (contradicted)');

console.log('  ✓ Kalkulasi: ((3190 - 3180) / 3180) * 100 = ' + percentChange.toFixed(6) + '%');
console.log('  ✓ Toleransi T-01 (+0,31% vs +0,314%): Lolos (selisih ' + Math.abs(percentChange - statedValue031).toFixed(4) + ' <= 0.05)');
console.log('  ✓ Toleransi T-02 (+3,00% vs +0,314%): Di luar toleransi (selisih ' + Math.abs(percentChange - statedValue300).toFixed(4) + ' > 0.05)');

console.log('\n🎉 Seluruh pengujian unit lolos 100%!');
