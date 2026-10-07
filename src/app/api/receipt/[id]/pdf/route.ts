import { NextRequest, NextResponse } from 'next/server';
import { getReceiptSnapshot, isValidUUID, isDatabaseConfigured } from '@/lib/db';
import { generateReceiptPdf } from '@/lib/pdf/generator';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const receiptId = params.id;

  // 1. Validasi Format UUID
  if (!isValidUUID(receiptId)) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_ID',
          message: 'Format ID receipt tidak valid. Harap gunakan format UUID yang benar.',
        },
      },
      { status: 400 }
    );
  }

  // 2. Validasi Konfigurasi Database
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: 'DATABASE_UNCONFIGURED',
          message: 'Layanan penyimpanan database belum dikonfigurasi pada server.',
        },
      },
      { status: 503 }
    );
  }

  // 3. Ambil Snapshot dari Database (Murni membaca snapshot, tanpa memanggil Gemini/Sectors)
  const receipt = await getReceiptSnapshot(receiptId);

  if (!receipt) {
    return NextResponse.json(
      {
        error: {
          code: 'RECEIPT_NOT_FOUND',
          message: `Snapshot receipt dengan ID "${receiptId}" tidak ditemukan di database.`,
        },
      },
      { status: 404 }
    );
  }

  try {
    const pdfBuffer = await generateReceiptPdf(receipt);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${receiptId}.pdf"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown PDF generation error';
    console.error(`⚠️ [BursaBukti PDF Error] Gagal membuat PDF receipt ${receiptId}:`, errorMsg);

    return NextResponse.json(
      {
        error: {
          code: 'PDF_GENERATION_FAILED',
          message: 'Gagal membuat dokumen PDF tanda bukti verifikasi.',
        },
      },
      { status: 500 }
    );
  }
}
