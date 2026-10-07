'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { VerificationReceipt } from '@/lib/verification/types';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'text' | 'image'>('text');
  const [claimText, setClaimText] = useState('');
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<VerificationReceipt | null>(null);

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
        body: JSON.stringify({ claim: claimText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error?.message || 'Gagal memproses klaim');
      } else {
        setReceipt(data);
        setIsAnalyzed(true);
        sessionStorage.setItem('currentReceipt', JSON.stringify(data));
      }
    } catch {
      setErrorMsg('Gagal menghubungi server verifikasi.');
    } finally {
      setLoading(false);
    }
  };

  function getVerdictStyle(status?: string) {
    switch (status) {
      case 'supported':
        return {
          title: 'TERBUKTI DIDUKUNG DATA (VALID)',
          icon: '✓',
          color: '#34d399',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
        };
      case 'contradicted':
        return {
          title: 'BERTENTANGAN DENGAN DATA (ANOMALI)',
          icon: '✕',
          color: '#fb7185',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.3)',
        };
      case 'insufficient_evidence':
        return {
          title: 'BUKTI TIDAK CUKUP / PERLU KLARIFIKASI',
          icon: '⚠',
          color: '#fbbf24',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
        };
      case 'failed':
      default:
        return {
          title: 'GAGAL MEMERIKSA LAYANAN',
          icon: '!',
          color: '#9ca3af',
          bg: 'rgba(156, 163, 175, 0.12)',
          border: 'rgba(156, 163, 175, 0.3)',
        };
    }
  }

  const verdict = receipt ? getVerdictStyle(receipt.status) : null;

  // URL receipt tujuan: gunakan shareableUrl (/receipt/[id]) jika saved
  const receiptTargetUrl = (receipt?.storageStatus === 'saved' && receipt.shareableUrl)
    ? receipt.shareableUrl
    : '/receipt';

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
                <span className="logo-span-2" style={{ color: '#C52839' }}>Bursa</span>
                <span className="logo-span-1" style={{ color: '#fff' }}>Bukti</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                ANALISIS PASAR AI
              </div>
            </div>
          </div>

          <div className="dash-header-actions">
            <Link href="/" className="dash-btn-primary" style={{ textDecoration: 'none' }}>
              Kembali ke Beranda →
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
            {/* Left Column: Input Box */}
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
                  Upload Gambar
                  <span style={{
                    fontSize: '0.65rem',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    marginLeft: '6px',
                  }}>
                    Belum Tersedia
                  </span>
                </div>
              </div>

              <div className="dash-textarea-wrap">
                {activeTab === 'text' ? (
                  <>
                    <textarea
                      className="dash-textarea"
                      placeholder="Ketik atau tempel berita di sini... (Contoh: Saham BBRI naik 0,31% pada 23 September 2026 atau Media memberitakan BBCA meluncurkan inovasi paylater digital.)"
                      value={claimText}
                      maxLength={1000}
                      onChange={(e) => setClaimText(e.target.value)}
                    />
                    <div className="dash-textarea-footer">
                      <span>Maksimal 1.000 karakter (sesuai spesifikasi PRD)</span>
                      <span style={{ color: claimText.length > 900 ? '#fb7185' : 'var(--text-muted)' }}>
                        {claimText.length} / 1.000
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📷</div>
                    <div style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 600, marginBottom: '8px' }}>
                      Fitur Unggah Gambar Belum Tersedia
                    </div>
                    <div style={{ fontSize: '0.82rem', maxWidth: '420px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      Sesuai batasan ruang lingkup PRD MVP BursaBukti, verifikasi berfokus penuh pada analisis teks klaim langsung. Fitur OCR dan analisis screenshot gambar akan hadir pada pembaruan mendatang.
                    </div>
                    <button
                      type="button"
                      className="dash-btn-ghost"
                      onClick={() => setActiveTab('text')}
                      style={{ marginTop: '16px', fontSize: '0.8rem' }}
                    >
                      ← Kembali ke Input Teks
                    </button>
                  </div>
                )}
              </div>

              <div className="dash-input-actions">
                <button
                  className="dash-btn-primary"
                  onClick={handleVerify}
                  disabled={(activeTab === 'text' && !claimText.trim()) || activeTab === 'image' || loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    fontSize: '0.9rem',
                    opacity: ((activeTab === 'text' && !claimText.trim()) || activeTab === 'image' || loading) ? 0.5 : 1,
                    cursor: ((activeTab === 'text' && !claimText.trim()) || activeTab === 'image' || loading) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  {loading ? 'Memverifikasi Data...' : 'Verifikasi Klaim'}
                </button>
              </div>
            </div>

            {/* Right Column: Result Box */}
            <div className="dash-result-box">
              <div className="result-header-title">Ekstraksi & Diagnosis Forensik</div>
              <div className="result-header-sub">AI Agent routing + Sectors API deterministic check</div>

              {!isAnalyzed || !receipt ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: '16px', opacity: 0.5, margin: '0 auto 16px' }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  {loading ? (
                    <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                      Mengekstrak klaim & mencocokkan dengan data Sectors API...
                    </div>
                  ) : errorMsg ? (
                    <div style={{ fontSize: '1rem', color: '#fb7185' }}>{errorMsg}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Menunggu Input Klaim</div>
                      <div style={{ fontSize: '0.85rem' }}>Silakan masukkan teks rumor atau pernyataan saham, lalu klik &quot;Verifikasi Klaim&quot; untuk melihat hasil audit resmi.</div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Actual Verdict Banner */}
                  {verdict && (
                    <div style={{
                      background: verdict.bg,
                      border: `1px solid ${verdict.border}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: verdict.color,
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {verdict.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          VERDICT HASIL AUDIT
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: verdict.color }}>
                          {verdict.title}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="result-card">
                    <div className="result-card-badge">01</div>
                    <div className="result-card-title">Entitas & Parameter Klaim</div>

                    <div className="result-item">
                      <div className="result-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></div>
                      <div>
                        <div className="result-label">KODE SAHAM / EMITEN</div>
                        <div className="result-value">{receipt.interpreted?.symbol || 'Tidak spesifik'}</div>
                      </div>
                    </div>

                    <div className="result-item">
                      <div className="result-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg></div>
                      <div>
                        <div className="result-label">KATEGORI KLAIM</div>
                        <div className="result-value" style={{ textTransform: 'capitalize' }}>
                          {receipt.interpreted?.category === 'price_change' ? 'Pergerakan Harga Saham' :
                           receipt.interpreted?.category === 'news_mention' ? 'Pemberitaan Media' :
                           receipt.interpreted?.category === 'financial_metric' ? 'Laporan Keuangan' :
                           receipt.interpreted?.category === 'unsupported' ? 'Di Luar Cakupan MVP' :
                           receipt.interpreted?.category || '-'}
                        </div>
                      </div>
                    </div>

                    {receipt.interpreted?.date && (
                      <div className="result-item">
                        <div className="result-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>
                        <div>
                          <div className="result-label">TANGGAL TARGET</div>
                          <div className="result-value">{receipt.interpreted.date}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="result-card">
                    <div className="result-card-badge">02</div>
                    <div className="result-card-title">Alasan & Evaluasi Data</div>
                    <div style={{ fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5, padding: '8px 0' }}>
                      {receipt.reason}
                    </div>

                    {receipt.calculation && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Prev Close: </span>
                          <strong style={{ color: '#fff' }}>{receipt.calculation.previous.toLocaleString('id-ID')}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Target Close: </span>
                          <strong style={{ color: '#fff' }}>{receipt.calculation.current.toLocaleString('id-ID')}</strong>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Perubahan Nyata: </span>
                          <strong style={{ color: receipt.calculation.resultPercent >= 0 ? '#34d399' : '#fb7185' }}>
                            {receipt.calculation.resultPercent >= 0 ? '+' : ''}
                            {receipt.calculation.resultPercent.toFixed(2)}%
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="result-card">
                    <div className="result-card-badge">03</div>
                    <div className="result-card-title">Integritas Snapshot</div>
                    <div className="result-item">
                      <div className="result-icon" style={{ color: '#34D399', background: 'rgba(52, 211, 153, 0.1)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <div>
                        <div className="result-label">STATUS PENYIMPANAN</div>
                        <div className="result-value" style={{ color: receipt.storageStatus === 'saved' ? '#34d399' : '#fde047' }}>
                          {receipt.storageStatus === 'saved' ? '🔒 Tersimpan Permanen di Database' : '⚠️ Sesi Lokal'}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Action bar after verification */}
        <div className="dash-bottom-bar" style={{ opacity: isAnalyzed ? 1 : 0.4, pointerEvents: isAnalyzed ? 'auto' : 'none', transition: 'all 0.3s' }}>
          <div className="bottom-bar-left">
            <div className="bottom-bar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            <div>
              <div className="bottom-bar-title">
                {receipt?.storageStatus === 'saved' ? 'Tanda Bukti Verifikasi Resmi Tersedia' : 'Verifikasi Selesai'}
              </div>
              <div className="bottom-bar-desc">
                {receipt?.receiptId ? `DOC REF: ${receipt.receiptId} • Snapshot data immutable` : 'Formula transparan & data siap dibagikan.'}
              </div>
            </div>
          </div>
          <div className="bottom-bar-actions">
            <button
              className="dash-btn-ghost"
              onClick={() => {
                setIsAnalyzed(false);
                setReceipt(null);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Uji Klaim Baru
            </button>
            {receipt?.receiptId && (
              <a
                href={`/api/receipt/${receipt.receiptId}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="dash-btn-ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                📄 Download PDF
              </a>
            )}
            <Link
              href={receiptTargetUrl}
              className="dash-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Lihat Receipt ↗
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
