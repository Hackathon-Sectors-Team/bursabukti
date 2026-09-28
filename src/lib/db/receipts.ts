import { query, isDatabaseConfigured } from './client';
import { VerificationReceipt } from '../verification/types';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Memvalidasi apakah string merupakan format UUID yang valid
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

export interface SaveReceiptResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Menyimpan snapshot hasil verifikasi ke PostgreSQL
 * Data disimpan secara immutable sesuai snapshot saat verifikasi (tanpa recalculation di masa depan)
 */
export async function saveReceiptSnapshot(receipt: VerificationReceipt): Promise<SaveReceiptResult> {
  if (!isDatabaseConfigured()) {
    return {
      id: receipt.receiptId,
      success: false,
      error: 'DATABASE_UNCONFIGURED',
    };
  }

  if (!isValidUUID(receipt.receiptId)) {
    return {
      id: receipt.receiptId,
      success: false,
      error: 'INVALID_RECEIPT_ID_FORMAT',
    };
  }

  try {
    const insertSql = `
      INSERT INTO receipts (
        id,
        claim,
        status,
        reason,
        interpreted,
        calculation,
        evidence,
        limitations,
        rules_version,
        disclaimer,
        extractor_source,
        model_used,
        model_requested,
        fallback_reason,
        verified_at,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `;

    const params = [
      receipt.receiptId,
      receipt.claim,
      receipt.status,
      receipt.reason,
      JSON.stringify(receipt.interpreted || {}),
      receipt.calculation ? JSON.stringify(receipt.calculation) : null,
      JSON.stringify(receipt.evidence || []),
      JSON.stringify(receipt.limitations || []),
      receipt.rulesVersion,
      receipt.disclaimer,
      receipt.extractorSource || null,
      receipt.modelUsed || null,
      receipt.modelRequested || null,
      receipt.fallbackReason || null,
      receipt.verifiedAt || new Date().toISOString(),
    ];

    await query(insertSql, params);

    return {
      id: receipt.receiptId,
      success: true,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown database error';
    console.error(`⚠️ [BursaBukti DB Save Error] Gagal menyimpan snapshot receipt ${receipt.receiptId}:`, errorMsg);

    return {
      id: receipt.receiptId,
      success: false,
      error: errorMsg,
    };
  }
}

interface ReceiptRow {
  id: string;
  claim: string;
  status: string;
  reason: string;
  interpreted: unknown;
  calculation: unknown;
  evidence: unknown;
  limitations: unknown;
  rules_version: string;
  disclaimer: string;
  extractor_source: string | null;
  model_used: string | null;
  model_requested: string | null;
  fallback_reason: string | null;
  verified_at: string | Date | null;
  created_at: string | Date | null;
}

/**
 * Mengambil snapshot receipt permanen berdasarkan ID UUID
 * Mengembalikan data persis seperti saat verifikasi disimpan
 */
export async function getReceiptSnapshot(id: string): Promise<VerificationReceipt | null> {
  const cleanId = (id || '').trim();

  if (!isValidUUID(cleanId)) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return null;
  }

  try {
    const selectSql = `
      SELECT
        id,
        claim,
        status,
        reason,
        interpreted,
        calculation,
        evidence,
        limitations,
        rules_version,
        disclaimer,
        extractor_source,
        model_used,
        model_requested,
        fallback_reason,
        verified_at,
        created_at
      FROM receipts
      WHERE id = $1
      LIMIT 1
    `;

    const result = await query<ReceiptRow>(selectSql, [cleanId]);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    const parseJsonField = <T>(val: unknown, fallback: T): T => {
      if (!val) return fallback;
      if (typeof val === 'string') {
        try {
          return JSON.parse(val) as T;
        } catch {
          return fallback;
        }
      }
      return val as T;
    };

    const receipt: VerificationReceipt = {
      receiptId: row.id,
      claim: row.claim,
      interpreted: parseJsonField(row.interpreted, {
        category: 'unsupported',
        symbol: null,
        date: null,
        statedValue: null,
        unit: null,
      }),
      status: row.status as VerificationReceipt['status'],
      reason: row.reason,
      calculation: row.calculation ? parseJsonField(row.calculation, undefined) : undefined,
      evidence: parseJsonField(row.evidence, []),
      limitations: parseJsonField(row.limitations, []),
      rulesVersion: row.rules_version,
      disclaimer: row.disclaimer,
      extractorSource: (row.extractor_source as VerificationReceipt['extractorSource']) || undefined,
      modelUsed: row.model_used || undefined,
      modelRequested: row.model_requested || undefined,
      fallbackReason: row.fallback_reason || undefined,
      verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
      storageStatus: 'saved',
      shareableUrl: `/receipt/${row.id}`,
    };

    return receipt;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown database error';
    console.error(`⚠️ [BursaBukti DB Get Error] Gagal membaca snapshot receipt ${cleanId}:`, errorMsg);
    return null;
  }
}
