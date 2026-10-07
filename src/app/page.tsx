'use client';

import { useState } from 'react';
import Link from 'next/link';

// ... Keep other components, just updating Hero and Header for now to match screenshot ...

export default function HomePage() {
  const [copiedLink, setCopiedLink] = useState(false);

  // ... (keep the same state handling logic as before) ...
  const sampleClaims = [
    'BBRI naik 0,31% pada 23 September 2026',
    'Saham TLKM turun 1,5% pada 23 September 2026',
    'Media memberitakan BBCA meluncurkan inovasi paylater digital',
    'BBRI net buy asing 250M...',
  ];

  async function handleCopyShareLink(urlPath: string) {
    try {
      const fullUrl = `${window.location.origin}${urlPath}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      setCopiedLink(false);
    }
  }



  return (
    <div>
      {/* Header exactly matching screenshot */}
      <header className="header">
        <div className="container header-content">
          <div className="logo-container">
            <div className="logo-icon" style={{ display: 'flex' }}>
              <img src="/logo.png" alt="BursaBukti Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            </div>
            <div className="logo-text-col">
              <div className="logo">
                <span className="logo-span-2">Bursa</span><span className="logo-span-1">Bukti</span>
              </div>
              <div className="logo-subtitle">ANALISIS PASAR AI</div>
            </div>
          </div>
          
          <nav className="header-nav">
            <a href="#workflow">Cara Kerja</a>
            <a href="#market">Informasi Pasar</a>
          </nav>

          <div className="header-actions">
            <Link href="/dashboard" className="btn-outline-sm" style={{ textDecoration: 'none' }}>Masuk Dashboard</Link>
            <Link href="/dashboard" className="btn-primary-sm" style={{ padding: '8px 16px', fontSize: '0.85rem', textDecoration: 'none' }}>Mulai Verifikasi</Link>
          </div>
        </div>
      </header>

      {/* Hero exactly matching screenshot */}
      <section className="hero">
        <div className="hero-svg-bg">
          <svg width="100%" height="100%" viewBox="0 0 1152 728" fill="none" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <g opacity="0.3">
              <path d="M92.16 249.429V582.457" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M84.096 332.571H100.224V478.271H84.096V332.571Z" fill="#31CF20" fillOpacity="0.3"/>
              <path d="M84.096 332.571H100.224V332.571V478.271V478.271H84.096V478.271V332.571V332.571V332.571" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M207.36 187.071V624.171" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M199.296 270.214H215.424V499.171H199.296V270.214Z" fill="#31CF20" fillOpacity="0.3"/>
              <path d="M199.296 270.214H215.424V270.214V499.171V499.171H199.296V499.171V270.214V270.214V270.214" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M345.6 291V603.214" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M337.536 353.357H353.664V478.243H337.536V353.357Z" fill="#31CF20" fillOpacity="0.3"/>
              <path d="M337.536 353.357H353.664V353.357V478.243V478.243H337.536V478.243V353.357V353.357V353.357" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M829.44 166.286V561.757" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M821.376 249.429H837.504V436.757H821.376V249.429Z" fill="#31CF20" fillOpacity="0.3"/>
              <path d="M821.376 249.429H837.504V249.429V436.757V436.757H821.376V436.757V249.429V249.429V249.429" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M967.68 228.643V644.929" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M959.616 311.786H975.744V519.929H959.616V311.786Z" fill="#31CF20" fillOpacity="0.3"/>
              <path d="M959.616 311.786H975.744V311.786V519.929V519.929H959.616V519.929V311.786V311.786V311.786" stroke="#34C759" strokeWidth="2.42507"/>
              <path d="M0 540.725C230.4 665.611 322.56 207.697 552.96 353.397C783.36 499.097 875.52 228.511 1152 457.468" stroke="#34C759" strokeWidth="4.04179" strokeLinecap="round"/>
            </g>
          </svg>
        </div>

        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <div className="hero-badge">
            <span style={{ marginRight: '4px' }}>🛡️</span> VERIFIKASI BERBASIS BUKTI DATA RIIL
          </div>
          <h1 className="hero-title">
            Uji Klaim Saham IDX dengan<br />
            Data Faktual, Bukan Rumor.
          </h1>
          <p className="hero-description">
            Platform verifikasi berbasis AI yang menguji rumor pasar, pergerakan harga, dan
            laporan emiten Bursa Efek Indonesia secara independen & transparan berbasis
            data riil Sectors API.
          </p>

          <div className="hero-actions">
            <Link href="/dashboard" className="btn-primary-lg" style={{ textDecoration: 'none' }}>Mulai Verifikasi Sekarang ↗</Link>
            <a href="#workflow" className="btn-secondary-lg">Tata Cara Verifikasi 📖</a>
          </div>

          <div className="ticker-ribbon">
            <div className="ticker-item">
              <div className="ticker-label">IHSG / IDX COMPOSITE</div>
              <div className="ticker-value">8.142,73</div>
              <div className="ticker-change">+0,46%</div>
            </div>
            <div className="ticker-item">
              <div className="ticker-label">BBRI</div>
              <div className="ticker-value">Rp3.190</div>
              <div className="ticker-change">+0,31%</div>
            </div>
            <div className="ticker-item">
              <div className="ticker-label">STATUS DATA</div>
              <div className="ticker-value" style={{ color: '#E4E4E7' }}>23 SEP 2026</div>
              <div className="ticker-change" style={{ color: '#22D3EE' }}>TERVALIDASI (ILUSTRASI)</div>
            </div>
          </div>
        </div>
      </section>

      {/* The rest of the page remains intact */}
      <section id="workflow" className="workflow-section">
        <div className="container">
          <div className="workflow-header">
            <h2 className="workflow-title">WORKFLOW SYSTEM</h2>
            <p className="workflow-subtitle">
              Verifikasi klaim pasar saham dalam hitungan detik secara terstruktur, objektif, dan teruji secara matematis deterministik.
            </p>
          </div>
          <div className="workflow-grid">
            <div className="workflow-card">
              <div className="workflow-badge badge-01">01</div>
              <div className="step-title">1. Masukkan Klaim</div>
              <div className="step-desc">
                Tempel rumor, pesan dari grup percakapan Telegram/WhatsApp, artikel berita, atau klaim pergerakan saham ke dalam platform.
              </div>
              <div className="workflow-footer">
                Contoh: "BBRI net buy asing 250M..."
              </div>
            </div>
            <div className="workflow-card">
              <div className="workflow-badge badge-02">02</div>
              <div className="step-title">2. Cocokkan dengan Data</div>
              <div className="step-desc">
                Mesin membedah parameter klaim (emiten, tanggal, nilai, persentase) dan membandingkannya secara deterministik dengan data resmi Sectors API.
              </div>
              <div className="workflow-footer">
                Engine: Heuristic Parser + Sectors API
              </div>
            </div>
            <div className="workflow-card">
              <div className="workflow-badge badge-03">03</div>
              <div className="step-title">3. Baca Bukti Audit</div>
              <div className="step-desc">
                Peroleh tanda bukti verifikasi transparan berupa lembar komparasi dengan status validitas yang jelas tanpa interpretasi bias.
              </div>
              <div className="workflow-footer">
                Status: <span style={{ color: '#34D399' }}>VALID / ANOMALI / TIDAK COCOK</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      <section id="market" className="market-section">
        <div className="container">
          <div className="market-header">
            <div>
              <h2 className="market-title">What&apos;s moving the market</h2>
              <p className="market-subtitle">
                Ilustrasi indikator tren indeks, pergerakan sektoral, volume transaksi, dan arus modal pasar (data contoh statis untuk visualisasi antarmuka).
              </p>
            </div>
            <div style={{ padding: '6px 14px', background: 'rgba(52,211,153,0.1)', color: '#34D399', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600, border: '1px solid rgba(52,211,153,0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Data Ilustrasi
            </div>
          </div>
          
          <div className="market-stats-row">
            <div className="market-stat-card">
              <div className="stat-title">IHSG (JCI) — Ilustrasi</div>
              <div className="stat-value">7,812.40</div>
              <div className="stat-change up">↗ +0.55%</div>
            </div>
            <div className="market-stat-card">
              <div className="stat-title">LQ45 — Ilustrasi</div>
              <div className="stat-value">105.15</div>
              <div className="stat-change up">↗ +0.62%</div>
            </div>
            <div className="market-stat-card">
              <div className="stat-title">IDX COMPOSITE — Ilustrasi</div>
              <div className="stat-value">2,410.33</div>
              <div className="stat-change down">↘ -0.11%</div>
            </div>
            <div className="market-stat-card" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div className="stat-title">Market Time:</div>
                <div className="stat-value">10:30 WIB</div>
                <div className="stat-change" style={{ color: '#22D3EE' }}>Sesi I (Ilustrasi)</div>
              </div>
              <div style={{ opacity: 0.3 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
            </div>
          </div>
          
          <div className="market-main-grid">
            <div className="main-col-left">
              <div className="panel">
                <div className="panel-header" style={{ marginBottom: '16px' }}>
                  <div>
                    <div className="panel-title" style={{ marginBottom: '8px' }}>GRAFIK TREN PASAR (ILUSTRASI)</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>IHSG 7,812.40</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-green)' }}>+42.85 (+0.55%)</span>
                    </div>
                  </div>
                  <div className="time-filters">
                    <button className="time-filter active">1D</button>
                    <button className="time-filter">1W</button>
                    <button className="time-filter">1M</button>
                    <button className="time-filter">3M</button>
                    <button className="time-filter">1Y</button>
                    <button className="time-filter">YTD</button>
                  </div>
                </div>

                <div className="chart-stats-grid">
                  <div className="chart-stat-box">
                    <div className="stat-title">HIGH SESI</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>7,834.12</div>
                  </div>
                  <div className="chart-stat-box">
                    <div className="stat-title">LOW SESI</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>7,798.50</div>
                  </div>
                  <div className="chart-stat-box">
                    <div className="stat-title">OPEN</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>7,801.20</div>
                  </div>
                  <div className="chart-stat-box">
                    <div className="stat-title">PREV CLOSE</div>
                    <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>7,769.55</div>
                  </div>
                </div>

                <div className="chart-placeholder-svg">
                  {/* Decorative line chart */}
                  <svg width="100%" height="150" viewBox="0 0 800 150" preserveAspectRatio="none">
                    <path d="M0 120 Q 100 130 200 90 T 400 100 T 600 50 T 800 20" fill="none" stroke="#34D399" strokeWidth="3"/>
                    <path d="M0 120 Q 100 130 200 90 T 400 100 T 600 50 T 800 20 L 800 150 L 0 150 Z" fill="url(#grad)" opacity="0.2"/>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34D399"/>
                        <stop offset="100%" stopColor="transparent"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  {/* Fake volume bars */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', opacity: 0.4, padding: '0 20px', height: '60px' }}>
                    {[...Array(20)].map((_, i) => (
                      <div key={i} style={{ width: '12px', height: `${Math.random() * 100}%`, background: i % 4 === 0 ? '#fb7185' : '#34D399', borderRadius: '2px' }} />
                    ))}
                  </div>
                  <div style={{ position: 'absolute', bottom: '8px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>09:00</span><span>10:00</span><span>11:00</span><span>12:00</span><span>13:30</span><span>14:30</span><span>15:50 (Tutup)</span>
                  </div>
                </div>
              </div>

              <div className="three-boxes-grid">
                <div className="panel" style={{ marginBottom: 0 }}>
                  <div className="panel-title">FOREIGN NET FLOW (ILUSTRASI)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-green)' }}>+Rp 842,5 M</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Net Foreign Buy (Data Contoh)</div>
                </div>
                <div className="panel" style={{ marginBottom: 0 }}>
                  <div className="panel-title">TURNOVER / VOLUME (ILUSTRASI)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Rp 12,38 T</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>18,42 Miliar Lembar Lot (Data Contoh)</div>
                </div>
                <div className="panel" style={{ marginBottom: 0 }}>
                  <div className="panel-title">MARKET BREADTH (ILUSTRASI)</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--accent-green)' }}>284 ▲</span>
                    <span style={{ color: '#fb7185' }}>198 ▼</span>
                    <span style={{ color: 'var(--text-muted)' }}>142 ▬</span>
                  </div>
                  <div className="market-breadth-bar">
                    <div className="m-bar-up"></div>
                    <div className="m-bar-down"></div>
                    <div className="m-bar-flat"></div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Kinerja Sektor Bursa (IDX Sectoral Performance — Ilustrasi)</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Persentase pergerakan 11 sektor IDX (data ilustrasi visual antarmuka)</p>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Update: 10:30 WIB</div>
                </div>
                
                <div className="sector-grid">
                  {[
                    { name: 'IDX Sector Financials', val: '+1.42%', up: true },
                    { name: 'IDX Sector Technology', val: '+2.15%', up: true },
                    { name: 'IDX Sector Infrastructures', val: '+0.85%', up: true },
                    { name: 'IDX Sector Energy', val: '-0.54%', up: false },
                    { name: 'IDX Sector Basic Materials', val: '+0.68%', up: true },
                    { name: 'IDX Sector Consumer Non-Cyclical', val: '+0.32%', up: true },
                    { name: 'IDX Sector Healthcare', val: '-0.28%', up: false },
                    { name: 'IDX Sector Properties & Real Estate', val: '+0.19%', up: true },
                  ].map((s, idx) => (
                    <div className="sector-item" key={idx}>
                      <div className="sector-header">
                        <span>{s.name}</span>
                        <span style={{ color: s.up ? 'var(--accent-green)' : '#fb7185' }}>{s.val}</span>
                      </div>
                      <div className="sector-bar-bg">
                        <div className="sector-bar-fill" style={{ width: s.up ? '70%' : '30%', background: s.up ? 'var(--accent-green)' : '#fb7185' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.05)' }}>
                  <a href="https://sectors.app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
                    Lihat Selengkapnya di Sectors ↗
                  </a>
                </div>
              </div>
            </div>

            <div className="main-col-right">
              <div className="panel">
                <div className="panel-title">MARKET SNAPSHOT (ILUSTRASI)</div>
                <div className="snapshot-list">
                  <div className="snapshot-item">
                    <div>
                      <div className="snapshot-name">IHSG</div>
                      <div className="snapshot-desc">Market Index Indonesia</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="snapshot-val">7,812.40</div>
                      <div className="stat-change up" style={{ justifyContent: 'flex-end' }}>+0.55%</div>
                    </div>
                  </div>
                  <div className="snapshot-item">
                    <div>
                      <div className="snapshot-name">LQ45</div>
                      <div className="snapshot-desc">Liquid 45 Index</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="snapshot-val">105.15</div>
                      <div className="stat-change up" style={{ justifyContent: 'flex-end' }}>+0.62%</div>
                    </div>
                  </div>
                  <div className="snapshot-item">
                    <div>
                      <div className="snapshot-name">IDX30</div>
                      <div className="snapshot-desc">Top 30 Composite</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="snapshot-val">105.15</div>
                      <div className="stat-change up" style={{ justifyContent: 'flex-end' }}>+0.11%</div>
                    </div>
                  </div>
                </div>
                <div className="alert-box-warning">
                  <strong>Pemberitahuan Data:</strong><br/>
                  Seluruh angka pasar pada bagian ini adalah ilustrasi visual antarmuka. Untuk verifikasi klaim faktual, silakan gunakan fitur Verifikasi Klaim BursaBukti yang terhubung langsung ke Sectors API.
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">TOP STOCKS (ILUSTRASI CONTOH)</div>
                <div className="stock-list">
                  {[
                    { ticker: 'BBCA', color: 'blue', val: '382.40', c: '+0.55%', up: true },
                    { ticker: 'BBRI', color: 'blue', val: '105.15', c: '+0.62%', up: true },
                    { ticker: 'BMRI', color: 'blue', val: '53.55', c: '+0.55%', up: true },
                    { ticker: 'BBNI', color: 'orange', val: '259.30', c: '-0.11%', up: false },
                    { ticker: 'ANTM', color: 'green', val: '33.70', c: '-0.07%', up: false },
                  ].map((s, i) => (
                    <div className="stock-item" key={i}>
                      <div className={`stock-logo ${s.color}`}>{s.ticker}</div>
                      <div className="stock-info">
                        <div className="snapshot-name">{s.ticker}</div>
                        <div className="snapshot-desc">Indonesia</div>
                      </div>
                      <svg className="stock-sparkline" viewBox="0 0 40 16" fill="none">
                        <path d={s.up ? "M0 12 L10 8 L20 10 L40 2" : "M0 2 L10 6 L20 4 L40 12"} stroke={s.up ? "#34D399" : "#fb7185"} strokeWidth="1.5" />
                      </svg>
                      <div style={{ textAlign: 'right' }}>
                        <div className="snapshot-val">{s.val}</div>
                        <div className={s.up ? 'stat-change up' : 'stat-change down'} style={{ justifyContent: 'flex-end' }}>{s.c}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            VERIFIKASI PERTAMA ANDA SIAP DIMULAI
          </div>
          <h2 className="cta-title">Jangan biarkan rumor bergerak lebih cepat daripada fakta.</h2>
          <p className="cta-subtitle">
            Uji klaim pasar dalam hitungan detik dan bagikan bukti yang dapat dibaca, diperiksa, dan dipercaya.
          </p>
          <Link href="/dashboard" className="cta-button" style={{ textDecoration: 'none' }}>
            Mulai Verifikasi Gratis <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
          </Link>
        </div>
      </section>

      <footer className="comprehensive-footer">
        <div className="footer-grid">
          <div>
            <div className="logo-container" style={{ marginBottom: '8px' }}>
              <div className="logo-icon" style={{ background: '#fff', border: 'none', padding: '4px', display: 'flex' }}>
                <img src="/logo.png" alt="BursaBukti Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
              </div>
              <div className="logo-text-col" style={{ textAlign: 'left' }}>
                <div className="logo" style={{ fontSize: '1.25rem' }}>
                  <span className="logo-span-2" style={{ color: '#C52839' }}>Bursa</span><span className="logo-span-1" style={{ color: '#fff' }}>Bukti</span>
                </div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '2px', marginBottom: '16px' }}>
              ANALISIS PASAR AI
            </div>
            <p className="footer-desc">
              Platform analisis dan verifikasi informasi pasar modal Indonesia berbasis AI, data riil, dan bukti yang dapat diaudit.
            </p>
            <div className="footer-source">
              Sumber Data: Sectors Financial API &amp; Bursa Efek Indonesia (BEI)
            </div>
          </div>
          
          <div>
            <div className="footer-col-title">PRODUK</div>
            <ul className="footer-links">
              <li><a href="#">Verifikasi Klaim</a></li>
              <li><a href="#">Bukti Audit</a></li>
              <li><a href="#">Metodologi</a></li>
              <li><a href="#">Simulasi Forensik</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">NAVIGASI</div>
            <ul className="footer-links">
              <li><a href="#">Berita Pasar</a></li>
              <li><a href="#">Cara Kerja</a></li>
              <li><a href="#">Status Sistem</a></li>
              <li><a href="#">Dokumentasi API</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">KEBIJAKAN</div>
            <ul className="footer-links">
              <li><a href="#">Privasi Data</a></li>
              <li><a href="#">Ketentuan Layanan</a></li>
              <li><a href="#">Disclaimer Keuangan</a></li>
              <li><a href="#">Kebijakan Audit</a></li>
            </ul>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '64px', paddingTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
           &copy; 2026 BursaBukti &mdash; Track 01 Sectors Hackathon.
        </div>
      </footer>
    </div>
  );
}
