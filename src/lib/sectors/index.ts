/**
 * Modul Integrasi Sectors API
 *
 * Struktur awal untuk klien Sectors API.
 * Implementasi endpoint akan disesuaikan setelah spesifikasi teknis (SRS) difinalisasi.
 */

export interface SectorsConfig {
  apiKey: string;
  baseUrl: string;
}

export function getSectorsConfig(): SectorsConfig {
  const apiKey = process.env.SECTORS_API_KEY || '';
  const baseUrl = process.env.SECTORS_API_BASE_URL || 'https://api.sectors.app/v1';

  return {
    apiKey,
    baseUrl,
  };
}
