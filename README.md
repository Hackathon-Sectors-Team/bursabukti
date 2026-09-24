# BursaBukti

> **Asisten Verifikasi Klaim Pasar Modal Indonesia**  
> Proyek untuk kompetisi **Sectors Hackathon 2026** (Track 01 — AI Agents & Assistants).

---

## 🎯 Tujuan Proyek

**BursaBukti** dirancang untuk membantu investor ritel memverifikasi klaim saham atau emiten yang beredar di media sosial atau komunitas publik. 

Sistem memecah klaim menjadi komponen pernyataan yang dapat diuji, mengambil bukti data pasar faktual melalui **Sectors API**, membandingkan klaim dengan data riil, dan menyajikan *receipt* verifikasi yang transparan (mencakup status pembuktian, periode data, batas pemeriksaan, serta tautan sumber).

> [!NOTE]
> BursaBukti adalah sarana informasi dan analisis berbasis data, **bukan** pemberi saran finansial atau rekomendasi transaksi saham.

---

## 🏗️ Struktur Repositori

Proyek ini dibangun sebagai aplikasi terpadu (*monorepo single-app*) menggunakan **Next.js (App Router)** dan **TypeScript**:

```text
BursaBukti/
├── docs/                  # Dokumentasi proyek (PRD, panduan, dll.)
│   └── PRD.md             # Product Requirements Document resmi
├── src/
│   ├── app/               # Halaman antarmuka frontend (Next.js App Router)
│   │   ├── api/           # Endpoint serverless / backend API internal
│   │   ├── globals.css    # Gaya global CSS
│   │   ├── layout.tsx     # Root layout aplikasi
│   │   └── page.tsx       # Halaman beranda BursaBukti
│   └── lib/
│       ├── sectors/       # Modul integrasi klien Sectors API
│       └── verification/  # Modul logika verifikasi klaim
├── .env.example           # Contoh konfigurasi environment variables
├── AGENTS.md              # Aturan kerja tim & panduan agen AI
├── package.json           # Konfigurasi dependensi dan skrip proyek
├── tsconfig.json          # Konfigurasi TypeScript
└── README.md              # Petunjuk dan informasi umum proyek
```

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Prasyarat
- Node.js versi 18.x atau yang lebih baru (disarankan Node.js v20+)
- npm atau pnpm / yarn

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (.env.local)
Salin berkas template environment:
```bash
cp .env.example .env.local
```
Lalu lengkapi nilai variabel di `.env.local`:
```env
SECTORS_API_KEY=kunci_api_sectors_anda
SECTORS_API_BASE_URL=https://api.sectors.app/v1
```

### 4. Menjalankan Server Pengembangan (Dev Mode)
```bash
npm run dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000) untuk melihat antarmuka BursaBukti.

### 5. Memeriksa Build Produksi
```bash
npm run build
```

---

## 📋 Pedoman Tim & Kontribusi
Sebelum berkontribusi atau melakukan pengeditan kode, pastikan telah membaca:
1. [docs/PRD.md](file:///Users/macbook/BursaBukti/docs/PRD.md)
2. [AGENTS.md](file:///Users/macbook/BursaBukti/AGENTS.md)
