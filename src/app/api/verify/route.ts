import { NextRequest, NextResponse } from 'next/server';
import { SectorsApiError } from '@/lib/sectors';
import { extractClaimWithAgent } from '@/lib/agent';
import { verifyClaim } from '@/lib/verification';

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

    // 1. Ekstraksi Klaim Menggunakan AI Agent (Dengan Server Validation & Fallback Heuristik)
    const { extracted, extractorSource, modelUsed, modelRequested, fallbackReason } = await extractClaimWithAgent(trimmedClaim);

    // 2. Verifikasi Menggunakan Data Sectors API (Deterministik: Harga / Berita)
    const receipt = await verifyClaim(trimmedClaim, extracted, extractorSource, modelUsed, modelRequested, fallbackReason);

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
