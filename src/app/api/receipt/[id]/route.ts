import { NextRequest, NextResponse } from 'next/server';
import { getReceiptSnapshot, isValidUUID, isDatabaseConfigured } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const receiptId = params.id;

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

  return NextResponse.json(receipt, { status: 200 });
}
