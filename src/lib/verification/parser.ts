import { ExtractedClaim } from './types';

const MONTH_MAP: Record<string, string> = {
  januari: '01',
  jan: '01',
  februari: '02',
  feb: '02',
  maret: '03',
  mar: '03',
  april: '04',
  apr: '04',
  mei: '05',
  may: '05',
  juni: '06',
  jun: '06',
  juli: '07',
  jul: '07',
  agustus: '08',
  agu: '08',
  agt: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  oktober: '10',
  okt: '10',
  oct: '10',
  november: '11',
  nov: '11',
  desember: '12',
  des: '12',
  dec: '12',
};

// Daftar kata umum 4 huruf dalam Bahasa Indonesia & Inggris yang bukan ticker saham
const EXCLUDED_WORDS = new Set([
  'NAIK', 'LABA', 'RUGI', 'PADA', 'DARI', 'HARI', 'AKAN', 'SAAT', 'SUDA', 'DULU',
  'LAGI', 'TUTU', 'OPEN', 'DATE', 'SEJA', 'PAGI', 'SORE', 'YANG', 'BISA', 'IKUT',
  'LALU', 'ESOK', 'TADI', 'JUGA', 'BILA', 'JIKA', 'MAKA', 'DROP', 'GAIN', 'SURG',
  'POST', 'NEWS', 'HIGH', 'LOWS', 'PLUS', 'MINS', 'DATA', 'RUPI', 'POIN', 'BANK',
  'AWAL', 'AKHR', 'SETE', 'SEBE', 'TOTA', 'HASI', 'BUKT', 'KLAI', 'ITEM', 'TEXT',
  'PERI', 'TAHU', 'BULN', 'MING', 'ORDR', 'SELL', 'BUYS', 'DEAL', 'RATE', 'LIST',
]);

const POPULAR_ALIASES: Array<{ regex: RegExp; symbol: string }> = [
  { regex: /\b(bank\s+bri|bri|bank\s+rakyat\s+indonesia)\b/i, symbol: 'BBRI.JK' },
  { regex: /\b(bank\s+bca|bca|bank\s+central\s+asia)\b/i, symbol: 'BBCA.JK' },
  { regex: /\b(bank\s+mandiri|mandiri)\b/i, symbol: 'BMRI.JK' },
  { regex: /\b(bank\s+bni|bni|bank\s+negara\s+indonesia)\b/i, symbol: 'BBNI.JK' },
  { regex: /\b(telkom\s+indonesia|telkom)\b/i, symbol: 'TLKM.JK' },
  { regex: /\b(astra\s+international|astra)\b/i, symbol: 'ASII.JK' },
  { regex: /\b(gojek\s+tokopedia|goto)\b/i, symbol: 'GOTO.JK' },
  { regex: /\b(bumi\s+resources|bumi)\b/i, symbol: 'BUMI.JK' },
  { regex: /\b(aneka\s+tambang|antam)\b/i, symbol: 'ANTM.JK' },
  { regex: /\b(indofood)\b/i, symbol: 'INDF.JK' },
];

/**
 * Parsing teks klaim pengguna menjadi objek ExtractedClaim terstruktur (P0 & P1 Heuristik)
 */
export function parseClaim(claimText: string): ExtractedClaim {
  const text = (claimText || '').trim();
  const ambiguity: string[] = [];

  // 1. Deteksi kata-kata waktu relatif yang dilarang/ambigu
  const relativeDatePatterns = [
    /\b(kemarin|kemaren|yesterday)\b/i,
    /\b(hari ini|today|tadi)\b/i,
    /\b(minggu lalu|pekan lalu|last week)\b/i,
    /\b(bulan lalu|last month)\b/i,
  ];

  for (const pattern of relativeDatePatterns) {
    if (pattern.test(text)) {
      ambiguity.push('Tanggal tidak eksplisit ("kemarin/hari ini/minggu lalu"). Mohon sebutkan tanggal perdagangan secara eksplisit (contoh: 23 September 2026).');
      break;
    }
  }

  // 2. Ekstraksi Simbol Emiten (Ticker IDX)
  let symbol: string | null = null;

  // Prioritas 1: Simbol dengan akhiran .JK eksplisit (misal: BBRI.JK)
  const explicitJkMatch = text.match(/\b([A-Z0-9]{4,6})\.JK\b/i);
  if (explicitJkMatch) {
    symbol = `${explicitJkMatch[1].toUpperCase()}.JK`;
  }

  // Prioritas 2: Pemetaan nama populer emiten (Bank BRI, BCA, Telkom, Mandiri, dll)
  if (!symbol) {
    for (const alias of POPULAR_ALIASES) {
      if (alias.regex.test(text)) {
        symbol = alias.symbol;
        break;
      }
    }
  }

  // Prioritas 2: Simbol setelah kata kunci 'saham', 'emiten', 'kode', 'ticker', 'berkode'
  if (!symbol) {
    const keywordMatch = text.match(/\b(?:saham|emiten|kode|ticker|berkode)\s+([A-Z0-9]{4})\b/i);
    if (keywordMatch) {
      const ticker = keywordMatch[1].toUpperCase();
      if (!EXCLUDED_WORDS.has(ticker)) {
        symbol = `${ticker}.JK`;
      }
    }
  }

  // Prioritas 3: Cari kata 4 huruf yang bukan merupakan kata umum bahasa Indonesia/Inggris
  if (!symbol) {
    const words = text.split(/[\s,.;:!?()\[\]"']+/);
    for (const w of words) {
      const upper = w.toUpperCase();
      if (/^[A-Z]{4}$/.test(upper) && !EXCLUDED_WORDS.has(upper)) {
        if (upper !== 'JUNI' && upper !== 'JULI') {
          symbol = `${upper}.JK`;
          break;
        }
      }
    }
  }

  if (!symbol) {
    ambiguity.push('Simbol emiten (ticker IDX 4 huruf, misal BBRI atau BBCA) tidak ditemukan dalam klaim.');
  }

  // 3. Ekstraksi Tanggal Eksplisit
  let date: string | null = null;

  // Format 1: ISO YYYY-MM-DD
  const isoDateMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDateMatch) {
    date = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
  }

  // Format 2: DD/MM/YYYY atau DD-MM-YYYY
  if (!date) {
    const slashDateMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
    if (slashDateMatch) {
      const d = slashDateMatch[1].padStart(2, '0');
      const m = slashDateMatch[2].padStart(2, '0');
      const y = slashDateMatch[3];
      date = `${y}-${m}-${d}`;
    }
  }

  // Format 3: DD Bulan YYYY (misal: 23 September 2026)
  if (!date) {
    const textDateMatch = text.match(/\b(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\b/);
    if (textDateMatch) {
      const d = textDateMatch[1].padStart(2, '0');
      const monthStr = textDateMatch[2].toLowerCase();
      const y = textDateMatch[3];
      const m = MONTH_MAP[monthStr];
      if (m) {
        date = `${y}-${m}-${d}`;
      }
    }
  }

  // 4. Ekstraksi Nilai Angka Persentase & Operator
  let statedValue: number | null = null;
  let unit: 'percent' | 'IDR' | null = null;
  let operator: 'eq' | 'gt' | 'lt' | 'up' | 'down' | null = null;

  // Deteksi persentase: e.g. 0,31% atau 0.31% atau +0,31% atau -2% atau 0,31 persen
  const percentRegex = /([+-]?\s*\d+(?:[.,]\d+)?)\s*(?:%|persen\b)/i;
  const percentMatch = text.match(percentRegex);

  if (percentMatch) {
    unit = 'percent';
    const rawNumStr = percentMatch[1].replace(/\s+/g, '').replace(',', '.');
    const parsedNum = parseFloat(rawNumStr);
    if (!isNaN(parsedNum)) {
      statedValue = parsedNum;
    }
  }

  // Deteksi operator / arah pergerakan
  const isUp = /\b(naik|menguat|melonjak|terangkat|positif|\+|surged|gained)\b/i.test(text);
  const isDown = /\b(turun|melemah|anjlok|merosot|negatif|-|dropped|fell)\b/i.test(text);

  if (isUp && !isDown) {
    operator = 'up';
    if (statedValue !== null && statedValue < 0) {
      statedValue = Math.abs(statedValue);
    }
  } else if (isDown && !isUp) {
    operator = 'down';
    if (statedValue !== null && statedValue > 0) {
      statedValue = -Math.abs(statedValue);
    }
  } else if (statedValue !== null) {
    operator = statedValue >= 0 ? 'up' : 'down';
  }

  // 5. Ekstraksi Penerbit / Media Spesifik
  let publisher: string | null = null;
  const publisherPatterns: Array<{ regex: RegExp; name: string }> = [
    { regex: /\b(cnbc(?:\s+indonesia)?)\b/i, name: 'CNBC' },
    { regex: /\b(kontan(?:\s+co\s+id)?)\b/i, name: 'Kontan' },
    { regex: /\b(bisnis(?:\s+indonesia|\.com)?)\b/i, name: 'Bisnis Indonesia' },
    { regex: /\b(detik(?:\s+finance|\.com)?)\b/i, name: 'Detik' },
    { regex: /\b(idnfinancials(?:\s+com)?|idn\s+financials)\b/i, name: 'IDNFinancials' },
    { regex: /\b(bloomberg(?:\s+technoz)?)\b/i, name: 'Bloomberg' },
    { regex: /\b(reuters)\b/i, name: 'Reuters' },
    { regex: /\b(kompas(?:\.com)?)\b/i, name: 'Kompas' },
    { regex: /\b(tempo(?:\.co)?)\b/i, name: 'Tempo' },
    { regex: /\b(investor(?:\s+daily|\.id)?)\b/i, name: 'Investor Daily' },
  ];
  for (const pub of publisherPatterns) {
    if (pub.regex.test(text)) {
      publisher = pub.name;
      break;
    }
  }

  // 6. Penentuan Kategori Klaim & Ekstraksi Kata Kunci/Substansi
  let category: ExtractedClaim['category'] = 'price_change';
  let metric: ExtractedClaim['metric'] = 'close';
  let coreAssertion: string | null = null;
  let keywords: string[] | undefined = undefined;

  const isFinancial = /\b(laba|pendapatan|revenue|net profit|omset|dividen|quarter|kuartal|semester|ebitda)\b/i.test(text);
  const isNews = /\b(berita|artikel|diberitakan|headline|media|mengabarkan|dilaporkan|memberitakan|rilis|meluncurkan|akuisisi|net\s+sell|beli\s+bersih|jual\s+bersih)\b/i.test(text) || publisher !== null;
  const isExplicitPrice = /\b(harga|penutupan|close|closing|perdagangan)\b/i.test(text);

  if (isFinancial && !isExplicitPrice) {
    category = 'financial_metric';
    metric = 'earnings';
  } else if (isNews && !isExplicitPrice) {
    category = 'news_mention';
    metric = 'news_headline';
    // Ekstraksi kata-kata kunci relevan (di luar stopwords)
    const rawWords = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !EXCLUDED_WORDS.has(w.toUpperCase()));
    keywords = Array.from(new Set(rawWords)).slice(0, 8);
    // Hapus frasa pembuka umum untuk mengambil inti klaim
    coreAssertion = text
      .replace(/^(media\s+([a-zA-Z]+\s+)?(mengabarkan|melaporkan|memberitakan|menyebutkan)|berita\s+menyebutkan|diberitakan\s+bahwa)\s+/i, '')
      .trim();
  } else if (symbol || isUp || isDown || percentMatch || date || isExplicitPrice) {
    category = 'price_change';
    metric = 'close';
  } else {
    category = 'unsupported';
    metric = null;
  }

  // Tanggal perdagangan wajib untuk klaim harga (price_change)
  if (category === 'price_change' && !date && !ambiguity.some((a) => a.includes('Tanggal'))) {
    ambiguity.push('Tanggal perdagangan eksplisit tidak ditemukan dalam klaim (contoh format yang didukung: 23 September 2026 atau 2026-09-23).');
  }

  return {
    category,
    symbol,
    date,
    metric,
    operator,
    statedValue,
    unit,
    periodLabel: null,
    keywords,
    coreAssertion,
    publisher,
    ambiguity,
  };
}
