import { parseClaim } from '../verification/parser';
import { ClaimCategory, ExtractedClaim } from '../verification/types';
import { sanitizeTickerSymbol } from '../sectors/client';
import { AGENT_SYSTEM_INSTRUCTION, GEMINI_CLAIM_RESPONSE_SCHEMA } from './prompts';
import { AgentConfig, AgentExtractionResult } from './types';

/**
 * Membaca konfigurasi AI Agent dari environment server
 * Nama model dapat diatur dinamis melalui variabel GEMINI_MODEL di .env.local
 */
export function getAgentConfig(): AgentConfig {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_MODEL || 'gemini-3.7-flash').trim();
  const baseUrl = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').trim().replace(/\/+$/, '');

  return {
    apiKey,
    model,
    baseUrl,
    timeoutMs: 8000,
  };
}

/**
 * Validasi ketat terhadap output JSON yang dihasilkan oleh model AI
 */
export function validateAndSanitizeAgentOutput(raw: unknown): ExtractedClaim {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Output AI agent bukan berupa objek JSON valid');
  }

  const obj = raw as Record<string, unknown>;
  const ambiguity: string[] = Array.isArray(obj.ambiguity)
    ? obj.ambiguity.map((a) => String(a).trim()).filter(Boolean)
    : [];

  // 1. Validasi Kategori
  const validCategories: ClaimCategory[] = ['price_change', 'news_mention', 'financial_metric', 'unsupported'];
  let category: ClaimCategory = 'unsupported';
  if (typeof obj.category === 'string' && validCategories.includes(obj.category as ClaimCategory)) {
    category = obj.category as ClaimCategory;
  }

  // 2. Validasi & Sanitasi Simbol Emiten
  let symbol: string | null = null;
  if (typeof obj.symbol === 'string' && obj.symbol.trim()) {
    try {
      const clean = sanitizeTickerSymbol(obj.symbol);
      symbol = `${clean}.JK`;
    } catch {
      symbol = null;
      ambiguity.push(`Format simbol emiten "${obj.symbol}" tidak valid.`);
    }
  }

  // 3. Validasi Tanggal (Harus ISO YYYY-MM-DD valid)
  let date: string | null = null;
  if (typeof obj.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.date.trim())) {
    const parsedDate = new Date(obj.date.trim());
    if (!isNaN(parsedDate.getTime())) {
      date = obj.date.trim();
    }
  }

  // 4. Validasi Operator & Satuan
  const validOperators = ['eq', 'gt', 'lt', 'up', 'down'] as const;
  let operator: ExtractedClaim['operator'] = null;
  if (typeof obj.operator === 'string' && validOperators.includes(obj.operator as typeof validOperators[number])) {
    operator = obj.operator as ExtractedClaim['operator'];
  }

  let unit: ExtractedClaim['unit'] = null;
  if (obj.unit === 'percent' || obj.unit === 'IDR') {
    unit = obj.unit;
  }

  // 5. Validasi Angka & Konsistensi Arah Penurunan
  let statedValue: number | null = null;
  if (typeof obj.statedValue === 'number' && !isNaN(obj.statedValue)) {
    statedValue = obj.statedValue;
    // Pastikan angka penurunan konsisten bertanda negatif
    if (operator === 'down' && statedValue > 0) {
      statedValue = -statedValue;
    } else if (operator === 'up' && statedValue < 0) {
      statedValue = Math.abs(statedValue);
    }
  }

  // 6. Validasi Metrik
  let metric: ExtractedClaim['metric'] = null;
  if (obj.metric === 'close' || obj.metric === 'earnings' || obj.metric === 'news_headline') {
    metric = obj.metric;
  } else if (category === 'price_change') {
    metric = 'close';
  } else if (category === 'news_mention') {
    metric = 'news_headline';
  } else if (category === 'financial_metric') {
    metric = 'earnings';
  }

  // 7. Validasi Kata Kunci & Inti Klaim Berita
  let keywords: string[] | undefined = undefined;
  if (Array.isArray(obj.keywords)) {
    keywords = obj.keywords
      .map((k) => String(k).trim())
      .filter((k) => k.length > 0)
      .slice(0, 10);
  }

  let coreAssertion: string | null = null;
  if (typeof obj.coreAssertion === 'string' && obj.coreAssertion.trim()) {
    coreAssertion = obj.coreAssertion.trim().slice(0, 300);
  }

  // 8. Validasi Penerbit / Media Spesifik
  let publisher: string | null = null;
  if (typeof obj.publisher === 'string' && obj.publisher.trim()) {
    publisher = obj.publisher.trim().slice(0, 100);
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

/**
 * Ekstraksi klaim menggunakan AI Agent (Google Gemini) dengan validasi server
 * dan fallback otomatis ke parser heuristik
 */
export async function extractClaimWithAgent(
  claimText: string,
  customConfig?: Partial<AgentConfig>
): Promise<AgentExtractionResult> {
  const config = {
    ...getAgentConfig(),
    ...customConfig,
  };

  const text = (claimText || '').trim();

  // Jika API key belum dikonfigurasi, gunakan fallback heuristik secara eksplisit
  if (!config.apiKey) {
    const fallbackExtracted = parseClaim(text);
    return {
      extracted: fallbackExtracted,
      extractorSource: 'fallback_heuristic',
      fallbackReason: 'GEMINI_API_KEY tidak dikonfigurasi pada server.',
    };
  }

  const requestBody = {
    contents: [
      {
        parts: [{ text }],
      },
    ],
    systemInstruction: {
      parts: [{ text: AGENT_SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_CLAIM_RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  };

  // Daftar model yang dicoba (model utama sesuai konfigurasi + model failover jika 503/429/timeout/gagal)
  const candidateModels = [config.model];
  if (config.model !== 'gemini-3.1-flash-lite') {
    candidateModels.push('gemini-3.1-flash-lite');
  }

  let lastError: Error | null = null;
  let primaryModelFailureReason: string | null = null;

  for (const currentModel of candidateModels) {
    const endpoint = `${config.baseUrl}/models/${currentModel}:generateContent?key=${config.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 15000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const rawErrText = await response.text().catch(() => '');
        // Sanitasi pesan error agar tidak membocorkan query params atau api key
        const sanitizedErr = rawErrText.slice(0, 150).replace(/key=[^&\s]+/gi, 'key=***');
        const errorDesc = `HTTP ${response.status}${sanitizedErr ? `: ${sanitizedErr}` : ''}`;

        // Jika model utama gagal dan masih ada model kandidat cadangan berikutnya
        if (candidateModels.indexOf(currentModel) < candidateModels.length - 1) {
          primaryModelFailureReason = `Model ${currentModel} gagal (${errorDesc})`;
          console.warn(`[AI Agent] ${primaryModelFailureReason}, mencoba failover ke model cadangan...`);
          continue;
        }
        throw new Error(`Gemini API error (${errorDesc})`);
      }

      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText || typeof candidateText !== 'string') {
        throw new Error('Respons Gemini API tidak memuat kandidat teks JSON');
      }

      const parsedJson = JSON.parse(candidateText);
      const sanitizedExtracted = validateAndSanitizeAgentOutput(parsedJson);

      let fallbackReason: string | undefined = undefined;
      if (currentModel !== config.model && primaryModelFailureReason) {
        fallbackReason = `Model yang dikonfigurasi (${config.model}) dialihkan ke model cadangan (${currentModel}) karena kendala: ${primaryModelFailureReason}.`;
      }

      return {
        extracted: sanitizedExtracted,
        extractorSource: 'ai_agent',
        modelUsed: currentModel,
        modelRequested: config.model,
        fallbackReason,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errObj = err instanceof Error ? err : new Error(String(err));
      const sanitizedMsg = errObj.message.replace(/key=[^&\s]+/gi, 'key=***');
      lastError = new Error(sanitizedMsg);

      // Jika masih ada model cadangan dan error adalah timeout atau network/parse error
      if (candidateModels.indexOf(currentModel) < candidateModels.length - 1) {
        primaryModelFailureReason = `Model ${currentModel} gagal (${sanitizedMsg})`;
        console.warn(`[AI Agent] ${primaryModelFailureReason}, mencoba failover ke model cadangan...`);
        continue;
      }
    }
  }

  const errorMessage = lastError ? lastError.message : 'Unknown agent error';
  const fallbackExtracted = parseClaim(text);

  return {
    extracted: fallbackExtracted,
    extractorSource: 'fallback_heuristic',
    modelRequested: config.model,
    fallbackReason: `Seluruh model AI gagal (${errorMessage}). Ekstraksi dialihkan ke parser heuristik cadangan.`,
  };
}
