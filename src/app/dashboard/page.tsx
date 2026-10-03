'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [claimText, setClaimText] = useState('');
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);

  const handleVerify = async () => {
    if (!claimText.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setIsAnalyzed(false);
    setReceipt(null);
    
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claimText })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message || 'Gagal memproses klaim');
      } else {
        setReceipt(data);
        setIsAnalyzed(true);
        sessionStorage.setItem('currentReceipt', JSON.stringify(data));
      }
    } catch (err) {
      setErrorMsg('Gagal menghubungi server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dash-layout">
      <div className="dash-container">
        {/* Header */}
        <div className="dash-header">
          <div className="logo-container" style={{ margin: 0 }}>
            <div className="logo-icon" style={{ background: 'transparent', padding: 0, display: 'flex' }}>
              <img src="/logo.png" alt="BursaBukti Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            </div>
            <div className="logo-text-col" style={{ textAlign: 'left' }}>
              <div className="logo" style={{ fontSize: '1.2rem' }}>
                <span className="logo-span-2" style={{ color: '#C52839' }}>Bursa</span><span className="logo-span-1" style={{ color: '#fff' }}>Bukti</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                ANALISIS PASAR AI
              </div>
            </div>
          </div>
          
          <div className="dash-header-actions">
            <Link href="/" className="dash-btn-primary" style={{ textDecoration: 'none' }}>
              Kembali →
            </Link>
          </div>
        </div>

        {/* Body */}
        <div className="dash-body">
          <div className="dash-title-sub">VERIFIKASI INFORMASI PASAR MODAL</div>
          <h1 className="dash-title">Uji Kebenaran Informasi Saham & Berita Pasar Modal</h1>
          <p className="dash-desc">
            Ekstrak klaim, identifikasi emiten, lalu bandingkan dengan data resmi BEI melalui Sectors API secara transparan dan dapat diaudit.
          </p>

          <div className="dash-grid">
            {/* Left Column */}
            <div className="dash-input-box">
              <div className="dash-tabs">
                <div 
                  className={`dash-tab ${activeTab === 'text' ? 'active' : ''}`}
                  onClick={() => setActiveTab('text')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  Teks Berita / Rumor
                </div>
                <div 
                  className={`dash-tab ${activeTab === 'image' ? 'active' : ''}`}
                  onClick={() => setActiveTab('image')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  Upload Gambar / Screenshot
                </div>
              </div>
              
              <div className="dash-textarea-wrap">
                {activeTab === 'text' ? (
                  <>
                    <textarea 
                      className="dash-textarea"
                      placeholder="Ketik atau tempel berita di sini... (Contoh: Asing mencatatkan net buy saham BBRI sebesar Rp250 miliar pada perdagangan 23 September 2026.)"
                      value={claimText}
                      onChange={(e) => setClaimText(e.target.value)}
                    />
                    <div className="dash-textarea-footer">
                      <span>Tempel berita, rumor, atau pernyataan yang ingin diuji</span>
                      <span>{claimText.length} / 3.000</span>
                    </div>
                  </>
                ) : (
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '40px', color: 'var(--text-muted)' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '16px' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <div style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '8px' }}>Pilih atau tarik gambar ke sini</div>
                    <div style={{ fontSize: '0.85rem' }}>Mendukung format JPG, PNG, atau WEBP hingga 5MB.</div>
                  </div>
                )}
              </div>
              
              <div className="dash-input-actions">
                <button 
                  className="dash-btn-primary" 
                  onClick={handleVerify}
                  disabled={(activeTab === 'text' && !claimText.trim()) || activeTab === 'image' || loading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '0.9rem', opacity: ((activeTab === 'text' && !claimText.trim()) || activeTab === 'image' || loading) ? 0.5 : 1, cursor: ((activeTab === 'text' && !claimText.trim()) || activeTab === 'image' || loading) ? 'not-allowed' : 'pointer' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  {loading ? 'Menganalisis...' : 'Analisis Klaim'}
                </button>
              </div>
            </div>

            {/* Right Column */}
            <div className="dash-result-box">
              <div className="result-header-title">Ekstraksi & Diagnosis Awal</div>
              <div className="result-header-sub">Heuristic parser + AI extraction</div>

              {!isAnalyzed ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '16px', opacity: 0.5, margin: '0 auto 16px' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  {loading ? (
                    <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Menganalisis Klaim...</div>
                  ) : errorMsg ? (
                    <div style={{ fontSize: '1rem', color: '#fb7185' }}>{errorMsg}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Menunggu Input Klaim</div>
                      <div style={{ fontSize: '0.85rem' }}>Silakan masukkan teks rumor atau pernyataan, lalu klik "Analisis Klaim" untuk melihat hasil ekstraksi otomatis.</div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="result-card">
                    <div className="result-card-badge">01</div>
                    <div className="result-card-title">Entitas & Emiten</div>
                    
                    <div className="result-item">
                      <div className="result-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></div>
                      <div>
                        <div className="result-label">KODE SAHAM</div>
                        <div className="result-value">{receipt?.interpreted?.symbol || 'Tidak dikenali'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="result-card">
                    <div className="result-card-badge">02</div>
                    <div className="result-card-title">Inti Klaim</div>
                    <div className="result-item">
                      <div className="result-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></div>
                      <div>
                        <div className="result-label">KATEGORI</div>
                        <div className="result-value">{receipt?.interpreted?.category || '-'}</div>
                      </div>
                    </div>
                    {receipt?.interpreted?.statedValue != null && (
                      <div className="result-item">
                        <div className="result-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
                        <div>
                          <div className="result-label">NILAI</div>
                          <div className="result-value">{receipt?.interpreted?.statedValue} {receipt?.interpreted?.unit}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="result-card">
                    <div className="result-card-badge">03</div>
                    <div className="result-card-title">Kesiapan Audit</div>
                    <div className="result-item">
                      <div className="result-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                      <div>
                        <div className="result-label">TANGGAL</div>
                        <div className="result-value">{receipt?.interpreted?.date || 'Tidak disebut'}</div>
                      </div>
                    </div>
                    <div className="result-item">
                      <div className="result-icon" style={{ color: '#34D399', background: 'rgba(52, 211, 153, 0.1)' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                      <div>
                        <div className="result-label">STATUS</div>
                        <div className="result-value success">Siap diverifikasi terhadap data resmi BEI / Sectors API</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="dash-bottom-bar" style={{ opacity: isAnalyzed ? 1 : 0.4, pointerEvents: isAnalyzed ? 'auto' : 'none', transition: 'all 0.3s' }}>
          <div className="bottom-bar-left">
            <div className="bottom-bar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div>
              <div className="bottom-bar-title">Langkah Berikutnya: Audit Data Resmi</div>
              <div className="bottom-bar-desc">Pencocokan deterministik, formula transparan, dan bukti siap ekspor.</div>
            </div>
          </div>
          <div className="bottom-bar-actions">
            <button className="dash-btn-ghost" onClick={() => setIsAnalyzed(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit Input
            </button>
            <Link href="/receipt" className="dash-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Verifikasi dengan Data Resmi Sectors API
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
