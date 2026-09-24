export default function HomePage() {
  return (
    <div>
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <span>BursaBukti</span>
            <span className="badge">v0.1.0 (Inisialisasi)</span>
          </div>
          <nav>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
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
            BursaBukti membantu investor ritel menelusuri dasar klaim saham dengan data riil dari Sectors API — transparan, terverifikasi, dan dilengkapi jejak bukti.
          </p>
        </section>

        <section className="card">
          <h2 className="card-title">
            🔍 Uji Klaim Saham
          </h2>
          <textarea
            className="textarea-placeholder"
            placeholder="Contoh: Laba bersih BBCA tahun 2023 meningkat lebih dari 20% dibandingkan tahun sebelumnya..."
            disabled
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              *Formulir input akan diaktifkan setelah spesifikasi alur verifikasi (SRS) selesai.
            </span>
            <button className="button-primary" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
              Verifikasi Klaim (Menunggu SRS)
            </button>
          </div>
        </section>

        <section className="grid">
          <div className="info-box">
            <h3>1. Ekstraksi Pernyataan</h3>
            <p>Memecah klaim kompleks menjadi pernyataan tunggal yang spesifik terhadap simbol emiten, periode, dan metrik keuangan.</p>
          </div>
          <div className="info-box">
            <h3>2. Pengambilan Data Riil</h3>
            <p>Mengambil data resmi emiten melalui Sectors REST API v2 tanpa mengarang atau memanipulasi data historis.</p>
          </div>
          <div className="info-box">
            <h3>3. Receipt Pembuktian</h3>
            <p>Menampilkan hasil perbandingan bukti (Didukung / Bertentangan / Belum Terbukti) lengkap dengan sumber dan batasan analisis.</p>
          </div>
        </section>

        <div className="notice-banner">
          <div style={{ fontSize: '1.25rem' }}>ℹ️</div>
          <div className="notice-text">
            <strong>Status Repositori:</strong> Fondasi proyek Next.js App Router & TypeScript telah disiapkan. Dokumen PRD tersedia di <code>docs/PRD.md</code>. Tahap berikutnya adalah penyusunan dokumen SRS teknis sebelum implementasi endpoint Sectors API dan logika verifikasi.
          </div>
        </div>
      </main>

      <footer className="footer container">
        <p>© 2026 BursaBukti — Track 01 Sectors Hackathon. Alat informasi & analisis data; bukan saran investasi.</p>
      </footer>
    </div>
  );
}
