import Link from 'next/link';

export default function ReceiptPage() {
  return (
    <div className="receipt-page-layout">
      {/* Top Navigation */}
      <nav className="receipt-page-nav">
        <div className="receipt-page-nav-left">
          <div className="logo-container" style={{ margin: 0 }}>
            <div className="logo-icon" style={{ background: 'transparent', padding: 0, display: 'flex' }}>
              <img src="/logo.png" alt="BursaBukti Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            </div>
            <div className="logo-text-col" style={{ textAlign: 'left' }}>
              <div className="logo" style={{ fontSize: '1rem' }}>
                <span className="logo-span-2" style={{ color: '#C52839' }}>Bursa</span><span className="logo-span-1" style={{ color: '#fff' }}>Bukti</span>
              </div>
            </div>
          </div>
          
          <div className="receipt-page-breadcrumbs">
            / &nbsp; Dashboard &nbsp; / &nbsp; Verifikasi Klaim &nbsp; / &nbsp; <span>REF-[...]</span>
          </div>
        </div>
        
        <div className="receipt-page-nav-actions">
          <div className="dash-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', fontSize: '0.75rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Cari ticker atau emiten <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px', fontSize: '0.6rem' }}>⌘K</span>
          </div>
          <Link href="/dashboard" className="dash-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Kembali
          </Link>
        </div>
      </nav>

      {/* Main Container */}
      <div className="receipt-page-container">
        <div className="receipt-doc-header">
          <div className="receipt-doc-brand">
            <img src="/logo.png" alt="BursaBukti Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            BURSABUKTI OFFICIAL AUDIT RECEIPT
          </div>
          <div className="receipt-doc-ref">DOC REF: <span>REF-[...]</span></div>
        </div>

        <h1 className="receipt-doc-title">Tanda Bukti Verifikasi Klaim Pasar</h1>

        <div className="receipt-meta-grid">
          <div>
            <div className="receipt-meta-label">DITERBITKAN</div>
            <div className="receipt-meta-value">-</div>
          </div>
          <div>
            <div className="receipt-meta-label">TARGET VERIFIKASI</div>
            <div className="receipt-meta-value">-</div>
          </div>
          <div>
            <div className="receipt-meta-label">PASAR</div>
            <div className="receipt-meta-value">Bursa Efek Indonesia • Reguler</div>
          </div>
        </div>

        <div className="receipt-summary-box">
          <div className="receipt-summary-label">RINGKASAN KLAIM YANG DIAUDIT</div>
          <div className="receipt-summary-claim">"..."</div>
          <div className="receipt-summary-method">
            METODE: heuristic parser + AI extraction • <span style={{ marginLeft: '4px' }}>entity confidence -</span>
          </div>
        </div>

        <h2 className="receipt-section-title">KOMPARASI FORENSIK</h2>
        <table className="receipt-table">
          <thead>
            <tr>
              <th>PARAMETER</th>
              <th>KLAIM PENGGUNA</th>
              <th>DATA RESMI SECTORS API</th>
              <th style={{ textAlign: 'right' }}>SELISIH / STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Simbol saham</td>
              <td>-</td>
              <td>-</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
            <tr>
              <td>Tanggal perdagangan</td>
              <td>-</td>
              <td>-</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
            <tr>
              <td>Harga sebelumnya</td>
              <td>-</td>
              <td>-</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
            <tr>
              <td>Harga penutupan</td>
              <td>-</td>
              <td>-</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
            <tr>
              <td>Persentase perubahan</td>
              <td>-</td>
              <td style={{ color: '#34D399' }}>-</td>
              <td style={{ textAlign: 'right' }}>-</td>
            </tr>
          </tbody>
        </table>



        <h2 className="receipt-section-title">PROVENANCE & INTEGRITAS</h2>
        <div className="receipt-prov-grid">
          <div className="receipt-prov-card">
            <div className="receipt-prov-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> ENDPOINT</div>
            <div className="receipt-prov-value green">-</div>
          </div>
          <div className="receipt-prov-card">
            <div className="receipt-prov-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg> METODE VALIDASI</div>
            <div className="receipt-prov-value">deterministic math validation & entity verification</div>
          </div>
          <div className="receipt-prov-card">
            <div className="receipt-prov-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> PENYEDIA</div>
            <div className="receipt-prov-value">Sectors Financial API v2</div>
          </div>
          <div className="receipt-prov-card">
            <div className="receipt-prov-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> SIGNATURE SHA-256</div>
            <div className="receipt-prov-value">-</div>
          </div>
          <div className="receipt-prov-card">
            <div className="receipt-prov-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> TIMESTAMP SERVER</div>
            <div className="receipt-prov-value">- <span style={{ color: '#34D399' }}>• HTTP 200 OK</span></div>
          </div>
          <div className="receipt-prov-card">
            <div className="receipt-prov-label"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> KEBIJAKAN AUDIT</div>
            <div className="receipt-prov-value">BB-AUDIT-06 • engine v2.0.4</div>
          </div>
        </div>

        <div className="receipt-disclaimer">
          <div className="receipt-disclaimer-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div className="receipt-disclaimer-content">
            <strong>CATATAN BATASAN & DISCLAIMER</strong>
            Verifikasi terbatas pada parameter, tanggal, dan sumber yang tercantum. Data dapat mengalami koreksi oleh penyedia. Dokumen ini adalah bukti pemeriksaan informasi, bukan rekomendasi investasi, ajakan membeli/menjual efek, atau jaminan kinerja masa depan.
          </div>
        </div>

        <div className="receipt-footer-actions">
          <div className="receipt-qr-area">
            <div className="receipt-qr-placeholder">
              <div className="receipt-qr-dot"></div><div className="receipt-qr-dot"></div>
              <div className="receipt-qr-dot"></div><div className="receipt-qr-dot" style={{ background: 'transparent' }}></div>
            </div>
            <div className="receipt-qr-text">
              PERIKSA KEASLIAN DOKUMEN
              <span>https://api.sectors.app/v2/subsectors/</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/dashboard" className="dash-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              + Verifikasi Klaim Baru
            </Link>
            <button className="dash-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Salin Tautan Bukti
            </button>
            <Link href="/dashboard" className="dash-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              Kembali →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
