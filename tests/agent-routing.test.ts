import assert from 'node:assert/strict';
import { validateAndSanitizeAgentOutput, extractClaimWithAgent, getAgentConfig } from '../src/lib/agent/extractor';

console.log('🧪 Menjalankan Pengujian Modul AI Agent BursaBukti...\n');

// 1. Uji Validasi Ketat Output Model AI
console.log('1. Uji Validasi Server terhadap Output Model:');

// Kasus 1: Output Standar Harga
const rawPrice = {
  category: 'price_change',
  symbol: 'BBRI',
  date: '2026-09-23',
  operator: 'up',
  statedValue: 0.31,
  unit: 'percent',
  ambiguity: [],
};
const v1 = validateAndSanitizeAgentOutput(rawPrice);
assert.equal(v1.category, 'price_change');
assert.equal(v1.symbol, 'BBRI.JK', 'Simbol harus dinormalisasi dengan .JK');
assert.equal(v1.date, '2026-09-23');
assert.equal(v1.statedValue, 0.31);
assert.equal(v1.operator, 'up');
console.log('  ✓ Validasi klaim harga standar lolos');

// Kasus 2: Format Penurunan (Harus Konsisten Bertanda Negatif)
const rawDrop = {
  category: 'price_change',
  symbol: 'TLKM.JK',
  date: '2026-09-23',
  operator: 'down',
  statedValue: 1.5, // Model mungkin mengirim angka positif dengan operator down
  unit: 'percent',
  ambiguity: [],
};
const v2 = validateAndSanitizeAgentOutput(rawDrop);
assert.equal(v2.statedValue, -1.5, 'statedValue untuk operator down harus dinormalisasi menjadi negatif');
assert.equal(v2.operator, 'down');
console.log('  ✓ Normalisasi angka penurunan ke negatif (-1.5) konsisten');

// Kasus 3: Klaim Berita dengan Keywords, CoreAssertion, dan Publisher (Tanpa Tanggal)
const rawNews = {
  category: 'news_mention',
  symbol: 'BBRI',
  date: null,
  keywords: ['investor', 'asing', 'net', 'sell'],
  coreAssertion: 'investor asing melakukan net sell pada saham BBRI',
  publisher: 'CNBC',
  ambiguity: [],
};
const v3 = validateAndSanitizeAgentOutput(rawNews);
assert.equal(v3.category, 'news_mention');
assert.equal(v3.symbol, 'BBRI.JK');
assert.equal(v3.date, null, 'Tanggal harus null jika tidak ada');
assert.equal(v3.publisher, 'CNBC', 'Publisher harus tervalidasi');
assert.deepEqual(v3.keywords, ['investor', 'asing', 'net', 'sell']);
assert.equal(v3.coreAssertion, 'investor asing melakukan net sell pada saham BBRI');
console.log('  ✓ Ekstraksi dan sanitasi kategori berita (termasuk publisher & date=null) lolos');

// Kasus 4: Sanitasi Simbol Ilegal / Path Traversal Protection
const rawMalicious = {
  category: 'price_change',
  symbol: '../../etc/passwd',
  date: '2026-09-23',
  ambiguity: [],
};
const v4 = validateAndSanitizeAgentOutput(rawMalicious);
assert.equal(v4.symbol, null, 'Simbol ilegal harus ditolak menjadi null');
assert(v4.ambiguity.length > 0, 'Ambiguitas harus mencatat format simbol tidak valid');
console.log('  ✓ Proteksi sanitasi simbol berbahaya aman');

// 2. Uji Konfigurasi Model Dinamis via Environment
console.log('\n2. Uji Konfigurasi Nama Model via Environment Variable:');
const origModel = process.env.GEMINI_MODEL;
try {
  process.env.GEMINI_MODEL = 'gemini-1.5-flash';
  const cfg1 = getAgentConfig();
  assert.equal(cfg1.model, 'gemini-1.5-flash', 'Model harus mengikuti GEMINI_MODEL');

  delete process.env.GEMINI_MODEL;
  const cfg2 = getAgentConfig();
  assert.equal(cfg2.model, 'gemini-3.7-flash', 'Default model harus gemini-3.7-flash');
  console.log('  ✓ Nama model dapat diatur dinamis lewat .env.local');
} finally {
  if (origModel) {
    process.env.GEMINI_MODEL = origModel;
  }
}

// 3. Uji Mekanisme Fallback Eksplisit (Saat Tanpa API Key atau Error)
console.log('\n3. Uji Fallback Eksplisit ke Heuristik Parser:');
async function testFallback() {
  const result = await extractClaimWithAgent('BBRI naik 0,31% pada 23 September 2026', { apiKey: '' });
  assert.equal(result.extractorSource, 'fallback_heuristic');
  assert.equal(result.extracted.symbol, 'BBRI.JK');
  assert.equal(result.extracted.date, '2026-09-23');
  assert(result.fallbackReason?.includes('GEMINI_API_KEY tidak dikonfigurasi'));
  console.log('  ✓ extractClaimWithAgent tanpa API key mengembalikan fallback_heuristic dengan alasan jelas');
}

// 4. Uji Transparansi Fallback Antar-Model (Primary Model 503 -> Secondary Model Success)
console.log('\n4. Uji Transparansi Failover Antar-Model:');
async function testModelFailoverTransparency() {
  const originalFetch = global.fetch;

  // Mock fetch: request pertama (gemini-3.7-flash) menghasilkan 503, request kedua (gemini-3.1-flash-lite) berhasil
  let callCount = 0;
  global.fetch = async (url: RequestInfo | URL) => {
    callCount++;
    const urlStr = String(url);
    if (urlStr.includes('gemini-3.7-flash')) {
      return new Response('The model is overloaded.', { status: 503, statusText: 'Service Unavailable' });
    }
    if (urlStr.includes('gemini-3.1-flash-lite')) {
      const responsePayload = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    category: 'price_change',
                    symbol: 'BBRI.JK',
                    date: '2026-09-23',
                    operator: 'up',
                    statedValue: 0.31,
                    unit: 'percent',
                    ambiguity: [],
                  }),
                },
              ],
            },
          },
        ],
      };
      return new Response(JSON.stringify(responsePayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response('Not Found', { status: 404 });
  };

  try {
    const result = await extractClaimWithAgent('BBRI naik 0,31% pada 23 September 2026', {
      apiKey: 'test-key',
      model: 'gemini-3.7-flash',
    });

    assert.equal(result.extractorSource, 'ai_agent');
    assert.equal(result.modelRequested, 'gemini-3.7-flash', 'modelRequested harus mencatat model yang dikonfigurasi');
    assert.equal(result.modelUsed, 'gemini-3.1-flash-lite', 'modelUsed harus model yang benar-benar memberi respons');
    assert(result.fallbackReason !== undefined, 'fallbackReason harus terisi jika terjadi failover antar-model');
    assert(result.fallbackReason?.includes('gemini-3.7-flash'), 'fallbackReason harus mencatat model utama yang gagal');
    assert(result.fallbackReason?.includes('gemini-3.1-flash-lite'), 'fallbackReason harus mencatat model pengganti');
    console.log('  ✓ Failover antar-model (3.7-flash 503 -> 3.1-flash-lite) tercatat transparan (modelUsed: 3.1-flash-lite, modelRequested: 3.7-flash)');
  } finally {
    global.fetch = originalFetch;
  }
}

async function runAll() {
  await testFallback();
  await testModelFailoverTransparency();
  console.log('\n🎉 Seluruh pengujian AI Agent routing & validasi lolos 100%!\n');
}

runAll().catch(err => {
  console.error('Error saat pengujian agent:', err);
  process.exit(1);
});
