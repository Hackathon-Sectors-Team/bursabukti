'use client';

import Link from 'next/link';
import { useState, useRef, ChangeEvent } from 'react';
import type { VerificationReceipt } from '@/lib/verification/types';

interface ImageAttachment {
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  extractedText?: string;
  status: 'idle' | 'extracting' | 'extracted' | 'error';
  errorMessage?: string;
}

export default function Dashboard() {
  const [claimText, setClaimText] = useState('');
  const [attachment, setAttachment] = useState<ImageAttachment | null>(null);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<VerificationReceipt | null>(null);

  // Real Progress Stepper state (0: idle, 1: Membaca klaim/gambar, 2: Mengambil data Sectors, 3: Menghitung & menyimpan receipt)
  const [currentStep, setCurrentStep] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Penanganan Pemilihan File Gambar
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value agar bisa memilih file yang sama jika dihapus lalu dipilih ulang
    e.target.value = '';

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg(`Format file "${file.type || file.name}" tidak didukung. Harap pilih gambar PNG, JPEG, atau WebP.`);
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorMsg(`Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 5 MB.`);
      return;
    }

    setErrorMsg(null);
    setInfoMsg(null);
    const previewUrl = URL.createObjectURL(file);

    const newAttachment: ImageAttachment = {
      file,
      previewUrl,
      name: file.name,
      size: file.size,
      status: 'extracting',
    };
    setAttachment(newAttachment);

    // Tahap 1: Membaca klaim dari gambar
    setCurrentStep(1);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/extract-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const msg = data.error?.message || 'Gagal membaca teks dari gambar.';
        setAttachment((prev) => prev ? { ...prev, status: 'error', errorMessage: msg } : null);
        setErrorMsg(msg);
        setCurrentStep(0);
        return;
      }

      if (data.success && data.extractedText) {
        setAttachment((prev) => prev ? {
          ...prev,
          status: 'extracted',
          extractedText: data.extractedText,
        } : null);
        // Tampilkan teks hasil ekstraksi ke composer agar dapat diperiksa/dikoreksi
        setClaimText(data.extractedText);
        setInfoMsg(data.message || 'Teks klaim berhasil diekstrak dari gambar. Silakan periksa atau sesuaikan sebelum verifikasi.');
      } else {
        const msg = data.message || 'Gambar tidak memuat klaim atau teks pasar modal yang terbaca. Silakan ketik klaim secara manual atau unggah gambar yang lebih jelas.';
        setAttachment((prev) => prev ? { ...prev, status: 'error', errorMessage: msg } : null);
        setErrorMsg(msg);
      }
    } catch {
      const msg = 'Terjadi gangguan jaringan saat mengekstrak teks dari gambar.';
      setAttachment((prev) => prev ? { ...prev, status: 'error', errorMessage: msg } : null);
      setErrorMsg(msg);
    } finally {
      setCurrentStep(0);
    }
  };

  const handleRemoveAttachment = () => {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment(null);
    setErrorMsg(null);
    setInfoMsg(null);
  };

  const handleVerify = async () => {
    const textToVerify = claimText.trim();
    if (!textToVerify) {
      setErrorMsg('Harap masukkan teks klaim atau pilih gambar yang memuat pernyataan saham.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    setIsAnalyzed(false);
    setReceipt(null);

    // Tahap 1: Membaca klaim/gambar selesai
    setCurrentStep(1);

    try {
      // Menuju Tahap 2: Mengambil data Sectors API
      setCurrentStep(2);

      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: textToVerify }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error?.message || 'Gagal memproses verifikasi klaim.');
        setCurrentStep(0);
      } else {
        // Tahap 3: Menghitung & menyimpan receipt selesai
        setCurrentStep(3);
        setReceipt(data);
        setIsAnalyzed(true);
        try {
          sessionStorage.setItem('currentReceipt', JSON.stringify(data));
        } catch {
          // Abaikan jika quota terlampaui
        }
      }
    } catch {
      setErrorMsg('Gagal menghubungi server verifikasi. Periksa koneksi internet Anda.');
      setCurrentStep(0);
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
          title: 'BUKTI TIDAK CUKUP / PREDIKSI MASA DEPAN',
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
            <Link href="/" className="dash-btn-ghost" style={{ textDecoration: 'none' }}>
              ← Beranda
            </Link>
          </div>
        </div>

        {/* Body */}
        <div className="dash-body">
          <div className="dash-title-sub">VERIFIKASI INFORMASI PASAR MODAL</div>
          <h1 className="dash-title">Uji Kebenaran Klaim & Berita Saham IDX</h1>
          <p className="dash-desc">
            Ketik klaim pasar modal atau lampirkan gambar screenshot berita/grafik. Sistem mengekstrak teks, mengambil data resmi BEI via Sectors API, dan menghasilkan bukti verifikasi yang dapat diaudit.
          </p>

          {/* Stepper Progress Bar (Berdasarkan proses nyata yang selesai) */}
          <div style={{
            background: '#141518',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '16px 24px',
            marginBottom: '32px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              {/* Step 1: Membaca klaim/gambar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: (currentStep >= 1 || isAnalyzed) ? (attachment?.status === 'extracting' ? '#22d3ee' : '#C52839') : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: (currentStep === 1 || attachment?.status === 'extracting') ? '0 0 12px rgba(197, 40, 57, 0.6)' : 'none',
                }}>
                  {attachment?.status === 'extracting' ? '🔄' : (currentStep >= 2 || isAnalyzed || (attachment?.status === 'extracted') ? '✓' : '1')}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: (currentStep >= 1 || isAnalyzed) ? '#fff' : 'var(--text-muted)' }}>
                    1. Membaca klaim/gambar
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {attachment?.status === 'extracting' ? 'Membaca gambar via Gemini Vision...' :
                     attachment?.status === 'extracted' ? 'Teks gambar berhasil diekstrak' :
                     claimText.trim() ? 'Klaim siap diverifikasi' : 'Input teks / lampiran'}
                  </div>
                </div>
              </div>

              <div style={{
                flex: 1,
                minWidth: '24px',
                height: '2px',
                background: currentStep >= 2 || isAnalyzed ? '#C52839' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
              }} />

              {/* Step 2: Mengambil data Sectors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isAnalyzed ? '#C52839' : (loading && currentStep === 2 ? '#22d3ee' : 'rgba(255,255,255,0.1)'),
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: (loading && currentStep === 2) ? '0 0 12px rgba(34, 211, 238, 0.6)' : 'none',
                }}>
                  {isAnalyzed ? '✓' : (loading && currentStep === 2 ? '⏳' : '2')}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: (isAnalyzed || (loading && currentStep === 2)) ? '#fff' : 'var(--text-muted)' }}>
                    2. Mengambil data Sectors
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {loading && currentStep === 2 ? 'Mengambil arsip harga/berita BEI...' :
                     isAnalyzed ? 'Data bursa resmi diperoleh' : 'Arsip harga & berita BEI'}
                  </div>
                </div>
              </div>

              <div style={{
                flex: 1,
                minWidth: '24px',
                height: '2px',
                background: isAnalyzed && currentStep >= 3 ? '#34d399' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s ease',
              }} />

              {/* Step 3: Menghitung dan menyimpan receipt */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: (isAnalyzed && currentStep >= 3) ? '#34d399' : 'rgba(255,255,255,0.1)',
                  color: (isAnalyzed && currentStep >= 3) ? '#0a0a0a' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  boxShadow: (isAnalyzed && currentStep >= 3) ? '0 0 12px rgba(52, 211, 153, 0.6)' : 'none',
                }}>
                  {isAnalyzed && currentStep >= 3 ? '✓' : '3'}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: (isAnalyzed && currentStep >= 3) ? '#34d399' : 'var(--text-muted)' }}>
                    3. Menghitung & menyimpan receipt
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {isAnalyzed && currentStep >= 3 ? 'Kalkulasi & snapshot tersimpan' : 'Verifikasi deterministik'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dash-grid">
            {/* Left Column: Chat-like Composer Input */}
            <div className="dash-input-box">
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  Composer Klaim BursaBukti
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Teks + Gambar OCR
                </span>
              </div>

              {/* Area Input & Lampiran */}
              <div className="dash-textarea-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <textarea
                  className="dash-textarea"
                  placeholder="Ketik atau tempel klaim saham di sini, atau klik tombol + untuk melampirkan screenshot berita/grafik..."
                  value={claimText}
                  maxLength={1000}
                  onChange={(e) => setClaimText(e.target.value)}
                  style={{ minHeight: '140px' }}
                />

                {/* Thumbnail Preview Lampiran Gambar */}
                {attachment && (
                  <div style={{
                    background: '#121316',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                      <img
                        src={attachment.previewUrl}
                        alt="Preview"
                        style={{
                          width: '44px',
                          height: '44px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: '#fff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '220px',
                        }}>
                          {attachment.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {(attachment.size / 1024).toFixed(0)} KB •{' '}
                          {attachment.status === 'extracting' ? (
                            <span style={{ color: '#22d3ee' }}>🔄 Membaca teks AI Vision...</span>
                          ) : attachment.status === 'extracted' ? (
                            <span style={{ color: '#34d399' }}>✓ Teks terbaca</span>
                          ) : attachment.status === 'error' ? (
                            <span style={{ color: '#fb7185' }}>✕ Gagal membaca</span>
                          ) : (
                            'Siap'
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      title="Hapus lampiran"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--text-muted)',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Notifikasi Informasi Hasil Ekstraksi */}
                {infoMsg && (
                  <div style={{
                    background: 'rgba(34, 211, 238, 0.08)',
                    border: '1px solid rgba(34, 211, 238, 0.2)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    color: '#22d3ee',
                    lineHeight: 1.4,
                  }}>
                    💡 {infoMsg}
                  </div>
                )}

                {/* Notifikasi Error */}
                {errorMsg && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.78rem',
                    color: '#f87171',
                    lineHeight: 1.4,
                  }}>
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div className="dash-textarea-footer" style={{ marginTop: '4px' }}>
                  <span>Maksimal 1.000 karakter • PNG, JPEG, WebP (maks 5MB)</span>
                  <span style={{ color: claimText.length > 900 ? '#fb7185' : 'var(--text-muted)' }}>
                    {claimText.length} / 1.000
                  </span>
                </div>
              </div>

              {/* Bottom Actions Composer */}
              <div className="dash-input-actions" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Pilih gambar screenshot (PNG, JPEG, WebP)"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    +
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {attachment ? 'Ganti gambar' : 'Lampirkan gambar'}
                  </span>
                </div>

                <button
                  type="button"
                  className="dash-btn-primary"
                  onClick={handleVerify}
                  disabled={!claimText.trim() || loading || attachment?.status === 'extracting'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    fontSize: '0.88rem',
                    opacity: (!claimText.trim() || loading || attachment?.status === 'extracting') ? 0.5 : 1,
                    cursor: (!claimText.trim() || loading || attachment?.status === 'extracting') ? 'not-allowed' : 'pointer',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {loading ? 'Memverifikasi...' : 'Verifikasi'}
                </button>
              </div>
            </div>

            {/* Right Column: Result Box */}
            <div className="dash-result-box">
              <div className="result-header-title">Ekstraksi & Diagnosis Forensik</div>
              <div className="result-header-sub">Pemeriksaan data resmi Sectors API + AI Agent routing</div>

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
                      <div style={{ fontSize: '0.85rem' }}>Ketik klaim atau unggah screenshot, lalu klik tombol &quot;Verifikasi&quot; untuk melihat audit bursa.</div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Verdict Banner */}
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
                        flexShrink: 0,
                      }}>
                        {verdict.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          STATUS VERIFIKASI RESMI
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
          <div className="dash-header-actions" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              className="dash-btn-ghost"
              onClick={() => {
                setIsAnalyzed(false);
                setReceipt(null);
                setAttachment(null);
                setClaimText('');
                setErrorMsg(null);
                setInfoMsg(null);
                setCurrentStep(0);
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
