import { sectorsClient, NewsArticleRecord } from '../sectors';
import { ExtractedClaim, VerificationReceipt, VerificationStatus } from './types';

function formatPercentageID(num: number): string {
  const sign = num > 0 ? '+' : '';
  const formatted = num.toFixed(2).replace('.', ',');
  return `${sign}${formatted}%`;
}

function subtractDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  throw new Error('Web Crypto API (globalThis.crypto.randomUUID) tidak tersedia pada runtime ini.');
}

/**
 * Memeriksa kecocokan penerbit media antara klaim dan data artikel
 */
export function matchesPublisher(article: NewsArticleRecord, claimedPublisher: string): boolean {
  if (!claimedPublisher) return true;

  const normClaimed = claimedPublisher.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normSource = (article.source || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normUrl = (article.url || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normSource.includes(normClaimed) || normUrl.includes(normClaimed)) {
    return true;
  }

  // Khusus media populer di pasar modal Indonesia yang memiliki variasi nama/domain
  const aliasMap: Record<string, string[]> = {
    cnbc: ['cnbc', 'cnbcindonesia', 'cnbcindonesia.com'],
    kontan: ['kontan', 'kontan.co.id'],
    bisnis: ['bisnis', 'bisnisindonesia', 'bisnis.com'],
    detik: ['detik', 'detikfinance', 'detik.com'],
    idnfinancials: ['idnfinancials', 'idnfinancial', 'idn_financials'],
    bloomberg: ['bloomberg', 'bloombergtechnoz'],
    reuters: ['reuters'],
    kompas: ['kompas', 'kompas.com'],
    tempo: ['tempo', 'tempo.co'],
    investor: ['investor', 'investordaily', 'investor.id'],
  };

  for (const [key, aliases] of Object.entries(aliasMap)) {
    if (normClaimed.includes(key)) {
      if (aliases.some((alias) => normSource.includes(alias) || normUrl.includes(alias))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Melakukan verifikasi klaim harga saham berdasarkan hasil ekstraksi dan data Sectors API
 */
export async function verifyPriceClaim(
  rawClaim: string,
  extracted: ExtractedClaim,
  extractorSource: 'ai_agent' | 'fallback_heuristic' = 'fallback_heuristic',
  modelUsed?: string,
  modelRequested?: string,
  fallbackReason?: string
): Promise<VerificationReceipt> {
  const receiptId = generateUUID();
  const nowISO = new Date().toISOString();
  const rulesVersion = 'price-v1';
  const disclaimer = 'Pemeriksaan informasi, bukan rekomendasi investasi.';

  const limitations: string[] = [
    'Data melalui Sectors API; tautan publik langsung ke record belum tersedia.',
  ];

  if (fallbackReason) {
    limitations.push(fallbackReason);
  } else if (extractorSource === 'fallback_heuristic') {
    limitations.push('Pemeriksaan menggunakan parser heuristik cadangan (fallback) karena layanan AI tidak aktif/gagal.');
  }

  // 1. Periksa apakah ada ambiguitas atau parameter wajib yang tidak lengkap
  if (extracted.ambiguity.length > 0 || !extracted.symbol || !extracted.date) {
    const isPrediction = extracted.ambiguity.some((a) =>
      a.toLowerCase().includes('prediksi') ||
      a.toLowerCase().includes('proyeksi') ||
      a.toLowerCase().includes('masa depan')
    ) || /\b(akan|bakal|diprediksi|diproyeksikan|target\s+harga|ramalan|prediksi)\b/i.test(rawClaim);

    let reasonText: string;
    if (isPrediction) {
      reasonText = 'Klaim ini merupakan prediksi atau proyeksi masa depan yang belum dapat dibuktikan dengan data historis transaksi bursa.';
    } else if (extracted.ambiguity.length > 0) {
      reasonText = extracted.ambiguity.join(' ');
    } else {
      reasonText = 'Parameter klaim (simbol saham atau tanggal perdagangan) belum lengkap untuk diuji.';
    }

    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: extracted.category,
        symbol: extracted.symbol,
        date: extracted.date,
        statedValue: extracted.statedValue,
        unit: extracted.unit,
        coreAssertion: extracted.coreAssertion,
        publisher: extracted.publisher || null,
      },
      status: 'insufficient_evidence',
      reason: reasonText,
      evidence: [],
      limitations: [
        isPrediction
          ? 'Data historis transaksi bursa hanya mencakup catatan masa lalu; klaim berupa proyeksi atau prediksi masa depan tidak dapat dinyatakan benar/salah secara historis.'
          : 'Klaim membutuhkan simbol emiten IDX yang jelas dan tanggal perdagangan eksplisit.',
        ...limitations.filter((l) => l.includes('fallback') || l.includes('dialihkan')),
      ],
      rulesVersion,
      disclaimer,
      extractorSource,
      modelUsed,
      modelRequested,
      fallbackReason,
      verifiedAt: nowISO,
    };
  }

  // 2. Periksa batasan kategori P0
  if (extracted.category !== 'price_change') {
    let categoryReason = 'Kategori klaim belum didukung pada verifikasi harga.';
    if (extracted.category === 'financial_metric') {
      categoryReason = 'Klaim metrik laporan keuangan belum didukung pada rilis saat ini (memerlukan finalisasi SRS P1).';
    } else if (extracted.category === 'news_mention') {
      categoryReason = 'Klaim keberadaan artikel berita diarahkan ke verifikasi berita.';
    }

    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: extracted.category,
        symbol: extracted.symbol,
        date: extracted.date,
        statedValue: extracted.statedValue,
        unit: extracted.unit,
        coreAssertion: extracted.coreAssertion,
        publisher: extracted.publisher || null,
      },
      status: 'insufficient_evidence',
      reason: categoryReason,
      evidence: [],
      limitations: [
        'Verifikasi harga berfokus pada klaim perubahan harga harian saham IDX.',
        ...limitations.filter((l) => l.includes('fallback') || l.includes('dialihkan')),
      ],
      rulesVersion,
      disclaimer,
      extractorSource,
      modelUsed,
      modelRequested,
      fallbackReason,
      verifiedAt: nowISO,
    };
  }

  const cleanTicker = extracted.symbol.replace(/\.JK$/i, '');
  const targetDate = extracted.date;
  // Ambil rentang data 10 hari sebelum target date untuk mencakup hari bursa sebelumnya
  const startDate = subtractDaysISO(targetDate, 10);

  // 3. Panggil Sectors API Client
  const records = await sectorsClient.getDailyPrices(cleanTicker, startDate, targetDate);

  // 4. Cari baris tanggal target persis
  const targetRecord = records.find((r) => r.date === targetDate && r.close > 0);

  if (!targetRecord) {
    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: extracted.category,
        symbol: extracted.symbol,
        date: extracted.date,
        statedValue: extracted.statedValue,
        unit: extracted.unit,
        coreAssertion: extracted.coreAssertion,
        publisher: extracted.publisher || null,
      },
      status: 'insufficient_evidence',
      reason: `Data harga penutupan untuk ${cleanTicker} pada tanggal ${targetDate} tidak ditemukan di Sectors API.`,
      evidence: [
        {
          id: 'ev-1',
          sourceType: 'sectors_api',
          endpoint: `/daily/${cleanTicker}/`,
          safeParams: { start: startDate, end: targetDate },
          dataDate: null,
          fetchedAt: nowISO,
          publicUrl: null,
        },
      ],
      limitations: [
        'Data melalui Sectors API; pastikan tanggal yang diminta merupakan hari bursa aktif.',
        ...limitations.filter((l) => l.includes('fallback') || l.includes('dialihkan')),
      ],
      rulesVersion,
      disclaimer,
      extractorSource,
      modelUsed,
      modelRequested,
      fallbackReason,
      verifiedAt: nowISO,
    };
  }

  // 5. Cari baris perdagangan valid sebelum tanggal target
  const prevRecords = records.filter((r) => r.date < targetDate && r.close > 0);
  const prevRecord = prevRecords.length > 0 ? prevRecords[prevRecords.length - 1] : null;

  if (!prevRecord) {
    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: extracted.category,
        symbol: extracted.symbol,
        date: extracted.date,
        statedValue: extracted.statedValue,
        unit: extracted.unit,
        coreAssertion: extracted.coreAssertion,
        publisher: extracted.publisher || null,
      },
      status: 'insufficient_evidence',
      reason: `Data harga penutupan hari perdagangan sebelumnya untuk ${cleanTicker} sebelum tanggal ${targetDate} tidak ditemukan.`,
      evidence: [
        {
          id: 'ev-1',
          sourceType: 'sectors_api',
          endpoint: `/daily/${cleanTicker}/`,
          safeParams: { start: startDate, end: targetDate },
          dataDate: targetRecord.date,
          fetchedAt: nowISO,
          publicUrl: null,
        },
      ],
      limitations: [
        'Data melalui Sectors API; dibutuhkan data penutupan hari perdagangan sebelumnya untuk menghitung perubahan persentase.',
        ...limitations.filter((l) => l.includes('fallback') || l.includes('dialihkan')),
      ],
      rulesVersion,
      disclaimer,
      extractorSource,
      modelUsed,
      modelRequested,
      fallbackReason,
      verifiedAt: nowISO,
    };
  }

  // 6. Hitung persentase perubahan harga
  const previous = prevRecord.close;
  const current = targetRecord.close;
  const resultPercent = ((current - previous) / previous) * 100;
  const formattedPercent = formatPercentageID(resultPercent);

  // 7. Penilaian Verdict secara Deterministik (Toleransi <= 0,05 poin persentase)
  let status: VerificationStatus = 'supported';
  let reason = '';

  const stated = extracted.statedValue;

  if (stated !== null) {
    const diff = Math.abs(resultPercent - stated);
    const tolerance = 0.05;

    // Periksa kesesuaian tanda/arah jika bukan 0
    const directionMatch =
      (stated > 0 && resultPercent > 0) ||
      (stated < 0 && resultPercent < 0) ||
      (stated === 0 && Math.abs(resultPercent) <= tolerance);

    if (diff <= tolerance && directionMatch) {
      status = 'supported';
      reason = `Penutupan ${cleanTicker} berubah dari ${previous} menjadi ${current} (${formattedPercent}) pada dua hari perdagangan terkait (${prevRecord.date} dan ${targetRecord.date}).`;
    } else {
      status = 'contradicted';
      reason = `Klaim menyatakan ${formatPercentageID(stated)}, namun data resmi menunjukkan penutupan ${cleanTicker} berubah dari ${previous} menjadi ${current} (${formattedPercent}) pada ${targetRecord.date} (dibandingkan ${prevRecord.date}).`;
    }
  } else if (extracted.operator === 'up') {
    if (resultPercent > 0) {
      status = 'supported';
      reason = `Penutupan ${cleanTicker} menguat dari ${previous} menjadi ${current} (${formattedPercent}) pada ${targetRecord.date}.`;
    } else {
      status = 'contradicted';
      reason = `Klaim menyatakan naik, namun penutupan ${cleanTicker} berubah dari ${previous} menjadi ${current} (${formattedPercent}) pada ${targetRecord.date}.`;
    }
  } else if (extracted.operator === 'down') {
    if (resultPercent < 0) {
      status = 'supported';
      reason = `Penutupan ${cleanTicker} melemah dari ${previous} menjadi ${current} (${formattedPercent}) pada ${targetRecord.date}.`;
    } else {
      status = 'contradicted';
      reason = `Klaim menyatakan turun, namun penutupan ${cleanTicker} berubah dari ${previous} menjadi ${current} (${formattedPercent}) pada ${targetRecord.date}.`;
    }
  } else {
    status = 'supported';
    reason = `Penutupan ${cleanTicker} tercatat ${current} pada ${targetRecord.date} (${formattedPercent} dari penutupan ${prevRecord.date} sebesar ${previous}).`;
  }

  return {
    receiptId,
    claim: rawClaim,
    interpreted: {
      category: 'price_change',
      symbol: `${cleanTicker}.JK`,
      date: targetDate,
      statedValue: stated,
      unit: extracted.unit || 'percent',
      coreAssertion: extracted.coreAssertion,
      publisher: extracted.publisher || null,
    },
    status,
    reason,
    calculation: {
      formula: '(current - previous) / previous * 100',
      previous,
      current,
      resultPercent,
    },
    evidence: [
      {
        id: 'ev-1',
        sourceType: 'sectors_api',
        endpoint: `/daily/${cleanTicker}/`,
        safeParams: {
          start: startDate,
          end: targetDate,
        },
        dataDate: targetRecord.date,
        fetchedAt: nowISO,
        publicUrl: null,
      },
    ],
    limitations,
    rulesVersion,
    disclaimer,
    extractorSource,
    modelUsed,
    modelRequested,
    fallbackReason,
    verifiedAt: nowISO,
  };
}

/**
 * Melakukan verifikasi klaim pemberitaan berita berdasarkan kecocokan penerbit, emiten, dan isi artikel secara substantif
 * Sesuai aturan: kecocokan simbol/kata kunci saja menghasilkan insufficient_evidence, bukan supported.
 * Tanggal tidak boleh diinferensi/disimpulkan jika user tidak menyebutnya di klaim.
 */
export async function verifyNewsClaim(
  rawClaim: string,
  extracted: ExtractedClaim,
  extractorSource: 'ai_agent' | 'fallback_heuristic' = 'fallback_heuristic',
  modelUsed?: string,
  modelRequested?: string,
  fallbackReason?: string
): Promise<VerificationReceipt> {
  const receiptId = generateUUID();
  const nowISO = new Date().toISOString();
  const rulesVersion = 'news-v1';
  const disclaimer = 'Pemeriksaan informasi, bukan rekomendasi investasi.';

  const limitations: string[] = [
    'Verifikasi berita membuktikan adanya publikasi media resmi pada Sectors API, bukan jaminan kebenaran peristiwa internal.',
  ];

  if (fallbackReason) {
    limitations.push(fallbackReason);
  } else if (extractorSource === 'fallback_heuristic') {
    limitations.push('Pemeriksaan menggunakan parser heuristik cadangan (fallback) karena layanan AI tidak aktif/gagal.');
  }

  // 1. Validasi simbol emiten
  const criticalAmbiguity = extracted.ambiguity.filter((a) =>
    a.toLowerCase().includes('simbol emiten') ||
    a.toLowerCase().includes('format simbol') ||
    a.toLowerCase().includes('tidak ditemukan dalam klaim') ||
    a.toLowerCase().includes('kemarin') ||
    a.toLowerCase().includes('relatif')
  );

  if (criticalAmbiguity.length > 0 || !extracted.symbol) {
    const reasonText = criticalAmbiguity.length > 0
      ? criticalAmbiguity.join(' ')
      : 'Simbol emiten IDX tidak ditemukan dalam klaim berita.';

    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: 'news_mention',
        symbol: extracted.symbol,
        date: extracted.date,
        statedValue: null,
        unit: null,
        coreAssertion: extracted.coreAssertion,
        publisher: extracted.publisher || null,
      },
      status: 'insufficient_evidence',
      reason: reasonText,
      evidence: [],
      limitations: [
        'Klaim berita membutuhkan simbol emiten IDX yang jelas untuk penelusuran artikel.',
        ...limitations.filter((l) => l.includes('fallback') || l.includes('dialihkan')),
      ],
      rulesVersion,
      disclaimer,
      extractorSource,
      modelUsed,
      modelRequested,
      fallbackReason,
      verifiedAt: nowISO,
    };
  }

  const cleanTicker = extracted.symbol.replace(/\.JK$/i, '');

  // 2. Ambil artikel berita dari Sectors API
  const articles: NewsArticleRecord[] = await sectorsClient.getNews(cleanTicker, undefined, undefined, 15);

  if (!articles || articles.length === 0) {
    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: 'news_mention',
        symbol: `${cleanTicker}.JK`,
        date: extracted.date,
        statedValue: null,
        unit: null,
        coreAssertion: extracted.coreAssertion,
        publisher: extracted.publisher || null,
      },
      status: 'insufficient_evidence',
      reason: `Tidak ditemukan artikel berita untuk emiten ${cleanTicker} pada arsip Sectors API.`,
      evidence: [
        {
          id: 'ev-news-1',
          sourceType: 'sectors_api_news',
          endpoint: '/news/',
          safeParams: { extension: 'idx', symbols: cleanTicker },
          dataDate: null,
          fetchedAt: nowISO,
          publicUrl: null,
        },
      ],
      limitations,
      rulesVersion,
      disclaimer,
      extractorSource,
      modelUsed,
      modelRequested,
      fallbackReason,
      verifiedAt: nowISO,
    };
  }

  // 3. Pencocokan Isi Artikel Secara Substantif & Penerbit
  const targetAssertion = (extracted.coreAssertion || rawClaim).toLowerCase().replace(/[^\w\s]/g, ' ').trim();
  const rawKeywords = (extracted.keywords && extracted.keywords.length > 0)
    ? extracted.keywords
    : targetAssertion.split(/\s+/).filter((w) => w.length > 3);

  // Stopwords luas untuk bursa, media, korporasi umum, dan nama emiten
  const genericTerms = new Set([
    'saham', 'emiten', 'idx', 'bei', 'bursa', 'efek', 'berita', 'media', 'hari', 'ini',
    'melaporkan', 'mengabarkan', 'diberitakan', 'memberitakan', 'menyebutkan', 'dan', 'yang',
    'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'oleh', 'atas', 'tentang', 'terkait',
    'sebesar', 'senilai', 'pt', 'tbk', 'perseroan', 'perusahaan', 'bank', 'indonesia',
    'resmi', 'tahun', 'bulan', 'kuartal', 'semester', 'luar', 'biasa', 'rapat', 'umum',
    'cnbc', 'kontan', 'bisnis', 'detik', 'idnfinancials', 'bloomberg', 'reuters', 'kompas',
    cleanTicker.toLowerCase(),
  ]);
  if (extracted.publisher) {
    genericTerms.add(extracted.publisher.toLowerCase());
  }

  const substantiveKeywords = rawKeywords
    .map((k) => k.toLowerCase().replace(/[^\w\s]/g, '').trim())
    .filter((k) => k.length > 2 && !genericTerms.has(k));

  let matchedArticle: NewsArticleRecord | null = null;
  let matchScore = 0;

  for (const art of articles) {
    // A. Validasi penerbit jika klaim menyebut media tertentu
    if (extracted.publisher && !matchesPublisher(art, extracted.publisher)) {
      continue;
    }

    // B. Validasi emiten: artikel harus benar-benar terkait dengan emiten yang diklaim (cleanTicker)
    const symbolsInArticle = (art.symbols || []).map((s) => s.toUpperCase());
    const titleClean = (art.title || '').toLowerCase().replace(/[^\w\s]/g, ' ');
    const bodyClean = (art.body || '').toLowerCase().replace(/[^\w\s]/g, ' ');

    const hasExplicitSymbol = symbolsInArticle.includes(cleanTicker);
    const mentionsTickerInText = titleClean.includes(cleanTicker.toLowerCase()) || bodyClean.includes(cleanTicker.toLowerCase());

    if (!hasExplicitSymbol && !mentionsTickerInText) {
      continue;
    }

    // Jika artikel secara eksplisit memiliki simbol emiten lain tanpa memuat ticker yang dicari, lewati
    if (symbolsInArticle.length > 0 && !hasExplicitSymbol) {
      continue;
    }

    // C. Evaluasi kecocokan substansi klaim
    let currentScore = 0;

    // Kecocokan langsung seluruh frasa inti klaim di judul atau bodi
    if (targetAssertion.length > 8 && (titleClean.includes(targetAssertion) || bodyClean.includes(targetAssertion))) {
      currentScore += 10;
    }

    // Kecocokan kata kunci substantif spesifik
    let matchedSpecificKeywords = 0;
    for (const kw of substantiveKeywords) {
      if (titleClean.includes(kw)) {
        currentScore += 4;
        matchedSpecificKeywords++;
      } else if (bodyClean.includes(kw)) {
        currentScore += 2;
        matchedSpecificKeywords++;
      }
    }

    // Kriteria: Harus ada kecocokan frasa atau minimal 1 keyword substantif kuat (skor >= 4)
    if (currentScore > matchScore && (currentScore >= 10 || matchedSpecificKeywords >= 1)) {
      matchScore = currentScore;
      matchedArticle = art;
    }
  }

  // KOREKSI UTAMA SESUAI ATURAN:
  // Kecocokan simbol saja, atau mismatch penerbit/substansi menghasilkan insufficient_evidence
  if (!matchedArticle || matchScore < 4) {
    let reasonDetail = `Ditemukan ${articles.length} artikel berita untuk ${cleanTicker}, namun isi artikel tidak memuat bukti yang mengonfirmasi klaim spesifik: "${extracted.coreAssertion || rawClaim}".`;
    if (extracted.publisher) {
      reasonDetail = `Ditemukan ${articles.length} artikel berita untuk ${cleanTicker}, namun tidak ditemukan artikel dari media ${extracted.publisher} yang memuat bukti mengonfirmasi klaim: "${extracted.coreAssertion || rawClaim}".`;
    }

    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: 'news_mention',
        symbol: `${cleanTicker}.JK`,
        date: extracted.date, // JANGAN menyimpulkan tanggal jika user tidak menyebutnya
        statedValue: null,
        unit: null,
        coreAssertion: extracted.coreAssertion,
        publisher: extracted.publisher || null,
      },
      status: 'insufficient_evidence',
      reason: reasonDetail,
      evidence: [
        {
          id: 'ev-news-1',
          sourceType: 'sectors_api_news',
          endpoint: '/news/',
          safeParams: { extension: 'idx', symbols: cleanTicker },
          dataDate: articles[0]?.timestamp ? articles[0].timestamp.slice(0, 10) : null,
          fetchedAt: nowISO,
          publicUrl: null,
        },
      ],
      limitations: [
        'Kecocokan simbol atau kata kunci umum saja tidak cukup untuk menyatakan klaim terdukung; penerbit dan isi artikel harus secara substantif mengonfirmasi klaim.',
        ...limitations,
      ],
      rulesVersion,
      disclaimer,
      extractorSource,
      modelUsed,
      modelRequested,
      fallbackReason,
      verifiedAt: nowISO,
    };
  }

  // Menentukan publicUrl yang valid dari sumber artikel
  let publicUrl: string | null = null;
  if (matchedArticle.url && /^https?:\/\//i.test(matchedArticle.url)) {
    publicUrl = matchedArticle.url;
  } else if (matchedArticle.source && /^https?:\/\//i.test(matchedArticle.source)) {
    publicUrl = matchedArticle.source;
  }

  const articleDate = matchedArticle.timestamp ? matchedArticle.timestamp.slice(0, 10) : null;
  const sourceName = matchedArticle.source || 'Sectors News';

  return {
    receiptId,
    claim: rawClaim,
    interpreted: {
      category: 'news_mention',
      symbol: `${cleanTicker}.JK`,
      date: extracted.date, // Tetap gunakan extracted.date (null jika user tidak menyebut tanggal di klaim)
      statedValue: null,
      unit: null,
      coreAssertion: extracted.coreAssertion,
      publisher: extracted.publisher || null,
    },
    status: 'supported',
    reason: `Ditemukan artikel berita terbitan ${sourceName} dengan judul "${matchedArticle.title}" yang memberitakan informasi terkait klaim ini.`,
    evidence: [
      {
        id: 'ev-news-1',
        sourceType: 'sectors_api_news',
        endpoint: '/news/',
        safeParams: {
          extension: 'idx',
          symbols: cleanTicker,
        },
        dataDate: articleDate,
        fetchedAt: nowISO,
        publicUrl,
      },
    ],
    limitations,
    rulesVersion,
    disclaimer,
    extractorSource,
    modelUsed,
    modelRequested,
    fallbackReason,
    verifiedAt: nowISO,
  };
}

/**
 * Orkestrator utama verifikasi klaim BursaBukti
 */
export async function verifyClaim(
  rawClaim: string,
  extracted: ExtractedClaim,
  extractorSource: 'ai_agent' | 'fallback_heuristic' = 'fallback_heuristic',
  modelUsed?: string,
  modelRequested?: string,
  fallbackReason?: string
): Promise<VerificationReceipt> {
  if (extracted.category === 'price_change') {
    return verifyPriceClaim(rawClaim, extracted, extractorSource, modelUsed, modelRequested, fallbackReason);
  }

  if (extracted.category === 'news_mention') {
    return verifyNewsClaim(rawClaim, extracted, extractorSource, modelUsed, modelRequested, fallbackReason);
  }

  const receiptId = generateUUID();
  const nowISO = new Date().toISOString();
  const disclaimer = 'Pemeriksaan informasi, bukan rekomendasi investasi.';
  const limitations: string[] = [];

  if (fallbackReason) {
    limitations.push(fallbackReason);
  } else if (extractorSource === 'fallback_heuristic') {
    limitations.push('Pemeriksaan menggunakan parser heuristik cadangan (fallback) karena layanan AI tidak aktif/gagal.');
  }

  if (extracted.category === 'financial_metric') {
    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: 'financial_metric',
        symbol: extracted.symbol,
        date: extracted.date,
        statedValue: extracted.statedValue,
        unit: extracted.unit,
        coreAssertion: extracted.coreAssertion,
        publisher: extracted.publisher || null,
      },
      status: 'insufficient_evidence',
      reason: 'Klaim metrik laporan keuangan (laba/pendapatan/dividen) belum didukung pada rilis saat ini karena memerlukan perbandingan dua periode laporan resmi yang setara.',
      evidence: [],
      limitations: [
        'Rilis saat ini mendukung verifikasi harga harian (GET /daily/) dan artikel berita (GET /news/).',
        ...limitations,
      ],
      rulesVersion: 'unsupported-v1',
      disclaimer,
      extractorSource,
      modelUsed,
      modelRequested,
      fallbackReason,
      verifiedAt: nowISO,
    };
  }

  return {
    receiptId,
    claim: rawClaim,
    interpreted: {
      category: 'unsupported',
      symbol: extracted.symbol,
      date: extracted.date,
      statedValue: extracted.statedValue,
      unit: extracted.unit,
      coreAssertion: extracted.coreAssertion,
      publisher: extracted.publisher || null,
    },
    status: 'insufficient_evidence',
    reason: extracted.ambiguity.length > 0
      ? extracted.ambiguity.join(' ')
      : 'Klaim berada di luar cakupan pemeriksaan bursa yang didukung saat ini.',
    evidence: [],
    limitations: [
      'BursaBukti saat ini memverifikasi klaim harga saham harian dan pemberitaan media terindeks IDX.',
      ...limitations,
    ],
    rulesVersion: 'unsupported-v1',
    disclaimer,
    extractorSource,
    modelUsed,
    modelRequested,
    fallbackReason,
    verifiedAt: nowISO,
  };
}
