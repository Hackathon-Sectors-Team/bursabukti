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
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <header className="header" style={{ marginBottom: '32px' }}>
          <div className="container header-content">
            <Link href="/" className="logo">
              <span>BursaBukti</span>
              <span className="badge">Receipt Viewer</span>
            </Link>
          </div>
        </header>

        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#f87171' }}>
            Format ID Receipt Tidak Valid
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px' }}>
            ID receipt <code>{id}</code> tidak sesuai dengan format UUID standar. Harap periksa kembali tautan yang Anda buka.
          </p>
          <Link href="/" className="button-primary">
            🔍 Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    );
  }

  // 2. Periksa Apakah Database Terkonfigurasi
  if (!isDatabaseConfigured()) {
    return (
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <header className="header" style={{ marginBottom: '32px' }}>
          <div className="container header-content">
            <Link href="/" className="logo">
              <span>BursaBukti</span>
              <span className="badge">Receipt Viewer</span>
            </Link>
          </div>
        </header>

        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚙️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#fde047' }}>
            Database Belum Dikonfigurasi
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 24px' }}>
            Penyimpanan receipt permanen belum aktif karena server belum dikonfigurasi dengan <code>DATABASE_URL</code> PostgreSQL.
          </p>
          <Link href="/" className="button-primary">
            🔍 Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    );
  }

  // 3. Ambil Snapshot dari Database
  const receipt = await getReceiptSnapshot(id);

  if (!receipt) {
    return (
      <div className="container" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <header className="header" style={{ marginBottom: '32px' }}>
          <div className="container header-content">
            <Link href="/" className="logo">
              <span>BursaBukti</span>
              <span className="badge">Receipt Viewer</span>
            </Link>
          </div>
        </header>

        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: '#f87171' }}>
            Receipt Tidak Ditemukan
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 24px' }}>
            Snapshot receipt dengan ID <code>{id}</code> tidak ditemukan di database. Pastikan tautan tidak salah atau klaim sudah diverifikasi sebelumnya.
          </p>
          <Link href="/" className="button-primary">
            🔍 Verifikasi Klaim Baru
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="container header-content">
          <Link href="/" className="logo">
            <span>BursaBukti</span>
            <span className="badge">Receipt Snapshot</span>
          </Link>
          <nav>
            <Link
              href="/"
              style={{
                fontSize: '0.85rem',
                color: 'var(--accent-blue)',
                textDecoration: 'underline',
              }}
            >
              ← Kembali ke Verifikasi
            </Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingBottom: '60px' }}>
        <ReceiptView receipt={receipt} />
      </main>

      <footer className="footer container">
        <p>© 2026 BursaBukti — Track 01 Sectors Hackathon. Snapshot data immutable; bukan saran investasi.</p>
      </footer>
    </div>
  );
}
