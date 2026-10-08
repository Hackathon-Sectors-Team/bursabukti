import assert from 'node:assert/strict';
import {
  isAllowedImageMime,
  MAX_IMAGE_SIZE_BYTES,
  validateAndSanitizeVisionOutput,
  extractClaimFromImage,
} from '../src/lib/agent/image-extractor';

console.log('🧪 Menjalankan Pengujian Ekstraksi Gambar & Vision OCR BursaBukti...\n');

// 1. Uji Validasi MIME Type dan Ukuran
console.log('1. Uji Validasi Tipe MIME & Ukuran Gambar:');
assert.equal(isAllowedImageMime('image/png'), true);
assert.equal(isAllowedImageMime('image/jpeg'), true);
assert.equal(isAllowedImageMime('image/webp'), true);
assert.equal(isAllowedImageMime('image/gif'), false);
assert.equal(isAllowedImageMime('application/pdf'), false);
assert.equal(isAllowedImageMime('text/plain'), false);
console.log('  ✓ Validasi MIME type (PNG, JPEG, WebP) lolos');

assert.equal(MAX_IMAGE_SIZE_BYTES, 5 * 1024 * 1024);
console.log('  ✓ Batas ukuran file 5 MB terkonfigurasi');

// 2. Uji Sanitasi Output AI Vision
console.log('2. Uji Sanitasi Output AI Vision:');
const validVisionRaw = {
  isReadable: true,
  extractedText: 'Saham BBRI tercatat menguat 0,31% pada perdagangan 23 September 2026',
  suggestedTicker: 'BBRI',
  confidence: 'high',
  message: 'Teks terbaca dengan jelas',
};
const cleanVision = validateAndSanitizeVisionOutput(validVisionRaw);
assert.equal(cleanVision.isReadable, true);
assert.equal(cleanVision.extractedText, 'Saham BBRI tercatat menguat 0,31% pada perdagangan 23 September 2026');
assert.equal(cleanVision.suggestedTicker, 'BBRI');
assert.equal(cleanVision.confidence, 'high');
console.log('  ✓ Sanitasi output AI vision valid lolos');

// Gambar tidak terbaca
const unreadableRaw = {
  isReadable: false,
  extractedText: '',
  suggestedTicker: null,
  confidence: 'low',
  message: 'Gambar buram dan tidak memuat teks bursa.',
};
const unreadableClean = validateAndSanitizeVisionOutput(unreadableRaw);
assert.equal(unreadableClean.isReadable, false);
assert.equal(unreadableClean.extractedText, '');
assert.equal(unreadableClean.suggestedTicker, null);
assert.equal(unreadableClean.message, 'Gambar buram dan tidak memuat teks bursa.');
console.log('  ✓ Penanganan gambar buram/tidak terbaca lolos tanpa halusinasi');

// 3. Uji extractClaimFromImage dengan Penolakan Format & Ukuran
console.log('3. Uji Penolakan File Tidak Valid & Ukuran Berlebih:');
async function testRejection() {
  const dummyBuffer = Buffer.from('fake image data');

  // Format tidak valid
  const resInvalidMime = await extractClaimFromImage(dummyBuffer, 'image/gif');
  assert.equal(resInvalidMime.success, false);
  assert.match(resInvalidMime.message || '', /Format gambar "image\/gif" tidak didukung/);
  console.log('  ✓ Penolakan MIME format image/gif berhasil');

  // Ukuran melebihi 5MB
  const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
  const resTooLarge = await extractClaimFromImage(largeBuffer, 'image/png');
  assert.equal(resTooLarge.success, false);
  assert.match(resTooLarge.message || '', /melebihi batas maksimal 5 MB/);
  console.log('  ✓ Penolakan ukuran > 5MB berhasil');

  // Tanpa API Key
  const resNoKey = await extractClaimFromImage(dummyBuffer, 'image/png', { apiKey: '' });
  assert.equal(resNoKey.success, false);
  assert.equal(resNoKey.extractorSource, 'fallback');
  console.log('  ✓ Fallback saat API key belum dikonfigurasi berhasil');
}

testRejection().then(() => {
  console.log('\n🎉 Seluruh pengujian Ekstraksi Gambar & Vision OCR lolos 100%!\n');
}).catch((err) => {
  console.error('❌ Pengujian gagal:', err);
  process.exit(1);
});
