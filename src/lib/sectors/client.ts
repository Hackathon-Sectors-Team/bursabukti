import { DailyPriceRecord, NewsArticleRecord, SectorsApiError, SectorsClientConfig } from './types';

/**
 * Mendapatkan konfigurasi Sectors API dari environment variable (hanya di server)
 */
export function getSectorsConfig(): SectorsClientConfig {
  const apiKey = (process.env.SECTORS_API_KEY || '').trim();
  const baseUrl = (process.env.SECTORS_API_BASE_URL || 'https://api.sectors.app/v2').trim().replace(/\/+$/, '');

  return {
    apiKey,
    baseUrl,
    timeoutMs: 20000,
  };
}

/**
 * Sanitasi simbol ticker IDX untuk mencegah path traversal / injection
 */
export function sanitizeTickerSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') {
    throw new SectorsApiError('UPSTREAM_ERROR', 'Simbol saham tidak valid', 400);
  }
  // Ambil ticker utama sebelum .JK jika ada, dan hanya izinkan alfanumerik 2-8 karakter
  const clean = symbol.trim().toUpperCase().replace(/\.JK$/i, '');
  if (!/^[A-Z0-9]{2,8}$/.test(clean)) {
    throw new SectorsApiError('UPSTREAM_ERROR', `Format simbol ticker tidak valid: ${symbol}`, 400);
  }
  return clean;
}

export class SectorsClient {
  private config?: Partial<SectorsClientConfig>;

  constructor(customConfig?: Partial<SectorsClientConfig>) {
    this.config = customConfig;
  }

  /**
   * Mengambil data harga harian dari endpoint GET /daily/{symbol}/
   * Parameter query yang diizinkan: start, end (format ISO YYYY-MM-DD)
   */
  async getDailyPrices(symbol: string, start?: string, end?: string): Promise<DailyPriceRecord[]> {
    const cleanSymbol = sanitizeTickerSymbol(symbol);
    const activeConfig: SectorsClientConfig = {
      ...getSectorsConfig(),
      ...this.config,
    };

    if (!activeConfig.apiKey) {
      throw new SectorsApiError(
        'UPSTREAM_AUTH',
        'SECTORS_API_KEY belum dikonfigurasi pada server.',
        502
      );
    }

    // Bangun URL dengan allowlist parameter
    const queryParams = new URLSearchParams();
    if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
      queryParams.set('start', start);
    }
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
      queryParams.set('end', end);
    }

    const queryString = queryParams.toString();
    const url = `${activeConfig.baseUrl}/daily/${cleanSymbol}/${queryString ? `?${queryString}` : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), activeConfig.timeoutMs || 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: activeConfig.apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new SectorsApiError('UPSTREAM_AUTH', 'Autentikasi Sectors API gagal (kunci API tidak valid).', 502);
      }
      if (response.status === 403) {
        throw new SectorsApiError('UPSTREAM_CREDITS', 'Akses Sectors API ditolak atau kuota/kredit habis.', 502);
      }
      if (response.status === 404) {
        return [];
      }
      if (response.status === 408 || response.status === 504) {
        throw new SectorsApiError('UPSTREAM_TIMEOUT', 'Permintaan ke Sectors API melebihi batas waktu (timeout).', 504);
      }
      if (!response.ok) {
        throw new SectorsApiError(
          'UPSTREAM_ERROR',
          `Sectors API mengembalikan status kesalahan HTTP ${response.status}`,
          response.status >= 500 ? 502 : 400
        );
      }

      const json = await response.json();

      // Normalisasi respons: Sectors API mengembalikan array atau objek bertingkat
      let records: unknown[] = [];
      if (Array.isArray(json)) {
        records = json;
      } else if (json && Array.isArray(json.data)) {
        records = json.data;
      } else if (json && Array.isArray(json.results)) {
        records = json.results;
      } else if (json && typeof json === 'object') {
        // Objek tunggal
        records = [json];
      }

      // Format dan validasi record harian
      const validRecords: DailyPriceRecord[] = records
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item) => {
          const dateStr = typeof item.date === 'string' ? item.date.slice(0, 10) : '';
          const closeVal = Number(item.close);
          return {
            symbol: typeof item.symbol === 'string' ? item.symbol : cleanSymbol,
            date: dateStr,
            close: isNaN(closeVal) ? 0 : closeVal,
            open: item.open !== undefined ? Number(item.open) : undefined,
            high: item.high !== undefined ? Number(item.high) : undefined,
            low: item.low !== undefined ? Number(item.low) : undefined,
            volume: item.volume !== undefined ? Number(item.volume) : undefined,
          };
        })
        .filter((r) => r.date && r.close > 0);

      // Urutkan berdasarkan tanggal naik (ascending)
      validRecords.sort((a, b) => a.date.localeCompare(b.date));

      return validRecords;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof SectorsApiError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new SectorsApiError('UPSTREAM_TIMEOUT', 'Permintaan ke Sectors API timeout.', 504);
      }

      throw new SectorsApiError(
        'UPSTREAM_ERROR',
        `Gagal menghubungi layanan Sectors API: ${err instanceof Error ? err.message : 'Unknown error'}`,
        502
      );
    }
  }

  /**
   * Mengambil data artikel berita dari endpoint GET /news/
   * Parameter query yang diizinkan: extension (idx), symbols, start, end, limit
   */
  async getNews(
    symbols?: string,
    start?: string,
    end?: string,
    limit: number = 20
  ): Promise<NewsArticleRecord[]> {
    const activeConfig: SectorsClientConfig = {
      ...getSectorsConfig(),
      ...this.config,
    };

    if (!activeConfig.apiKey) {
      throw new SectorsApiError(
        'UPSTREAM_AUTH',
        'SECTORS_API_KEY belum dikonfigurasi pada server.',
        502
      );
    }

    const queryParams = new URLSearchParams();
    queryParams.set('extension', 'idx');

    if (symbols) {
      const cleanSymbols = symbols
        .split(',')
        .map((s) => s.trim().toUpperCase().replace(/\.JK$/i, ''))
        .filter((s) => /^[A-Z0-9]{2,8}$/.test(s))
        .join(',');
      if (cleanSymbols) {
        queryParams.set('symbols', cleanSymbols);
      }
    }

    if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
      queryParams.set('start', start);
    }
    if (end && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
      queryParams.set('end', end);
    }

    const safeLimit = Math.max(1, Math.min(limit, 50));
    queryParams.set('limit', String(safeLimit));

    const url = `${activeConfig.baseUrl}/news/?${queryParams.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), activeConfig.timeoutMs || 10000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: activeConfig.apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new SectorsApiError('UPSTREAM_AUTH', 'Autentikasi Sectors API gagal (kunci API tidak valid).', 502);
      }
      if (response.status === 403) {
        throw new SectorsApiError('UPSTREAM_CREDITS', 'Akses Sectors API ditolak atau kuota/kredit habis.', 502);
      }
      if (response.status === 404) {
        return [];
      }
      if (response.status === 408 || response.status === 504) {
        throw new SectorsApiError('UPSTREAM_TIMEOUT', 'Permintaan ke Sectors API melebihi batas waktu (timeout).', 504);
      }
      if (!response.ok) {
        throw new SectorsApiError(
          'UPSTREAM_ERROR',
          `Sectors API mengembalikan status kesalahan HTTP ${response.status}`,
          response.status >= 500 ? 502 : 400
        );
      }

      const json = await response.json();

      let items: unknown[] = [];
      if (Array.isArray(json)) {
        items = json;
      } else if (json && Array.isArray(json.results)) {
        items = json.results;
      } else if (json && Array.isArray(json.data)) {
        items = json.data;
      } else if (json && typeof json === 'object') {
        items = [json];
      }

      const validArticles: NewsArticleRecord[] = items
        .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        .map((item) => {
          const title = typeof item.title === 'string' ? item.title.trim() : '';
          const body = typeof item.body === 'string' ? item.body.trim() : '';
          const source = typeof item.source === 'string' ? item.source.trim() : 'Sectors News';
          const timestamp = typeof item.timestamp === 'string' ? item.timestamp : '';
          const rawSymbols = Array.isArray(item.symbols) ? item.symbols : [];
          const symbolsList = rawSymbols.map((s) => String(s).toUpperCase().replace(/\.JK$/i, ''));
          const url = typeof item.url === 'string' ? item.url : undefined;

          return {
            id: typeof item.id === 'string' || typeof item.id === 'number' ? item.id : undefined,
            title,
            body,
            source,
            timestamp,
            symbols: symbolsList,
            url,
          };
        })
        .filter((a) => a.title.length > 0);

      return validArticles;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof SectorsApiError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new SectorsApiError('UPSTREAM_TIMEOUT', 'Permintaan ke Sectors API timeout.', 504);
      }

      throw new SectorsApiError(
        'UPSTREAM_ERROR',
        `Gagal menghubungi layanan Sectors API News: ${err instanceof Error ? err.message : 'Unknown error'}`,
        502
      );
    }
  }
}

// Instance default untuk server
export const sectorsClient = new SectorsClient();
