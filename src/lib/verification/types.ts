/**
 * Tipe data untuk modul verifikasi klaim BursaBukti sesuai SRS v1.1
 */

export type ClaimCategory = 'price_change' | 'news_mention' | 'financial_metric' | 'unsupported';

export interface ExtractedClaim {
  category: ClaimCategory;
  symbol: string | null;        // normalisasi BBRI / BBRI.JK -> BBRI.JK
  date: string | null;          // YYYY-MM-DD untuk price_change / news_mention
  metric: 'close' | 'earnings' | 'news_headline' | null;
  operator: 'eq' | 'gt' | 'lt' | 'up' | 'down' | null;
  statedValue: number | null;
  unit: 'IDR' | 'percent' | null;
  periodLabel: string | null;
  keywords?: string[];          // kata kunci topik/berita
  coreAssertion?: string | null;// substansi klaim spesifik
  publisher?: string | null;    // nama media/penerbit spesifik jika disebut (contoh: CNBC, Kontan, Detik)
  ambiguity: string[];
}

export type VerificationStatus = 'supported' | 'contradicted' | 'insufficient_evidence' | 'failed';

export interface EvidenceItem {
  id: string;
  sourceType: string;
  endpoint: string;
  safeParams: Record<string, unknown>;
  dataDate: string | null;
  fetchedAt: string;
  publicUrl: string | null;
}

export interface CalculationDetail {
  formula: string;
  previous: number;
  current: number;
  resultPercent: number;
}

export interface VerificationReceipt {
  receiptId: string;
  claim: string;
  interpreted: {
    category: ClaimCategory;
    symbol: string | null;
    date: string | null;
    statedValue: number | null;
    unit: 'IDR' | 'percent' | null;
    coreAssertion?: string | null;
    publisher?: string | null;
  };
  status: VerificationStatus;
  reason: string;
  calculation?: CalculationDetail;
  evidence: EvidenceItem[];
  limitations: string[];
  rulesVersion: string;
  disclaimer: string;
  extractorSource?: 'ai_agent' | 'fallback_heuristic';
  modelUsed?: string;
  modelRequested?: string;
  fallbackReason?: string;
}
