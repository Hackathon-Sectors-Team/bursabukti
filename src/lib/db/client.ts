import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

/**
 * Memeriksa apakah database PostgreSQL telah dikonfigurasi melalui environment variable
 */
export function isDatabaseConfigured(): boolean {
  const connStr = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return Boolean(connStr && connStr.trim().length > 0);
}

/**
 * Mendapatkan konfigurasi Pool PostgreSQL berdasarkan environment variable
 */
export function getDbConfig(): PoolConfig | null {
  const connectionString = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
  if (!connectionString) {
    return null;
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const config: PoolConfig = {
    connectionString,
    connectionTimeoutMillis: 4000,
    idleTimeoutMillis: 15000,
    max: 10,
  };

  // Aktifkan SSL untuk host cloud (Supabase, Neon, dsb.) jika bukan koneksi lokal
  if (!isLocal && !connectionString.includes('sslmode=disable')) {
    config.ssl = {
      rejectUnauthorized: false,
    };
  }

  return config;
}

/**
 * Mendapatkan singleton instance pg.Pool
 */
export function getDbPool(): Pool | null {
  if (pool) {
    return pool;
  }

  const config = getDbConfig();
  if (!config) {
    return null;
  }

  pool = new Pool(config);

  // Tangani error tak terduga pada client idle di pool agar proses tidak crash
  pool.on('error', (err) => {
    console.error('⚠️ [BursaBukti DB Pool Error]:', err.message);
  });

  return pool;
}

/**
 * Menjalankan query SQL dengan perlindungan timeout dan error handling aman
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const dbPool = getDbPool();
  if (!dbPool) {
    throw new Error('DATABASE_UNCONFIGURED: DATABASE_URL belum dikonfigurasi pada environment.');
  }

  return dbPool.query<T>(text, params);
}

/**
 * Menutup pool koneksi database (berguna untuk testing / graceful shutdown)
 */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
