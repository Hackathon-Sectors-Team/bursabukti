import { Metadata } from 'next';
import Link from 'next/link';
import { getReceiptSnapshot, isValidUUID, isDatabaseConfigured } from '@/lib/db';
import { ReceiptView } from './ReceiptView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = params;
  if (!isValidUUID(id)) {
    return {
      title: 'Receipt Tidak Valid — BursaBukti',
    };
  }

  const receipt = await getReceiptSnapshot(id);
  if (!receipt) {
    return {
      title: 'Receipt Tidak Ditemukan — BursaBukti',
    };
  }

  return {
    title: `Receipt Verifikasi: "${receipt.claim.slice(0, 50)}..." — BursaBukti`,
    description: `Hasil verifikasi: ${receipt.reason}`,
  };
}

export default async function ReceiptDetailPage({ params }: PageProps) {
  const { id } = params;

  // 1. Validasi Format UUID
  if (!isValidUUID(id)) {
    return (
      <div className="dash-layout">
        <div className="dash-container" style={{ maxWidth: '800px', textAlign: 'center', padding: '60px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#f87171' }}>
            Format ID Receipt Tidak Valid
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            ID receipt <code style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{id}</code> tidak sesuai dengan format UUID standar.
          </p>
          <Link href="/dashboard" className="dash-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 2. Periksa Apakah Database Terkonfigurasi
  if (!isDatabaseConfigured()) {
    return (
      <div className="dash-layout">
        <div className="dash-container" style={{ maxWidth: '800px', textAlign: 'center', padding: '60px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚙️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#fde047' }}>
            Database Belum Dikonfigurasi
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Penyimpanan receipt permanen belum aktif karena server belum dikonfigurasi dengan <code>DATABASE_URL</code> PostgreSQL.
          </p>
          <Link href="/dashboard" className="dash-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 3. Ambil Snapshot dari Database
  const receipt = await getReceiptSnapshot(id);

  if (!receipt) {
    return (
      <div className="dash-layout">
        <div className="dash-container" style={{ maxWidth: '800px', textAlign: 'center', padding: '60px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: '#f87171' }}>
            Receipt Tidak Ditemukan
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Snapshot receipt dengan ID <code style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{id}</code> tidak ditemukan di database. Pastikan tautan sudah benar atau verifikasi klaim baru.
          </p>
          <Link href="/dashboard" className="dash-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            🔍 Verifikasi Klaim Baru
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-layout" style={{ alignItems: 'flex-start', padding: '32px 16px' }}>
      <div className="dash-container" style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header Bersih dan Rapi */}
        <div className="dash-header">
          <div className="logo-container" style={{ margin: 0 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <img src="/logo.png" alt="BursaBukti Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              <div className="logo-text-col" style={{ textAlign: 'left' }}>
                <div className="logo" style={{ fontSize: '1.2rem' }}>
                  <span className="logo-span-2" style={{ color: '#C52839' }}>Bursa</span>
                  <span className="logo-span-1" style={{ color: '#fff' }}>Bukti</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                  SNAPSHOT DOKUMEN RESMI
                </div>
              </div>
            </Link>
          </div>

          <div className="dash-header-actions">
            <Link
              href="/dashboard"
              className="dash-btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
            >
              ← Verifikasi Lagi
            </Link>
          </div>
        </div>

        {/* Content Body */}
        <div className="dash-body" style={{ padding: '32px 40px' }}>
          <ReceiptView receipt={receipt} />
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 40px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: '#0e0f12',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>© 2026 BursaBukti — Track 01 Sectors Hackathon. Snapshot data immutable; bukan saran investasi.</div>
          <div>DOC REF: <code style={{ color: '#fff' }}>{receipt.receiptId}</code></div>
        </div>
      </div>
    </div>
  );
}
