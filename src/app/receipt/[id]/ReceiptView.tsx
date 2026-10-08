'use client';

import { useState } from 'react';
import Link from 'next/link';
import { VerificationReceipt } from '@/lib/verification/types';

interface ReceiptViewProps {
  receipt: VerificationReceipt;
}

export function ReceiptView({ receipt }: ReceiptViewProps) {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);

  async function handleCopyLink() {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  function getVerdictDisplay(status: string) {
    switch (status) {
      case 'supported':
        return {
          title: 'TERBUKTI DIDUKUNG DATA (VALID)',
          subtitle: 'Klaim terkonfirmasi sesuai dengan catatan resmi bursa atau pemberitaan media terverifikasi.',
          icon: '✓',
          color: '#34d399',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.35)',
        };
      case 'contradicted':
        return {
          title: 'BERTENTANGAN DENGAN DATA (ANOMALI)',
          subtitle: 'Klaim bertentangan atau berbeda signifikan dengan data resmi penutupan harga atau arsip bursa.',
          icon: '✕',
          color: '#fb7185',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.35)',
        };
      case 'insufficient_evidence':
        return {
          title: 'BUKTI TIDAK CUKUP / PREDIKSI MASA DEPAN',
          subtitle: 'Klaim berupa proyeksi/prediksi masa depan yang belum terjadi, atau parameter belum lengkap untuk dibuktikan secara historis.',
          icon: '⚠',
          color: '#fbbf24',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.35)',
        };
      case 'failed':
      default:
        return {
          title: 'GAGAL MEMERIKSA LAYANAN',
          subtitle: 'Terjadi kendala saat menghubungi layanan data resmi bursa.',
          icon: '!',
          color: '#9ca3af',
          bg: 'rgba(156, 163, 175, 0.12)',
          border: 'rgba(156, 163, 175, 0.35)',
        };
    }
  }

  const verdict = getVerdictDisplay(receipt.status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Bar Aksi Utama (Salin Link, Download PDF, Verifikasi Lagi) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {receipt.storageStatus === 'saved' ? (
            <span style={{
              fontSize: '0.75rem',
              background: 'rgba(52, 211, 153, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(52, 211, 153, 0.25)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontWeight: 600,
            }}>
              🔒 Receipt Tersimpan
            </span>
          ) : (
            <span style={{
              fontSize: '0.75rem',
              background: 'rgba(234, 179, 8, 0.12)',
              color: '#fde047',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: '6px',
              padding: '3px 8px',
            }}>
              ⚠️ Sesi Sementara
            </span>
          )}
          <span style={{
            fontSize: '0.75rem',
            background: 'rgba(255, 255, 255, 0.06)',
            color: 'var(--text-secondary)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '6px',
            padding: '3px 8px',
          }}>
            ⚖️ Audit Deterministik
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="dash-btn-ghost"
            onClick={handleCopyLink}
            style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {copied ? '✓ Link Tersalin!' : '📋 Salin Link'}
          </button>
          <a
            href={`/api/receipt/${receipt.receiptId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            download={`Pemeriksaan-Klaim-BursaBukti-${receipt.receiptId.slice(0, 8)}.pdf`}
            className="dash-btn-primary"
            style={{
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            📄 Download PDF
          </a>
          <Link
            href="/dashboard"
            className="dash-btn-ghost"
            style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
          >
            🔍 Verifikasi Lagi
          </Link>
        </div>
      </div>

      {/* 2. Banner Status Besar & Jelas */}
      <div style={{
        background: verdict.bg,
        border: `1.5px solid ${verdict.border}`,
        borderRadius: '14px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.3)',
          border: `2px solid ${verdict.color}`,
          color: verdict.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.6rem',
          fontWeight: 800,
          flexShrink: 0,
        }}>
          {verdict.icon}
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            STATUS VERIFIKASI RESMI
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: verdict.color, marginTop: '2px', lineHeight: 1.3 }}>
            {verdict.title}
          </div>
          <div style={{ fontSize: '0.88rem', color: '#e4e4e7', marginTop: '4px', lineHeight: 1.5 }}>
            {verdict.subtitle}
          </div>
        </div>
      </div>

      {/* 3. Kotak Teks Klaim */}
      <div style={{
        background: '#18191c',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: '4px solid var(--accent-red)',
        borderRadius: '8px',
        padding: '20px 24px',
      }}>
        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
          PERNYATAAN / KLAIM YANG DIUJI
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff', lineHeight: 1.6 }}>
          &ldquo;{receipt.claim}&rdquo;
        </div>
        {receipt.verifiedAt && (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Waktu Verifikasi: {new Date(receipt.verifiedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
          </div>
        )}
      </div>

      {/* 4. Alasan & Penjelasan dalam Bahasa Sederhana */}
      <div style={{
        background: '#18191c',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
          Hasil Pemeriksaan & Penjelasan Data
        </div>
        <div style={{ fontSize: '0.95rem', color: '#f4f4f5', lineHeight: 1.6 }}>
          {receipt.reason}
        </div>
      </div>

      {/* 5. Rincian Perhitungan Deterministik (Jika Tersedia) */}
      {receipt.calculation && (
        <div style={{
          background: '#18191c',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
            Rincian Perhitungan Persentase Harga (Deterministik)
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}>
            <div style={{ background: '#121316', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Penutupan Sebelumnya (Prev)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                Rp {receipt.calculation.previous.toLocaleString('id-ID')}
              </div>
            </div>

            <div style={{ background: '#121316', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Penutupan Target (Current)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                Rp {receipt.calculation.current.toLocaleString('id-ID')}
              </div>
            </div>

            <div style={{ background: '#121316', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Perubahan Nyata
              </div>
              <div style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: receipt.calculation.resultPercent >= 0 ? '#34d399' : '#fb7185',
                marginTop: '4px',
              }}>
                {receipt.calculation.resultPercent >= 0 ? '+' : ''}
                {receipt.calculation.resultPercent.toFixed(2).replace('.', ',')}%
              </div>
            </div>

            <div style={{ background: '#121316', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Formula Audit
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#93c5fd', marginTop: '6px' }}>
                (current - prev) / prev * 100
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Bukti Data & Rekam Jejak (Provenance Snapshot) */}
      {receipt.evidence && receipt.evidence.length > 0 && (
        <div style={{
          background: '#18191c',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
            Bukti Data Resmi & Rekam Jejak (Sectors API Provenance)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#121316', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>ID Bukti</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Sumber Data</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Endpoint API</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Tanggal Data</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Tautan Sumber</th>
                  <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Waktu Akses</th>
                </tr>
              </thead>
              <tbody>
                {receipt.evidence.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#93c5fd' }}>{ev.id}</td>
                    <td style={{ padding: '14px', color: '#fff' }}>{ev.sourceType}</td>
                    <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ev.endpoint}</td>
                    <td style={{ padding: '14px', color: '#fff' }}>{ev.dataDate || '-'}</td>
                    <td style={{ padding: '14px' }}>
                      {ev.sourceType === 'sectors_api' ? (
                        <a
                          href={ev.publicUrl || 'https://sectors.app/'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#22d3ee',
                            textDecoration: 'underline',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          Buka Sectors ↗
                        </a>
                      ) : ev.publicUrl ? (
                        <a
                          href={ev.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#22d3ee',
                            textDecoration: 'underline',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          Buka Artikel Asli ↗
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Data API Langsung</span>
                      )}
                    </td>
                    <td style={{ padding: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(ev.fetchedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Batasan & Catatan Snapshot */}
      {receipt.limitations && receipt.limitations.length > 0 && (
        <div style={{
          background: '#18191c',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '24px',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#fff', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
            Batasan Pemeriksaan & Ruang Lingkup Data
          </div>
          <ul style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
            {receipt.limitations.map((lim, i) => (
              <li key={i} style={{ marginBottom: '6px' }}>{lim}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 8. Detail Teknis & Transparansi Ekstraksi AI (Collapsible) */}
      <div style={{
        background: '#18191c',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <button
          type="button"
          onClick={() => setShowTechDetails(!showTechDetails)}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'none',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚙️ Detail Teknis & Transparansi Ekstraksi
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              ({receipt.extractorSource === 'ai_agent' ? 'Ekstraksi AI' : 'Heuristik Rule-based'})
            </span>
          </div>
          <span style={{ color: '#22d3ee', fontSize: '0.82rem' }}>
            {showTechDetails ? '▲ Tutup Detail' : '▼ Buka Detail'}
          </span>
        </button>

        {showTechDetails && (
          <div style={{
            padding: '0 24px 20px 24px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '14px' }}>
              <div style={{ background: '#121316', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Metode Ekstraksi</div>
                <div style={{ color: '#fff', fontWeight: 600, marginTop: '2px' }}>
                  {receipt.extractorSource === 'ai_agent' ? 'AI Agent Structured Parser' : 'Fallback Heuristik'}
                </div>
              </div>
              <div style={{ background: '#121316', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Model AI yang Digunakan</div>
                <div style={{ color: '#93c5fd', fontWeight: 600, marginTop: '2px' }}>
                  {receipt.modelUsed || '-'}
                </div>
              </div>
              <div style={{ background: '#121316', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Model AI yang Diminta</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {receipt.modelRequested || '-'}
                </div>
              </div>
              <div style={{ background: '#121316', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Versi Aturan Audit</div>
                <div style={{ color: '#34d399', fontWeight: 600, marginTop: '2px' }}>
                  {receipt.rulesVersion || 'v1.0'}
                </div>
              </div>
            </div>

            {receipt.fallbackReason && (
              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: '6px',
                padding: '10px 14px',
                color: '#fde047',
                fontSize: '0.78rem',
              }}>
                ℹ️ <strong>Catatan Pengalihan/Failover:</strong> {receipt.fallbackReason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 9. Toggle Payload JSON Snapshot & Disclaimer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 4px',
      }}>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#22d3ee',
            cursor: 'pointer',
            fontSize: '0.82rem',
            textDecoration: 'underline',
          }}
          onClick={() => setShowRawJson(!showRawJson)}
        >
          {showRawJson ? '▲ Sembunyikan Payload JSON Snapshot' : '▼ Tampilkan Payload JSON Snapshot'}
        </button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Dokumen ID: {receipt.receiptId}
        </span>
      </div>

      {showRawJson && (
        <div style={{ marginTop: '4px' }}>
          <pre style={{
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '16px',
            color: '#a1a1aa',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            overflowX: 'auto',
          }}>
            {JSON.stringify(receipt, null, 2)}
          </pre>
        </div>
      )}

      <div style={{
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: '8px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        lineHeight: 1.5,
      }}>
        ⚠️ {receipt.disclaimer}
      </div>
    </div>
  );
}
