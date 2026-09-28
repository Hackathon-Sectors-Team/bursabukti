/**
 * Tipe data untuk integrasi Sectors API
 */

export interface DailyPriceRecord {
  symbol?: string;
  date: string; // Format ISO: YYYY-MM-DD
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  [key: string]: unknown;
}

export interface NewsArticleRecord {
  id?: string | number;
  title: string;
  body: string;
  source: string;
  timestamp: string;
  symbols: string[];
  url?: string;
  [key: string]: unknown;
}

export interface SectorsClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
}

export type SectorsErrorCode =
  | 'UPSTREAM_AUTH'
  | 'UPSTREAM_CREDITS'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_NOT_FOUND'
  | 'UPSTREAM_ERROR';

export class SectorsApiError extends Error {
  code: SectorsErrorCode;
  status: number;

  constructor(code: SectorsErrorCode, message: string, status: number = 500) {
    super(message);
    this.name = 'SectorsApiError';
    this.code = code;
    this.status = status;
  }
}
