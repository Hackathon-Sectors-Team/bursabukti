import { NextRequest, NextResponse } from 'next/server';
import { SectorsApiError } from '@/lib/sectors';
import { extractClaimWithAgent } from '@/lib/agent';
import { verifyClaim } from '@/lib/verification';
import { saveReceiptSnapshot, isDatabaseConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CLAIM',
            message: 'Content-Type harus berupa application/json.',
          },
        },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CLAIM',
            message: 'Format payload JSON tidak valid.',
          },
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || !('claim' in body)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CLAIM',
            message: 'Payload wajib memuat field "claim" berupa string.',
          },
        },
        { status: 400 }
      );
    }

    const rawClaim = (body as { claim: unknown }).claim;
    if (typeof rawClaim !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CLAIM',
            message: 'Field "claim" harus berupa teks string.',
          },
        },
        { status: 400 }
      );
    }

    const trimmedClaim = rawClaim.trim();
    if (trimmedClaim.length === 0 || trimmedClaim.length > 1000) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CLAIM',
            message: 'Panjang teks klaim harus antara 1 sampai 1.000 karakter.',
          },
        },
        { status: 400 }
      );
    }

    const startTime = performance.now();

    // 1. Ekstraksi Klaim Menggunakan AI Agent (Dengan Server Validation & Fallback Heuristik)
    const tExtractStart = performance.now();
    const { extracted, extractorSource, modelUsed, modelRequested, fallbackReason } = await extractClaimWithAgent(trimmedClaim);
    const extractDuration = performance.now() - tExtractStart;

    // 2. Verifikasi Menggunakan Data Sectors API (Deterministik: Harga / Berita)
    const tVerifyStart = performance.now();
    const receipt = await verifyClaim(trimmedClaim, extracted, extractorSource, modelUsed, modelRequested, fallbackReason);
    const verifyDuration = performance.now() - tVerifyStart;

    // 3. Simpan Snapshot Hasil Receipt ke Database PostgreSQL (Jika Dikonfigurasi)
    const tDbStart = performance.now();
    const dbReady = isDatabaseConfigured();
    if (!dbReady) {
      receipt.storageStatus = 'unconfigured';
      receipt.shareableUrl = null;
    } else {
      const saveResult = await saveReceiptSnapshot(receipt);
      if (saveResult.success) {
        receipt.storageStatus = 'saved';
        receipt.shareableUrl = `/receipt/${receipt.receiptId}`;
      } else {
        receipt.storageStatus = 'failed';
        receipt.shareableUrl = null;
      }
    }
    const dbDuration = performance.now() - tDbStart;
    const totalDuration = performance.now() - startTime;

    console.log(
      `[Verify Timings] Extraction: ${extractDuration.toFixed(0)}ms (${extractorSource}) | Verification & Sectors: ${verifyDuration.toFixed(0)}ms | DB Storage: ${dbDuration.toFixed(0)}ms | Total: ${totalDuration.toFixed(0)}ms`
    );

    return NextResponse.json(receipt, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof SectorsApiError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
          status: 'failed',
        },
        { status: error.status || 502 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Terjadi kesalahan internal pada server saat memproses klaim.',
        },
        status: 'failed',
      },
      { status: 500 }
    );
  }
}
