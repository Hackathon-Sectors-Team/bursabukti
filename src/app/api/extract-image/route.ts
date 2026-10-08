import { NextRequest, NextResponse } from 'next/server';
import { extractClaimFromImage, isAllowedImageMime, MAX_IMAGE_SIZE_BYTES } from '@/lib/agent';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Content-Type harus berupa multipart/form-data untuk unggah gambar.',
          },
        },
        { status: 400 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_FORM_DATA',
            message: 'Gagal memproses form data gambar.',
          },
        },
        { status: 400 }
      );
    }

    const file = formData.get('image') || formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          error: {
            code: 'FILE_MISSING',
            message: 'File gambar tidak ditemukan dalam payload form-data (gunakan field "image" atau "file").',
          },
        },
        { status: 400 }
      );
    }

    // 1. Validasi Ukuran File (Server-side)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: 'FILE_TOO_LARGE',
            message: `Ukuran file ${(file.size / (1024 * 1024)).toFixed(1)} MB melebihi batas maksimal 5 MB.`,
          },
        },
        { status: 400 }
      );
    }

    // 2. Validasi MIME Type (Server-side)
    const mimeType = file.type || 'application/octet-stream';
    if (!isAllowedImageMime(mimeType)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_MIME_TYPE',
            message: `Format gambar "${mimeType}" tidak didukung. Harap unggah format PNG, JPEG, atau WebP.`,
          },
        },
        { status: 400 }
      );
    }

    // 3. Ekstraksi Teks Klaim dengan AI Vision di Server
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extractionResult = await extractClaimFromImage(buffer, mimeType);

    return NextResponse.json(extractionResult, { status: 200 });
  } catch (error: unknown) {
    console.error('[API Extract Image Error]:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Terjadi kesalahan internal server saat memproses gambar.',
        },
      },
      { status: 500 }
    );
  }
}
