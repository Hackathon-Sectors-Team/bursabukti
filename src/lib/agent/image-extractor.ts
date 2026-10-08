import { getAgentConfig } from './extractor';
import { IMAGE_SYSTEM_INSTRUCTION, GEMINI_IMAGE_RESPONSE_SCHEMA } from './prompts';
import { AgentConfig, ImageExtractionResult } from './types';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type AllowedImageMimeType = typeof ALLOWED_IMAGE_MIME_TYPES[number];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function isAllowedImageMime(mime: string): mime is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime.toLowerCase());
}

/**
 * Validasi dan sanitasi output JSON dari AI Vision Model
 */
export function validateAndSanitizeVisionOutput(raw: unknown): {
  isReadable: boolean;
  extractedText: string;
  suggestedTicker: string | null;
  confidence: 'high' | 'medium' | 'low';
  message: string;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      isReadable: false,
      extractedText: '',
      suggestedTicker: null,
      confidence: 'low',
      message: 'Respons dari AI Vision tidak berupa format JSON valid.',
    };
  }

  const obj = raw as Record<string, unknown>;

  const isReadable = Boolean(obj.isReadable);
  const extractedText = typeof obj.extractedText === 'string' ? obj.extractedText.trim().slice(0, 1000) : '';

  let suggestedTicker: string | null = null;
  if (typeof obj.suggestedTicker === 'string' && obj.suggestedTicker.trim()) {
    const clean = obj.suggestedTicker.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (clean.length >= 4 && clean.length <= 6) {
      suggestedTicker = clean;
    }
  }

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (obj.confidence === 'high' || obj.confidence === 'medium' || obj.confidence === 'low') {
    confidence = obj.confidence;
  }

  const message = typeof obj.message === 'string' && obj.message.trim()
    ? obj.message.trim()
    : isReadable
    ? 'Teks klaim berhasil diekstrak dari gambar. Silakan periksa atau sesuaikan sebelum verifikasi.'
    : 'Gambar tidak memuat teks klaim pasar modal yang cukup jelas atau tidak terbaca.';

  return {
    isReadable,
    extractedText,
    suggestedTicker,
    confidence,
    message,
  };
}

/**
 * Ekstraksi teks klaim pasar modal dari gambar menggunakan AI Vision (Google Gemini Multimodal)
 */
export async function extractClaimFromImage(
  imageBuffer: Buffer | Uint8Array,
  mimeType: string,
  customConfig?: Partial<AgentConfig>
): Promise<ImageExtractionResult> {
  const config = {
    ...getAgentConfig(),
    ...customConfig,
  };

  // 1. Validasi Ukuran File
  if (imageBuffer.byteLength > MAX_IMAGE_SIZE_BYTES) {
    return {
      success: false,
      extractedText: '',
      confidence: 'low',
      message: `Ukuran gambar (${(imageBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 5 MB.`,
      extractorSource: 'fallback',
    };
  }

  // 2. Validasi MIME Type
  if (!isAllowedImageMime(mimeType)) {
    return {
      success: false,
      extractedText: '',
      confidence: 'low',
      message: `Format gambar "${mimeType}" tidak didukung. Mohon unggah gambar berformat PNG, JPEG, atau WebP.`,
      extractorSource: 'fallback',
    };
  }

  // 3. Jika API key belum dikonfigurasi
  if (!config.apiKey) {
    return {
      success: false,
      extractedText: '',
      confidence: 'low',
      message: 'Layanan AI Vision memerlukan GEMINI_API_KEY pada server.',
      extractorSource: 'fallback',
      fallbackReason: 'GEMINI_API_KEY tidak dikonfigurasi pada server.',
    };
  }

  const base64Data = Buffer.isBuffer(imageBuffer)
    ? imageBuffer.toString('base64')
    : Buffer.from(imageBuffer).toString('base64');

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: 'Bacalah teks berita, judul, angka, grafik harga, atau klaim pasar modal Indonesia dari gambar screenshot ini secara akurat. Tuliskan teks apa adanya tanpa mengarang data.',
          },
        ],
      },
    ],
    systemInstruction: {
      parts: [{ text: IMAGE_SYSTEM_INSTRUCTION }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_IMAGE_RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  };

  const candidateModels = [config.model];
  if (config.model !== 'gemini-3.1-flash-lite') {
    candidateModels.push('gemini-3.1-flash-lite');
  }

  let lastError: Error | null = null;
  let primaryModelFailureReason: string | null = null;

  for (const currentModel of candidateModels) {
    const endpoint = `${config.baseUrl}/models/${currentModel}:generateContent?key=${config.apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs || 20000);

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
        const sanitizedErr = rawErrText.slice(0, 150).replace(/key=[^&\s]+/gi, 'key=***');
        const errorDesc = `HTTP ${response.status}${sanitizedErr ? `: ${sanitizedErr}` : ''}`;

        if (candidateModels.indexOf(currentModel) < candidateModels.length - 1) {
          primaryModelFailureReason = `Model ${currentModel} gagal (${errorDesc})`;
          console.warn(`[AI Vision] ${primaryModelFailureReason}, mencoba failover ke model cadangan...`);
          continue;
        }
        throw new Error(`Gemini Vision API error (${errorDesc})`);
      }

      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText || typeof candidateText !== 'string') {
        throw new Error('Respons Gemini Vision tidak memuat kandidat teks JSON');
      }

      const parsedJson = JSON.parse(candidateText);
      const sanitized = validateAndSanitizeVisionOutput(parsedJson);

      let fallbackReason: string | undefined = undefined;
      if (currentModel !== config.model && primaryModelFailureReason) {
        fallbackReason = `Model vision (${config.model}) dialihkan ke model cadangan (${currentModel}) karena kendala: ${primaryModelFailureReason}.`;
      }

      return {
        success: sanitized.isReadable && sanitized.extractedText.length > 0,
        extractedText: sanitized.extractedText,
        suggestedTicker: sanitized.suggestedTicker,
        confidence: sanitized.confidence,
        message: sanitized.message,
        extractorSource: 'ai_vision',
        modelUsed: currentModel,
        modelRequested: config.model,
        fallbackReason,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errObj = err instanceof Error ? err : new Error(String(err));
      const sanitizedMsg = errObj.message.replace(/key=[^&\s]+/gi, 'key=***');
      lastError = new Error(sanitizedMsg);

      if (candidateModels.indexOf(currentModel) < candidateModels.length - 1) {
        primaryModelFailureReason = `Model ${currentModel} gagal (${sanitizedMsg})`;
        console.warn(`[AI Vision] ${primaryModelFailureReason}, mencoba failover ke model cadangan...`);
        continue;
      }
    }
  }

  const errorMessage = lastError ? lastError.message : 'Unknown AI vision error';

  return {
    success: false,
    extractedText: '',
    confidence: 'low',
    message: `Gagal membaca gambar (${errorMessage}). Silakan ketik klaim secara manual.`,
    extractorSource: 'fallback',
    modelRequested: config.model,
    fallbackReason: `Seluruh model AI Vision gagal (${errorMessage}).`,
  };
}
