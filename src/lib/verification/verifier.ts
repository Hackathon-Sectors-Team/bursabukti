import { sectorsClient } from '../sectors';
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
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'rcpt-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
}

/**
 * Melakukan verifikasi klaim harga saham berdasarkan hasil ekstraksi dan data Sectors API
 */
export async function verifyPriceClaim(
  rawClaim: string,
  extracted: ExtractedClaim
): Promise<VerificationReceipt> {
  const receiptId = generateUUID();
  const nowISO = new Date().toISOString();
  const rulesVersion = 'price-v1';
  const disclaimer = 'Pemeriksaan informasi, bukan rekomendasi investasi.';

  // 1. Periksa apakah ada ambiguitas atau parameter wajib yang tidak lengkap
  if (extracted.ambiguity.length > 0 || !extracted.symbol || !extracted.date) {
    const reasonText = extracted.ambiguity.length > 0
      ? extracted.ambiguity.join(' ')
      : 'Parameter klaim (simbol saham atau tanggal perdagangan) belum lengkap untuk diuji.';

    return {
      receiptId,
      claim: rawClaim,
      interpreted: {
        category: extracted.category,
        symbol: extracted.symbol,
        date: extracted.date,
        statedValue: extracted.statedValue,
        unit: extracted.unit,
      },
      status: 'insufficient_evidence',
      reason: reasonText,
      evidence: [],
      limitations: [
        'Klaim membutuhkan simbol emiten IDX yang jelas dan tanggal perdagangan eksplisit.',
      ],
      rulesVersion,
      disclaimer,
    };
  }

  // 2. Periksa batasan kategori P0
  if (extracted.category !== 'price_change') {
    let categoryReason = 'Kategori klaim belum didukung pada verifikasi P0.';
    if (extracted.category === 'financial_metric') {
      categoryReason = 'Klaim metrik laporan keuangan belum didukung pada rilis P0 (memerlukan finalisasi SRS P1).';
    } else if (extracted.category === 'news_mention') {
      categoryReason = 'Klaim keberadaan artikel berita belum didukung pada rilis P0 (memerlukan finalisasi SRS P1).';
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
      },
      status: 'insufficient_evidence',
      reason: categoryReason,
      evidence: [],
      limitations: [
        'Rilis P0 saat ini berfokus pada verifikasi klaim perubahan harga harian saham IDX.',
      ],
      rulesVersion,
      disclaimer,
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
      ],
      rulesVersion,
      disclaimer,
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
      ],
      rulesVersion,
      disclaimer,
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
    limitations: [
      'Data melalui Sectors API; tautan publik langsung ke record belum tersedia.',
    ],
    rulesVersion,
    disclaimer,
  };
}
