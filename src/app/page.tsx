'use client';

import { useState } from 'react';

interface VerificationReceipt {
  receiptId: string;
  claim: string;
  interpreted: {
    category: string;
    symbol: string | null;
    date: string | null;
    statedValue: number | null;
    unit: string | null;
  };
  status: 'supported' | 'contradicted' | 'insufficient_evidence' | 'failed';
  reason: string;
  calculation?: {
    formula: string;
    previous: number;
    current: number;
    resultPercent: number;
  };
  evidence: Array<{
    id: string;
    sourceType: string;
    endpoint: string;
    safeParams: Record<string, unknown>;
    dataDate: string;
    fetchedAt: string;
    publicUrl: string | null;
  }>;
  limitations: string[];
  rulesVersion: string;
  disclaimer: string;
}

export default function HomePage() {
  const [claimText, setClaimText] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<VerificationReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const sampleClaims = [
    'BBRI naik 0,31% pada 23 September 2026',
    'BBRI naik 3% pada 23 September 2026',
    'BBRI naik kemarin',
  ];

  async function handleVerify(textToVerify?: string) {
    const text = (textToVerify !== undefined ? textToVerify : claimText).trim();
    if (!text) return;

    setLoading(true);
    setErrorMessage(null);
    setReceipt(null);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claim: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data && data.error) {
          setErrorMessage(`[${data.error.code || 'ERROR'}] ${data.error.message || 'Gagal memproses klaim'}`);
        } else {
          setErrorMessage(`Terjadi kesalahan server (HTTP ${res.status}).`);
        }
        if (data && data.status === 'failed') {
          setReceipt(data);
        }
      } else {
        setReceipt(data);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menghubungi server aplikasi.');
    } finally {
      setLoading(false);
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'supported':
        return { label: 'Terbukti Didukung Data', className: 'status-supported', icon: '✓' };
      case 'contradicted':
        return { label: 'Bertentangan dengan Data', className: 'status-contradicted', icon: '✕' };
      case 'insufficient_evidence':
        return { label: 'Bukti Tidak Cukup / Perlu Klarifikasi', className: 'status-insufficient_evidence', icon: '⚠' };
      case 'failed':
      default:
        return { label: 'Gagal Memeriksa Layanan', className: 'status-failed', icon: '!' };
    }
  }

  return (
    <div>
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span>BursaBukti</span>
            <span className="badge">P0 Live</span>
          </div>
          <nav>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Sectors Hackathon 2026
            </span>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h1 className="hero-title">
            Verifikasi Klaim Pasar Modal <br />
            <span className="hero-gradient">Berdasarkan Fakta & Data</span>
          </h1>
          <p className="hero-description">
            Masukkan satu klaim harga saham IDX dengan tanggal eksplisit. BursaBukti akan menguji data historis resmi Sectors API dan memberikan receipt verifikasi yang dapat ditelusuri.
          </p>
        </section>

        <section className="card">
          <h2 className="card-title">
            🔍 Masukkan Klaim Saham
          </h2>

          <textarea
            className="textarea-input"
            rows={3}
            placeholder="Contoh: BBRI naik 0,31% pada 23 September 2026"
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            disabled={loading}
          />

          <div className="quick-examples">
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Contoh cepat:</span>
            {sampleClaims.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                className="quick-example-btn"
                onClick={() => {
                  setClaimText(sample);
                  handleVerify(sample);
                }}
                disabled={loading}
              >
                {sample}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              *Mendukung simbol 4 huruf (misal: BBRI) dan tanggal eksplisit (misal: 23 September 2026).
            </span>
            <button
              className="button-primary"
              onClick={() => handleVerify()}
              disabled={loading || !claimText.trim()}
            >
              {loading ? 'Memeriksa Data Sectors API...' : 'Verifikasi Klaim'}
            </button>
          </div>
        </section>

        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
            color: '#fca5a5',
            fontSize: '0.9rem'
          }}>
            <strong>Peringatan:</strong> {errorMessage}
          </div>
        )}

        {receipt && (
          <section className="receipt-container">
            <div className="receipt-header">
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  RECEIPT ID: {receipt.receiptId}
                </span>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  &ldquo;{receipt.claim}&rdquo;
                </div>
              </div>
              <div>
                {(() => {
                  const statusInfo = getStatusLabel(receipt.status);
                  return (
                    <span className={`status-badge ${statusInfo.className}`}>
                      <span>{statusInfo.icon}</span>
                      <span>{statusInfo.label}</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="receipt-body">
              <div className="receipt-section">
                <div className="receipt-section-title">Hasil Pemeriksaan</div>
                <div className="receipt-reason">
                  {receipt.reason}
                </div>
              </div>

              {receipt.calculation && (
                <div className="receipt-section">
                  <div className="receipt-section-title">Rincian Perhitungan Persentase</div>
                  <div className="calc-grid">
                    <div className="calc-box">
                      <div className="calc-label">Penutupan Sebelumnya</div>
                      <div className="calc-val">{receipt.calculation.previous.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="calc-box">
                      <div className="calc-label">Penutupan Target</div>
                      <div className="calc-val">{receipt.calculation.current.toLocaleString('id-ID')}</div>
                    </div>
                    <div className="calc-box">
                      <div className="calc-label">Hasil Perubahan</div>
                      <div className="calc-val" style={{ color: receipt.calculation.resultPercent >= 0 ? '#34d399' : '#fb7185' }}>
                        {receipt.calculation.resultPercent >= 0 ? '+' : ''}
                        {receipt.calculation.resultPercent.toFixed(2).replace('.', ',')}%
                      </div>
                    </div>
                    <div className="calc-box">
                      <div className="calc-label">Rumus Deterministik</div>
                      <div className="calc-val" style={{ fontSize: '0.8rem', paddingTop: '4px' }}>
                        (target - prev) / prev * 100
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {receipt.evidence && receipt.evidence.length > 0 && (
                <div className="receipt-section">
                  <div className="receipt-section-title">Bukti Data & Rekam Jejak (Provenance)</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="evidence-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Sumber</th>
                          <th>Endpoint</th>
                          <th>Tanggal Data</th>
                          <th>Waktu Pengambilan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipt.evidence.map((ev) => (
                          <tr key={ev.id}>
                            <td><code>{ev.id}</code></td>
                            <td>{ev.sourceType}</td>
                            <td><code>{ev.endpoint}</code></td>
                            <td>{ev.dataDate}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {new Date(ev.fetchedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {receipt.limitations && receipt.limitations.length > 0 && (
                <div className="receipt-section">
                  <div className="receipt-section-title">Batas Pemeriksaan & Catatan</div>
                  <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {receipt.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-blue)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    textDecoration: 'underline',
                  }}
                  onClick={() => setShowRawJson(!showRawJson)}
                >
                  {showRawJson ? '▲ Sembunyikan Payload JSON' : '▼ Tampilkan Payload JSON Receipt'}
                </button>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Aturan: {receipt.rulesVersion}
                </span>
              </div>

              {showRawJson && (
                <div style={{ marginTop: '12px' }}>
                  <pre className="code-block">{JSON.stringify(receipt, null, 2)}</pre>
                </div>
              )}

              <div style={{ marginTop: '18px', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                {receipt.disclaimer}
              </div>
            </div>
          </section>
        )}

        <section className="grid">
          <div className="info-box">
            <h3>1. Ekstraksi Deterministik</h3>
            <p>Mengekstrak simbol IDX dan tanggal eksplisit tanpa menebak hari bursa secara diam-diam.</p>
          </div>
          <div className="info-box">
            <h3>2. Sectors API Terautentikasi</h3>
            <p>Mengambil data harga harian dari endpoint <code>/daily/{'{symbol}'}/</code> hanya di sisi server.</p>
          </div>
          <div className="info-box">
            <h3>3. Receipt & Bukti Nyata</h3>
            <p>Menghitung persentase perubahan harga dengan toleransi terstandarisasi serta rekam jejak lengkap.</p>
          </div>
        </section>

        <div className="notice-banner">
          <div style={{ fontSize: '1.25rem' }}>ℹ️</div>
          <div className="notice-text">
            <strong>Fokus Rilis P0:</strong> Alur verifikasi klaim perubahan harga harian saham IDX dengan data Sectors API. Fitur artikel berita (P1) dan rasio keuangan (P1) akan diimplementasikan setelah ketersediaan cakupan data divalidasi.
          </div>
        </div>
      </main>

      <footer className="footer container">
        <p>© 2026 BursaBukti — Track 01 Sectors Hackathon. Alat informasi & analisis data; bukan saran investasi.</p>
      </footer>
    </div>
  );
}
