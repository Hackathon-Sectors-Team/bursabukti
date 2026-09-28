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

  async function handleCopyLink() {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback manual copy
      setCopied(false);
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

  const statusInfo = getStatusLabel(receipt.status);

  return (
    <div className="receipt-container" style={{ marginTop: '24px' }}>
      <div className="receipt-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              RECEIPT ID: {receipt.receiptId}
            </span>
            <span style={{
              fontSize: '0.72rem',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '4px',
              padding: '2px 6px',
            }}>
              🔒 Snapshot Tersimpan Permanen
            </span>
            {receipt.extractorSource === 'ai_agent' ? (
              <span style={{
                fontSize: '0.72rem',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#93c5fd',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '4px',
                padding: '2px 6px',
              }}>
                🤖 AI Agent ({receipt.modelUsed || 'Gemini'}{receipt.modelRequested && receipt.modelUsed && receipt.modelRequested !== receipt.modelUsed ? ` • Failover dari ${receipt.modelRequested}` : ''})
              </span>
            ) : (
              <span style={{
                fontSize: '0.72rem',
                background: 'rgba(234, 179, 8, 0.15)',
                color: '#fde047',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '4px',
                padding: '2px 6px',
              }}>
                ⚙️ Fallback Heuristik
              </span>
            )}
          </div>
          <div style={{ fontWeight: 600, fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '4px' }}>
            &ldquo;{receipt.claim}&rdquo;
          </div>
          {receipt.verifiedAt && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Waktu Verifikasi: {new Date(receipt.verifiedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB ({receipt.verifiedAt})
            </div>
          )}
        </div>
        <div>
          <span className={`status-badge ${statusInfo.className}`}>
            <span>{statusInfo.icon}</span>
            <span>{statusInfo.label}</span>
          </span>
        </div>
      </div>

      <div className="receipt-body">
        {/* Tombol Aksi Cepat: Salin Link & Verifikasi Baru */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <button
            type="button"
            className="button-primary"
            onClick={handleCopyLink}
            style={{ fontSize: '0.88rem', padding: '8px 16px' }}
          >
            {copied ? '✓ Tautan Receipt Tersalin!' : '📋 Salin Link Receipt'}
          </button>
          <Link
            href="/"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '0.88rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🔍 Verifikasi Klaim Baru
          </Link>
        </div>

        <div className="receipt-section">
          <div className="receipt-section-title">Hasil Pemeriksaan Snapshot</div>
          <div className="receipt-reason">
            {receipt.reason}
          </div>
        </div>

        {receipt.calculation && (
          <div className="receipt-section">
            <div className="receipt-section-title">Rincian Perhitungan Persentase (Deterministik)</div>
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
            <div className="receipt-section-title">Bukti Data & Rekam Jejak (Provenance Snapshot)</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Sumber</th>
                    <th>Endpoint</th>
                    <th>Tanggal Data</th>
                    <th>Tautan Sumber</th>
                    <th>Waktu Pengambilan</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.evidence.map((ev) => (
                    <tr key={ev.id}>
                      <td><code>{ev.id}</code></td>
                      <td>{ev.sourceType}</td>
                      <td><code>{ev.endpoint}</code></td>
                      <td>{ev.dataDate || '-'}</td>
                      <td>
                        {ev.publicUrl ? (
                          <a
                            href={ev.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--accent-blue)',
                              textDecoration: 'underline',
                              fontSize: '0.85rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            Buka Sumber ↗
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            Data API Langsung
                          </span>
                        )}
                      </td>
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
            <div className="receipt-section-title">Batas Pemeriksaan & Catatan Snapshot</div>
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
            {showRawJson ? '▲ Sembunyikan Payload JSON Snapshot' : '▼ Tampilkan Payload JSON Snapshot'}
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

        <div style={{
          marginTop: '18px',
          padding: '12px 16px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          {receipt.disclaimer}
        </div>
      </div>
    </div>
  );
}
