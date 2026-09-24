# Software Requirements Specification — BursaBukti

**Versi:** 1.1, 24 September 2026  
**Status:** Draf implementasi. Tim melaporkan uji Postman dengan API key aktif berhasil mengembalikan JSON; validasi integrasi di aplikasi dan batas cakupan data masih dikerjakan.  
**Acuan:** `docs/BursaBukti_PRD.md` pada repo; Sectors Financial API v2.  
**Pemilik:** Tim BursaBukti, Track AI Agents & Assistants.

## 1. Tujuan dan batas rilis

BursaBukti menerima satu klaim teks tentang emiten IDX, mengumpulkan bukti Sectors yang relevan, menerapkan pemeriksaan yang dapat diulang, dan mengembalikan *receipt* dengan tanggal serta sumber. Hasilnya bersifat informasional dan tidak memberi saran investasi. Dokumen ini mengubah PRD menjadi kontrak untuk UI, backend, integrasi Sectors, agent, dan verifikator. Jika implementasi dan dokumen bertentangan, perbarui keduanya melalui review tim.

**P0, demo pertama:** klaim perubahan harga penutupan emiten pada tanggal perdagangan eksplisit, misalnya “BBRI naik 0,31% pada 23 September 2026”. **P1:** klaim bahwa suatu artikel memberitakan hal tertentu, dan klaim angka keuangan dengan dua periode yang benar-benar tersedia. **P2:** OCR, receipt permanen, akun, serta kategori filing/aksi korporasi. Jangan menampilkan P1/P2 sebagai fitur selesai sebelum syarat terima terpenuhi.

**Hasil uji yang dilaporkan tim:** request Postman terautentikasi dengan API key aktif telah mengembalikan JSON untuk data Sectors yang dibagikan dalam diskusi. Pada contoh `/v2/daily/BBRI/`, 22 September 2026 `close=3180` dan 23 September 2026 `close=3190`, yaitu sekitar +0,31%. Contoh News Articles mempunyai `source`, `timestamp`, dan `symbols`. Contoh laporan keuangan BBRI yang dibagikan bertanggal 30 September 2024; respons tersebut belum mendukung klaim laba semester I 2026. Catat URL endpoint, parameter, status HTTP, waktu request, dan respons yang disamarkan dari Postman di catatan tim untuk audit. Playground Demo Mode dapat menghasilkan mock data; status Postman ini berdasar laporan tim dan tetap harus direproduksi melalui backend aplikasi sebelum fitur diklaim selesai.

## 2. Arsitektur dan tanggung jawab

| Komponen | Lokasi usulan | Tanggung jawab |
| --- | --- | --- |
| UI | `src/app/` | Form klaim, progres, klarifikasi, hasil, receipt, pesan gagal |
| Route API internal | `src/app/api/verify/route.ts` | Validasi request, pembatasan biaya/akses, panggil orkestrator; tidak mengirim key ke browser |
| Orkestrator | `src/lib/verification/` | Ekstraksi → validasi → routing terbatas → bukti → verdict → receipt |
| Client Sectors | `src/lib/sectors/` | Header otorisasi, allowlist endpoint, timeout, cache, normalisasi error |
| Agent/ekstraktor | `src/lib/agent/` (jika dipakai) | Hasil JSON terstruktur; tidak menetapkan verdict akhir atau URL request |
| Penyimpanan | In-memory saat P0; PostgreSQL terkelola pada P1 | Snapshot receipt yang bisa dibuka ulang; tidak dibutuhkan untuk P0 |

Satu aplikasi Next.js cukup: UI dan route server dalam repo yang sama. Jangan memecahnya menjadi repo frontend/backend sebelum kebutuhan deployment membenarkannya. Integrasi provider AI berada di server; keputusan provider belum ditetapkan. Jika belum ada AI, implementasikan parsing terbatas untuk demo sebagai langkah sementara dan **jangan mengklaim bahwa agent sudah bekerja**. Produk Track AI Agents harus memperlihatkan peran agent yang nyata saat submission.

## 3. Konfigurasi dan rahasia

Di root proyek, `.env.local` berisi `SECTORS_API_BASE_URL=https://api.sectors.app/v2` dan `SECTORS_API_KEY=<key aktif>`. `.env.example` memuat nama variabel dan base URL, tetapi nilai key kosong. `.gitignore` mengabaikan `.env*` kecuali `.env.example`. Variabel ini hanya boleh dibaca server; jangan gunakan awalan `NEXT_PUBLIC_` untuk key. Request ke Sectors memakai header `Authorization: <key>`, bukan query string atau URL yang dibagikan. Key yang pernah tampil di screenshot harus dirotasi sebelum digunakan.

Saat deploy, set kedua variabel dalam konfigurasi environment penyedia hosting. Tidak ada kunci, token, prompt rahasia, atau seluruh respons provider yang ditulis ke log publik, receipt, maupun error response.

## 4. Kontrak input, ekstraksi, dan routing

**Endpoint internal:** `POST /api/verify`. Body JSON: `{ "claim": "BBRI naik 0,31% pada 23 September 2026" }`. Terima tepat satu klaim teks nonkosong, maksimal 1.000 karakter Unicode setelah trim; limit ini adalah pilihan awal tim dan dapat diubah setelah pengujian. `Content-Type: application/json` wajib. Tolak input yang bukan string, berisi hanya whitespace, atau lebih panjang. Jangan menganggap instruksi di teks klaim sebagai perintah untuk agent.

**Objek ekstraksi (server internal):**

```ts
type ExtractedClaim = {
  category: 'price_change' | 'news_mention' | 'financial_metric' | 'unsupported';
  symbol: string | null;        // normalisasi BBRI/BBRI.JK -> BBRI.JK
  date: string | null;          // YYYY-MM-DD untuk price_change
  metric: 'close' | 'earnings' | null;
  operator: 'eq' | 'gt' | 'lt' | 'up' | 'down' | null;
  statedValue: number | null;
  unit: 'IDR' | 'percent' | null;
  periodLabel: string | null;   // jangan menebak kuartal/semester
  ambiguity: string[];
};
```

Schema divalidasi server setelah agent mengeluarkan JSON. Simbol hanya ticker IDX dengan pola yang disepakati dan harus disanitasi sebelum menjadi path. Nama emiten yang ambigu meminta klarifikasi. Untuk P0, tanggal harus eksplisit; “kemarin” tidak diterjemahkan diam-diam. Jika klaim majemuk, pada P0 minta satu klaim spesifik; P1 dapat membagi menjadi subklaim dan memberi status per subklaim. Nilai atau periode yang tidak ada tetap `null`, tidak diisi lewat dugaan model.

| Kategori | Endpoint Sectors yang diizinkan | Parameter dan prasyarat | Keluaran |
| --- | --- | --- | --- |
| `price_change` P0 | `GET /daily/{symbol}/` | `start`, `end` ISO, rentang pendek yang mencakup tanggal target dan hari bursa sebelumnya | Array `date`, `close`, `symbol` (dan field lain bila ada) |
| `news_mention` P1 | `GET /news/` | `extension=idx`, `symbols`, `start`, `end`, `limit` kecil; verifikasi filter simbol di respons | `results[]`: `title`, `body`, `source`, `timestamp`, `symbols` |
| `financial_metric` P1 | `GET /financials/quarterly/{symbol}/` | Parameter periode hanya setelah cek dokumentasi dan respons live; bandingkan definisi metrik dan periode yang setara | `earnings`, `date`, `symbol`; jangan gunakan data 2024 untuk klaim 2026 |
| `unsupported` | Tidak ada | Tampilkan batas cakupan | `insufficient_evidence` tanpa panggilan eksternal |

Path endpoint dikonfigurasi di kode, tidak diambil dari teks pengguna atau output mentah LLM. Query dibangun dengan `URLSearchParams` dan parameter allowlist per endpoint. Jangan tambahkan `commodity_type` untuk `extension=idx`; parameter ini tidak valid untuk extension tersebut. Bila simbol di respons tidak sesuai, abaikan item tersebut dan catat keterbatasan.

## 5. Pemeriksaan deterministik dan verdict

Untuk `price_change`, sortir baris valid berdasarkan tanggal naik. Pilih baris **tepat** pada tanggal klaim dan baris perdagangan terdekat sebelumnya, dengan simbol yang sama dan `close` finite > 0. Bila salah satu tidak ada, status `insufficient_evidence`; jangan memilih hari lain sebagai tanggal target. Hitung `((close_target - close_previous) / close_previous) * 100`. Untuk contoh data yang diberikan: `((3190 - 3180) / 3180) * 100 = 0.314465...%`; tampilkan `+0,31%` memakai pembulatan untuk UI dan simpan nilai dasar/perhitungan di receipt. Jangan menghitung dari `open` atau menyebut pergerakan intraday sebagai penutupan.

Untuk klaim angka persentase, **aturan awal** toleransi selisih ≤0,05 poin persentase setelah memastikan arah, ticker, metrik, dan kedua tanggal cocok. Toleransi ini keputusan produk untuk angka dua desimal, bukan sifat API; uji kasus pembulatan sebelum rilis. Untuk klaim hanya “naik/turun”, cocokkan tanda perubahan; perubahan nol bukan naik atau turun. Perbedaan di luar toleransi memberi `contradicted` jika semua prasyarat bukti terpenuhi. Angka yang hanya muncul dalam berita tidak menjadi dasar pembuktian metrik harga/keuangan.

Status hasil internal:

| Status | Kapan diberikan |
| --- | --- |
| `supported` | Prasyarat cocok, data lengkap, dan aturan metrik mendukung klaim |
| `contradicted` | Prasyarat cocok, data lengkap, dan aturan metrik menunjukkan perbedaan jelas |
| `insufficient_evidence` | Simbol/tanggal/metrik ambigu, data kosong/usang/tidak sepadan, atau kategori belum didukung |
| `failed` | Autentikasi, kredit, timeout, upstream, parser, atau kegagalan internal |

`failed` adalah status operasional, **bukan** penilaian benar/salah. `news_mention` hanya dapat menyimpulkan “berita ditemukan” jika artikel dan isi cocok; keberadaan artikel tidak membuktikan kebenaran peristiwa yang diberitakan. Klaim keuangan P1 memerlukan definisi metrik, mata uang, tanggal akhir dua periode, dan kesesuaian laporan; jika salah satu tidak tersedia, `insufficient_evidence`.

## 6. Respons dan receipt

Respons sukses aplikasi memakai kode HTTP 200, termasuk `insufficient_evidence`. Bentuk kontrak awal:

```json
{
  "receiptId": "uuid",
  "claim": "BBRI naik 0,31% pada 23 September 2026",
  "interpreted": { "category": "price_change", "symbol": "BBRI.JK", "date": "2026-09-23", "statedValue": 0.31, "unit": "percent" },
  "status": "supported",
  "reason": "Penutupan BBRI berubah dari 3180 menjadi 3190 (+0,31%) pada dua hari perdagangan terkait.",
  "calculation": { "formula": "(current - previous) / previous * 100", "previous": 3180, "current": 3190, "resultPercent": 0.3144654088 },
  "evidence": [{ "id": "ev-1", "sourceType": "sectors_api", "endpoint": "/daily/BBRI/", "safeParams": { "start": "2026-09-22", "end": "2026-09-23" }, "dataDate": "2026-09-23", "fetchedAt": "2026-09-24T00:00:00Z", "publicUrl": null }],
  "limitations": ["Data melalui Sectors API; tautan publik langsung ke record belum tersedia."],
  "rulesVersion": "price-v1",
  "disclaimer": "Pemeriksaan informasi, bukan rekomendasi investasi."
}
```

Angka harga mengikuti contoh JSON yang dibagikan tim; `fetchedAt` dan `receiptId` di atas hanyalah ilustrasi, **bukan** waktu/ID hasil Postman. Receipt produksi mengisi `fetchedAt` dari waktu server yang nyata dan menyimpan nilai serta tanggal kedua baris sebagai bukti; jangan hanya menyimpan nilai akhir. `receiptId` pada P0 mengidentifikasi hasil di respons saja; URL receipt permanen menunggu implementasi penyimpanan P1. `publicUrl` hanya dari sumber publik nyata, misalnya URL `source` pada item berita atau tautan dokumen resmi; bila tidak ada, `null`, bukan URL API yang mengandung key. `endpoint` adalah label provenance, bukan tautan publik. Di UI tampilkan tanggal data dalam zona Asia/Jakarta dengan zona yang jelas, waktu pengambilan, sumber, perhitungan, dan keterbatasan.

Untuk request tidak valid, HTTP 400 dengan `{ "error": { "code": "INVALID_CLAIM", "message": "..." } }`. Rate limit HTTP 429 `RATE_LIMITED`. Kegagalan Sectors key/credit memakai HTTP 502/503 dengan `UPSTREAM_AUTH` atau `UPSTREAM_CREDITS`; timeout `UPSTREAM_TIMEOUT` HTTP 504; kegagalan tidak terduga HTTP 500 `INTERNAL_ERROR`. Status hasil `failed` boleh dikirim sebagai payload error terstruktur agar UI menampilkan “Gagal diperiksa”; jangan pernah mengganti kegagalan layanan menjadi `insufficient_evidence`. Pesan publik tidak memuat token atau respons upstream penuh.

## 7. Persyaratan keamanan, kualitas, dan biaya

- **SRS-SEC-01:** semua request Sectors dan AI provider berlangsung di server. Tidak ada kunci di bundle browser, source map, URL, log, contoh respons, atau repo.
- **SRS-SEC-02:** allowlist path dan parameter; batasi `symbol`, panjang input, jumlah panggilan per verifikasi, waktu request, dan ukuran respons; jangan mengikuti URL dari klaim atau narasi model.
- **SRS-SEC-03:** perlakukan input pengguna, artikel, dan respons LLM sebagai data yang tidak dipercaya; output narasi hanya menyebut angka dan tautan yang punya `evidence.id` cocok. Render teks sebagai teks, jangan HTML mentah.
- **SRS-SEC-04:** akses publik perlu pembatasan per IP/sesi dan kuota sebelum deployment agar kredit tim tidak cepat habis. Cache per endpoint/simbol/rentang dan TTL: harga historis minimal beberapa jam; berita lebih singkat. TTL final diputuskan setelah cek kebutuhan pembaruan.
- **SRS-QA-01:** P0 tidak membutuhkan DB atau login. Timeout, loading, dan error harus terlihat jelas. Ambang latency dan concurrency diukur setelah tes live, bukan diklaim dari demo mock.
- **SRS-QA-02:** `GET /api/health` tidak boleh memanggil Sectors atau membocorkan key. Health lokal sukses tidak membuktikan autentikasi Sectors sukses.
- **SRS-QA-03:** cache tidak boleh mengganti `fetchedAt` menjadi waktu sekarang untuk data lama; cantumkan `retrievedAt`/waktu pertama diambil serta `servedAt` jika dibutuhkan.

## 8. Penyimpanan P1 (opsional setelah P0 bekerja)

Jika receipt yang dapat dibuka ulang diperlukan, gunakan PostgreSQL terkelola (opsi: Supabase) dengan migrasi di repo. Skema minimal: `receipts(id UUID PK, original_claim TEXT, category TEXT, verdict TEXT, reason TEXT, rules_version TEXT, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ NULL)` dan `evidence(id UUID PK, receipt_id UUID FK, source_type TEXT, endpoint TEXT, safe_params JSONB, symbol TEXT, data_date DATE NULL, fetched_at TIMESTAMPTZ, public_url TEXT NULL, snapshot JSONB)`. Simpan perhitungan dan interpretasi terstruktur pada receipt atau tabel terpisah sesuai keputusan implementasi; snapshot harus cukup untuk memutar ulang alasan tanpa request API baru.

Jangan simpan key, header auth, prompt rahasia, atau data pribadi tanpa kebutuhan produk. Jika URL receipt bisa dibagikan, pakai ID tidak mudah ditebak, batasi isi yang dipublikasikan, tetapkan retensi dan mekanisme hapus sebelum fitur aktif. **Status skema:** usulan, bukan migrasi yang sudah dibuat.

## 9. Kasus uji dan syarat diterima

| ID | Skenario | Hasil yang wajib |
| --- | --- | --- |
| T-01 | Klaim BBRI +0,31% 23/09/2026; API live memberi close 3180→3190 | `supported`; dua tanggal dan rumus muncul pada receipt |
| T-02 | Klaim BBRI +3% pada tanggal yang sama; data live sama | `contradicted`; alasan mengutip +0,31%, bukan angka artikel |
| T-03 | Baris target 23/09 tidak ada | `insufficient_evidence`; tidak menggantinya dengan 22/09 |
| T-04 | Input “BBRI naik kemarin” atau nama emiten ambigu | Minta tanggal/simbol; tidak memanggil endpoint tanpa parameter jelas |
| T-05 | API key salah, kredit habis, atau timeout | `failed`; status error tepat dan tidak ada verdict fakta |
| T-06 | Agent menghasilkan URL eksternal, key, simbol invalid, atau JSON rusak | Ditolak validator; tidak ada request ke URL tersebut |
| T-07 | Artikel hanya menyebut BBRI di body tetapi simbol filter/field tidak cocok | Item tidak dipakai untuk menyatakan dukungan tanpa pemeriksaan konten dan simbol |
| T-08 | Klaim laba 2026 tetapi data keuangan terbaru 2024 | `insufficient_evidence`; tahun lama tampil sebagai batas data |
| T-09 | Receipt harga tanpa link publik | `publicUrl=null`; provenance endpoint, tanggal, dan batasan tetap terlihat |

T-01/T-02 menggunakan angka dari JSON yang dibagikan tim dan dilaporkan berasal dari Postman terautentikasi. Arsipkan fixture tanpa key beserta parameter dan tanggal request; bila respons live berikutnya berbeda, sesuaikan ekspektasi dengan tanggal/periode yang tepat, jangan memaksa hasil demo. Untuk tes unit kalkulasi/validasi gunakan fixture lokal anonim; uji integrasi dari server aplikasi dengan key nyata dalam lingkungan aman, tanpa mencetak key di CI.

**Definition of Done P0:** UI mengirim satu klaim → server mengekstrak dan validasi → tepat satu endpoint allowlist dipanggil bila input valid → dua tanggal harga dipilih dengan benar → verdict deterministik → receipt menyebut angka/tanggal/sumber/keterbatasan → error upstream jelas → tidak ada key di git maupun browser. Hasil nyata diverifikasi setidaknya pada satu ticker dan dua tanggal perdagangan. Jangan menandai selesai jika alur masih menggunakan data mock.

## 10. Urutan pekerjaan dan pembagian area

1. **Pemilik data/backend:** dokumentasikan uji Postman yang sudah dilakukan untuk `/daily/BBRI/` dan `/news/` (jika keduanya memang tercakup), catat bentuk respons, parameter, tanggal data, status HTTP, kredit, dan link publik; simpan fixture anonim tanpa header rahasia. Ulangi request yang diperlukan melalui backend aplikasi.
2. **Pemilik kontrak/AI:** finalkan schema ekstraksi, batas klaim, dan prompt tahan instruksi dari klaim; uji ekstraksi pada kasus ambigu dan angka persentase.
3. **Pemilik verifikator:** implementasi perhitungan harga, aturan verdict, evidence ID, dan kasus T-01–T-06/T-08–T-09.
4. **Pemilik UI:** form, loading, klarifikasi, empat status, receipt dan empty/error states; baca kontrak API di atas sebelum menghubungkan halaman.
5. **Integrator:** review respons live, jalankan build dan tes relevan, periksa key tidak masuk `git status`/bundle, review demo. Satu orang menggabungkan PR; coding agent tidak commit/push sendiri sesuai aturan tim.

Setiap tugas dicatat dalam `docs/TASKS.md`/issue board dengan pemilik dan file yang boleh diedit. Perubahan schema API internal atau aturan verdict disepakati sebelum UI/backend dikerjakan paralel. Setelah uji data, revisi bagian berlabel usulan dan naikkan versi SRS.

**Catatan untuk commit dokumen ini:** tujuan `spesifikasi teknis MVP`; file `docs/SRS.md`; tes `review PRD↔SRS dan pemeriksaan Markdown`; risiko `cakupan data P1 dan integrasi backend belum tervalidasi`; usulan pesan `docs: add BursaBukti SRS`. Tim melakukan commit dan push setelah review.

## 11. Referensi

- PRD tim: `docs/BursaBukti_PRD.md`.
- Sectors API v2: https://docs.sectors.app/get-started/v2/overview
- News Articles: https://docs.sectors.app/api-references/v2/indonesia/news/news
- Dokumentasi endpoint lain: https://docs.sectors.app/
- Aturan kompetisi: https://hackathon.sectors.app/rules
