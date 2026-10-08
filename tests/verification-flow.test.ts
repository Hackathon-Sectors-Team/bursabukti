import assert from 'node:assert/strict';
import { parseClaim } from '../src/lib/verification/parser';
import { verifyClaim, verifyPriceClaim, verifyNewsClaim } from '../src/lib/verification/verifier';
import { SectorsClient } from '../src/lib/sectors/client';
import { NewsArticleRecord } from '../src/lib/sectors/types';

console.log('🧪 Menjalankan Pengujian Alur Verifikasi BursaBukti (Harga, Berita, Fallback)...\n');

// Mock fixtures
const bbriPriceFixture = [
  { symbol: 'BBRI', date: '2026-09-22', close: 3180 },
  { symbol: 'BBRI', date: '2026-09-23', close: 3190 },
];

const bbcaNewsFixture: NewsArticleRecord[] = [
  {
    id: 'news-1',
    title: 'BCA Resmi Meluncurkan Fitur Paylater Digital untuk Nasabah',
    body: 'PT Bank Central Asia Tbk (BBCA) mengumumkan peluncuran fitur paylater digital baru yang terintegrasi pada aplikasi myBCA...',
    source: 'https://finance.detik.com/moneter/bca-luncurkan-paylater',
    timestamp: '2026-09-20T10:00:00Z',
    symbols: ['BBCA'],
    url: 'https://finance.detik.com/moneter/bca-luncurkan-paylater',
  },
  {
    id: 'news-2',
    title: 'Rapat Umum Pemegang Saham Luar Biasa BBCA',
    body: 'BCA menyelenggarakan RUPSLB di Jakarta membahas agenda kepengurusan...',
    source: 'CNBC Indonesia',
    timestamp: '2026-09-15T08:00:00Z',
    symbols: ['BBCA'],
  },
];

// Test T-01: Price Supported
async function testT01() {
  const claim = 'BBRI naik 0,31% pada 23 September 2026';
  const extracted = parseClaim(claim);

  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriPriceFixture;

  try {
    const receipt = await verifyPriceClaim(claim, extracted, 'ai_agent', 'gemini-2.5-flash');
    assert.equal(receipt.status, 'supported', 'Status harus supported');
    assert.equal(receipt.interpreted.symbol, 'BBRI.JK');
    assert.equal(receipt.interpreted.date, '2026-09-23');
    assert.equal(receipt.calculation?.previous, 3180);
    assert.equal(receipt.calculation?.current, 3190);
    assert.equal(receipt.evidence[0].endpoint, '/daily/BBRI/');
    assert.equal(receipt.evidence[0].publicUrl, 'https://sectors.app/');
    assert.equal(receipt.rulesVersion, 'price-v1');
    assert.equal(receipt.extractorSource, 'ai_agent');
    assert.equal(receipt.modelUsed, 'gemini-2.5-flash');
    console.log('  ✓ [T-01] Klaim BBRI +0,31% 23/09/2026 -> Status: supported');
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

// Test T-02: Price Contradicted
async function testT02() {
  const claim = 'BBRI naik 3% pada 23 September 2026';
  const extracted = parseClaim(claim);

  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriPriceFixture;

  try {
    const receipt = await verifyPriceClaim(claim, extracted);
    assert.equal(receipt.status, 'contradicted', 'Status harus contradicted');
    assert(receipt.reason.includes('Klaim menyatakan +3,00%'), 'Harus menjelaskan klaim bertentangan');
    assert(receipt.reason.includes('3180'), 'Harus mengutip penutupan sebelumnya 3180');
    assert(receipt.reason.includes('3190'), 'Harus mengutip penutupan target 3190');
    console.log('  ✓ [T-02] Klaim BBRI +3% 23/09/2026 -> Status: contradicted');
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

// Test T-03: Missing target date -> insufficient_evidence
async function testT03() {
  const claim = 'BBRI naik 0,31% pada 24 September 2026';
  const extracted = parseClaim(claim);

  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriPriceFixture;

  try {
    const receipt = await verifyPriceClaim(claim, extracted);
    assert.equal(receipt.status, 'insufficient_evidence', 'Status harus insufficient_evidence');
    assert(receipt.reason.includes('tidak ditemukan'), 'Harus menyatakan data tanggal target tidak ditemukan');
    console.log('  ✓ [T-03] Baris target tidak ada -> Status: insufficient_evidence');
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

// Test T-04: Ambiguity relative date -> insufficient_evidence
async function testT04() {
  const claim = 'BBRI naik kemarin';
  const extracted = parseClaim(claim);

  const receipt = await verifyPriceClaim(claim, extracted);
  assert.equal(receipt.status, 'insufficient_evidence', 'Status harus insufficient_evidence');
  assert(receipt.reason.includes('kemarin'), 'Harus mendeteksi ambiguitas kata kemarin');
  console.log('  ✓ [T-04] Klaim ambigu "kemarin" -> Status: insufficient_evidence');
}

// Test T-NEWS-01: News claim with substantive match in article content -> supported + link
async function testNewsSupported() {
  const claim = 'Media memberitakan BBCA meluncurkan fitur paylater';
  const extracted = parseClaim(claim);

  const origGetNews = SectorsClient.prototype.getNews;
  SectorsClient.prototype.getNews = async () => bbcaNewsFixture;

  try {
    const receipt = await verifyNewsClaim(claim, extracted, 'ai_agent', 'gemini-2.5-flash');
    assert.equal(receipt.status, 'supported', 'Status harus supported saat isi artikel cocok');
    assert(receipt.reason.includes('Paylater') || receipt.reason.includes('paylater'), 'Alasan harus menyebut artikel paylater');
    assert.equal(receipt.evidence[0].endpoint, '/news/');
    assert.equal(receipt.evidence[0].publicUrl, 'https://finance.detik.com/moneter/bca-luncurkan-paylater', 'publicUrl harus memuat link sumber publik');
    assert(receipt.limitations.some(l => l.includes('publikasi media')), 'Harus memuat limitasi verifikasi berita');
    console.log('  ✓ [T-NEWS-01] Berita dengan isi cocok -> Status: supported, Link:', receipt.evidence[0].publicUrl);
  } finally {
    SectorsClient.prototype.getNews = origGetNews;
  }
}

// Test T-NEWS-02: News claim where only symbol/keyword matches but substantive claim is NOT matched -> insufficient_evidence
async function testNewsKeywordOnly() {
  const claim = 'Media memberitakan BBCA mengakuisisi bank luar negeri di Eropa';
  const extracted = parseClaim(claim);

  const origGetNews = SectorsClient.prototype.getNews;
  SectorsClient.prototype.getNews = async () => bbcaNewsFixture; // Hanya berita paylater & rups, tidak ada akuisisi bank luar negeri

  try {
    const receipt = await verifyNewsClaim(claim, extracted);
    assert.equal(receipt.status, 'insufficient_evidence', 'Kecocokan simbol saja tanpa bukti isi harus insufficient_evidence');
    assert(receipt.reason.includes('tidak memuat bukti yang mengonfirmasi'), 'Alasan harus menjelaskan ketidakcocokan isi');
    assert(receipt.limitations.some(l => l.includes('Kecocokan simbol atau kata kunci umum saja tidak cukup')), 'Harus memuat limitasi ketat');
    console.log('  ✓ [T-NEWS-02] Simbol cocok tapi isi artikel tidak cocok -> Status: insufficient_evidence (tanpa memaksa verdict)');
  } finally {
    SectorsClient.prototype.getNews = origGetNews;
  }
}

// Test T-NEWS-03: News claim with no articles found
async function testNewsNoArticles() {
  const claim = 'Media memberitakan GOTO meluncurkan mobil terbang';
  const extracted = parseClaim(claim);

  const origGetNews = SectorsClient.prototype.getNews;
  SectorsClient.prototype.getNews = async () => [];

  try {
    const receipt = await verifyNewsClaim(claim, extracted);
    assert.equal(receipt.status, 'insufficient_evidence');
    assert(receipt.reason.includes('Tidak ditemukan artikel berita'), 'Harus menyatakan artikel tidak ditemukan');
    console.log('  ✓ [T-NEWS-03] Tidak ada artikel untuk ticker -> Status: insufficient_evidence');
  } finally {
    SectorsClient.prototype.getNews = origGetNews;
  }
}

// Test T-NEWS-04 (REGRESI): Media CNBC klaim BBRI net sell vs Artikel IDNFinancials BBCA -> insufficient_evidence
async function testNewsPublisherMismatchRegression() {
  const claim = 'Media CNBC memberitakan investor asing melakukan net sell pada saham BBRI';
  const extracted = parseClaim(claim);

  assert.equal(extracted.symbol, 'BBRI.JK', 'Simbol harus diekstrak ke BBRI.JK');
  assert.equal(extracted.publisher, 'CNBC', 'Publisher harus diekstrak ke CNBC');
  assert.equal(extracted.date, null, 'Tanggal klaim harus null (tidak boleh menyimpulkan tanggal)');

  const idnFinancialsBbcaFixture: NewsArticleRecord[] = [
    {
      id: 'news-bbca-1',
      title: 'Kinerja Saham BBCA Menguat Ditopang Pertumbuhan Kredit Korporasi',
      body: 'PT Bank Central Asia Tbk (BBCA) mencatatkan pertumbuhan transaksi dan volume perdagangan yang stabil sepanjang kuartal ini...',
      source: 'IDNFinancials',
      timestamp: '2026-09-22T08:00:00Z',
      symbols: ['BBCA'],
      url: 'https://www.idnfinancials.com/news/51234/bbca-kinerja-menguat',
    },
  ];

  const origGetNews = SectorsClient.prototype.getNews;
  SectorsClient.prototype.getNews = async () => idnFinancialsBbcaFixture;

  try {
    const receipt = await verifyNewsClaim(claim, extracted, 'ai_agent', 'gemini-3.7-flash');
    assert.equal(receipt.status, 'insufficient_evidence', 'Artikel IDNFinancials tentang BBCA TIDAK BOLEH menghasilkan supported');
    assert.equal(receipt.interpreted.symbol, 'BBRI.JK', 'Simbol di receipt interpreted harus BBRI.JK');
    assert.equal(receipt.interpreted.publisher, 'CNBC', 'Publisher di receipt interpreted harus CNBC');
    assert.equal(receipt.interpreted.date, null, 'Interpreted date harus null jika user tidak menyebutkan tanggal');
    assert(receipt.reason.includes('CNBC') || receipt.reason.includes('BBRI'), 'Alasan harus menjelaskan ketidaksesuaian artikel/media');
    console.log('  ✓ [T-NEWS-04 Regresi] Klaim CNBC BBRI vs Artikel IDNFinancials BBCA -> Status: insufficient_evidence (Date=null, Publisher=CNBC)');
  } finally {
    SectorsClient.prototype.getNews = origGetNews;
  }
}

// Test T-NEWS-05: Media CNBC klaim BBRI net sell vs Artikel CNBC BBRI net sell -> supported
async function testNewsPublisherMatchSupported() {
  const claim = 'Media CNBC memberitakan investor asing melakukan net sell pada saham BBRI';
  const extracted = parseClaim(claim);

  const cnbcBbriFixture: NewsArticleRecord[] = [
    {
      id: 'news-bbri-cnbc-1',
      title: 'Investor Asing Melakukan Net Sell Saham BBRI Sebesar Rp 250 Miliar',
      body: 'Arus modal keluar terlihat pada saham PT Bank Rakyat Indonesia Tbk (BBRI) seiring aksi net sell pemodal asing di pasar reguler...',
      source: 'CNBC Indonesia',
      timestamp: '2026-09-22T11:00:00Z',
      symbols: ['BBRI'],
      url: 'https://www.cnbcindonesia.com/market/20260922-investor-asing-net-sell-bbri',
    },
  ];

  const origGetNews = SectorsClient.prototype.getNews;
  SectorsClient.prototype.getNews = async () => cnbcBbriFixture;

  try {
    const receipt = await verifyNewsClaim(claim, extracted, 'ai_agent', 'gemini-3.7-flash');
    assert.equal(receipt.status, 'supported', 'Status harus supported jika penerbit dan substansi artikel cocok');
    assert.equal(receipt.interpreted.symbol, 'BBRI.JK');
    assert.equal(receipt.interpreted.publisher, 'CNBC');
    assert.equal(receipt.interpreted.date, null, 'Interpreted date harus tetap null sesuai klaim pengguna');
    assert.equal(receipt.evidence[0].dataDate, '2026-09-22', 'Tanggal publikasi artikel tersimpan di evidence.dataDate');
    assert.equal(receipt.evidence[0].publicUrl, 'https://www.cnbcindonesia.com/market/20260922-investor-asing-net-sell-bbri');
    console.log('  ✓ [T-NEWS-05] Klaim CNBC BBRI vs Artikel CNBC BBRI net sell -> Status: supported, URL:', receipt.evidence[0].publicUrl);
  } finally {
    SectorsClient.prototype.getNews = origGetNews;
  }
}

// Test T-FALLBACK: Fallback heuristic parser is explicitly recorded
async function testFallbackExplicit() {
  const claim = 'BBRI naik 0,31% pada 23 September 2026';
  const extracted = parseClaim(claim);

  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriPriceFixture;

  try {
    const receipt = await verifyClaim(claim, extracted, 'fallback_heuristic');
    assert.equal(receipt.extractorSource, 'fallback_heuristic');
    assert(receipt.limitations.some(l => l.includes('fallback')), 'Limitations harus mencatat terjadi fallback');
    console.log('  ✓ [T-FALLBACK] Fallback heuristik tercatat eksplisit di receipt limitations');
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

// Test T-UNSUPPORTED: Financial metric is safely rejected with scope limitation
async function testUnsupportedCategory() {
  const claim = 'Laba bersih BBRI kuartal I 2026 naik 15%';
  const extracted = parseClaim(claim);
  assert.equal(extracted.category, 'financial_metric');

  const receipt = await verifyClaim(claim, extracted);
  assert.equal(receipt.status, 'insufficient_evidence');
  assert(receipt.reason.includes('laporan keuangan'), 'Harus menjelaskan keterbatasan metrik keuangan');
  assert(receipt.limitations.some(l => l.includes('GET /daily/')), 'Harus mencantumkan scope yang saat ini didukung');
  console.log('  ✓ [T-UNSUPPORTED] Klaim laporan keuangan dikembalikan insufficient_evidence dengan batasan jelas');
}

// Test T-MODEL-FAILOVER: Failover between AI models is explicitly recorded in receipt limitations
async function testModelFailoverReceiptLimitations() {
  const claim = 'BBRI naik 0,31% pada 23 September 2026';
  const extracted = parseClaim(claim);

  const origMethod = SectorsClient.prototype.getDailyPrices;
  SectorsClient.prototype.getDailyPrices = async () => bbriPriceFixture;

  const failoverReason = 'Model yang dikonfigurasi (gemini-3.7-flash) dialihkan ke model cadangan (gemini-3.1-flash-lite) karena kendala: Model gemini-3.7-flash gagal (HTTP 503: The model is overloaded).';

  try {
    const receipt = await verifyClaim(
      claim,
      extracted,
      'ai_agent',
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      failoverReason
    );

    assert.equal(receipt.extractorSource, 'ai_agent');
    assert.equal(receipt.modelUsed, 'gemini-3.1-flash-lite', 'modelUsed harus gemini-3.1-flash-lite');
    assert.equal(receipt.modelRequested, 'gemini-3.7-flash', 'modelRequested harus gemini-3.7-flash');
    assert.equal(receipt.fallbackReason, failoverReason);
    assert(receipt.limitations.includes(failoverReason), 'Limitations harus memuat alasan perpindahan model secara eksplisit');
    console.log('  ✓ [T-MODEL-FAILOVER] Perpindahan model tercatat di limitations receipt (modelRequested: 3.7-flash, modelUsed: 3.1-flash-lite)');
  } finally {
    SectorsClient.prototype.getDailyPrices = origMethod;
  }
}

async function runAll() {
  await testT01();
  await testT02();
  await testT03();
  await testT04();
  await testNewsSupported();
  await testNewsKeywordOnly();
  await testNewsNoArticles();
  await testNewsPublisherMismatchRegression();
  await testNewsPublisherMatchSupported();
  await testFallbackExplicit();
  await testModelFailoverReceiptLimitations();
  await testUnsupportedCategory();
  console.log('\n🏆 Seluruh skenario pengujian verifikasi (Harga, Berita, Fallback, Model Failover, Batasan) lolos 100%!\n');
}

runAll().catch(err => {
  console.error('Error saat pengujian:', err);
  process.exit(1);
});
