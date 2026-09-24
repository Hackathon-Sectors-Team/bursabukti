/**
 * Tipe data untuk modul verifikasi klaim BursaBukti sesuai SRS v1.1
 */

export type ClaimCategory = 'price_change' | 'news_mention' | 'financial_metric' | 'unsupported';

export interface ExtractedClaim {
  category: ClaimCategory;
  symbol: string | null;        // normalisasi BBRI / BBRI.JK -> BBRI.JK
  date: string | null;          // YYYY-MM-DD untuk price_change
  metric: 'close' | 'earnings' | null;
  operator: 'eq' | 'gt' | 'lt' | 'up' | 'down' | null;
  statedValue: number | null;
  unit: 'IDR' | 'percent' | null;
  periodLabel: string | null;
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
  };
  status: VerificationStatus;
  reason: string;
  calculation?: CalculationDetail;
  evidence: EvidenceItem[];
  limitations: string[];
  rulesVersion: string;
  disclaimer: string;
}
