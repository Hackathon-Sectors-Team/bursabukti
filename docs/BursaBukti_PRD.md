# Product Requirements Document — BursaBukti

**Versi:** 1.0 — 24 September 2026  
**Status:** Draf implementasi untuk tim; keputusan endpoint dan hasil uji nyata diberi penanda *perlu validasi*  
**Kompetisi:** Sectors Hackathon 2026, Track 01 — AI Agents & Assistants  
**Pemilik produk:** Tim BursaBukti

## 1. Ringkasan produk

**BursaBukti** adalah asisten verifikasi klaim pasar modal Indonesia. Pengguna menempelkan satu klaim tentang saham atau emiten; sistem memecahnya menjadi pernyataan yang bisa diuji, mengambil data Sectors yang relevan, membandingkan klaim dengan bukti, lalu menampilkan *receipt* yang menjelaskan hasil, waktu data, batas pemeriksaan, dan tautan sumber. Tujuannya adalah membantu investor ritel memahami dasar suatu klaim sebelum mengambil keputusan sendiri.

**Pernyataan masalah satu kalimat:** Investor ritel yang menerima klaim saham dari media sosial membutuhkan cara cepat untuk melihat data dan sumber yang relevan, tanpa harus percaya begitu saja pada jawaban AI atau membuka banyak halaman secara manual.

**Janji produk:** “Masukkan klaim saham. Lihat apa yang didukung data, apa yang bertentangan, dan apa yang belum bisa dibuktikan.” BursaBukti adalah alat informasi dan analisis; tidak memberikan rekomendasi membeli, menjual, atau menahan saham.

## 2. Latar belakang, hipotesis, dan batas bukti masalah

Informasi pasar modal tersebar di berita, data harga, laporan perusahaan, dan pengumuman resmi. Klaim singkat seperti “laba emiten X naik 20%” sering menghilangkan periode, definisi laba, atau sumber. AI umum dapat menyusun jawaban yang meyakinkan, tetapi pengguna tetap harus memeriksa apakah angka, tanggal, dan tautannya cocok dengan klaim.

Hipotesis tim: receipt yang menampilkan jejak bukti akan mengurangi waktu pengecekan klaim dan meningkatkan kemampuan pengguna menunjuk sumber yang mendasari kesimpulan. Ini **hipotesis produk**, belum hasil riset pengguna. Validasi awal dilakukan dengan 5–8 calon pengguna dan 6–10 klaim uji yang memiliki jawaban rujukan; lihat §13. Jangan menuliskan klaim “terbukti mengurangi misinformasi” sebelum pengujian mendukungnya.

Sectors REST API v2 adalah sumber data inti. Bila Sectors tidak tersedia, alur verifikasi inti harus menampilkan kegagalan yang jelas, bukan diam-diam menghasilkan verdict dari model bahasa saja. Sumber lain, bila digunakan, berfungsi sebagai pembanding atau tautan asli dari data Sectors. Dalam uji awal, Companies Screener sudah menghasilkan struktur `results` dan `llm_translation`; News Articles sudah menghasilkan `title`, `body`, `source`, `timestamp`, dan `symbols`. Uji News Articles sebelumnya belum membuktikan filter `symbols=BBCA` bekerja karena respons berisi BBRI dan item tanpa simbol. Playground juga menampilkan peringatan bahwa Demo Mode dapat menghasilkan data contoh; hanya respons terautentikasi yang boleh dipakai untuk klaim data nyata.

## 3. Sasaran pengguna dan pekerjaan mereka

| Pengguna | Situasi | Kebutuhan utama |
| --- | --- | --- |
| Investor ritel pemula (utama) | Melihat klaim saham di grup atau media sosial | Memahami apakah klaim punya bukti, periode apa yang dimaksud, dan di mana sumbernya |
| Investor ritel yang lebih aktif (sekunder) | Membandingkan headline dengan angka perusahaan atau pasar | Jejak pemeriksaan yang ringkas dan dapat dibuka ulang |
| Juri/demo evaluator | Menguji satu alur dari input sampai receipt | Bukti penggunaan Sectors yang nyata, logika agent yang dapat dijelaskan, dan hasil yang tidak dibuat-buat |

**Kebutuhan fungsional utama pengguna:** memasukkan klaim → mengetahui bagian yang diuji → membaca hasil dan batasnya → membuka sumber. Akun, feed, dan rekomendasi saham bukan kebutuhan inti MVP.

## 4. Tujuan, ukuran keberhasilan, dan hal di luar cakupan

### Tujuan MVP

1. Menyelesaikan setidaknya satu alur verifikasi **ujung ke ujung** dengan data Sectors nyata: input → ekstraksi → pemilihan endpoint → pengambilan bukti → evaluasi → receipt.
2. Menunjukkan dua kategori klaim yang terbukti didukung endpoint dan data uji. Target awal: klaim angka keuangan dan klaim harga/pergerakan; kategori kedua dapat diganti bila akses atau cakupan datanya tidak memadai.
3. Menampilkan sumber, periode, waktu pemeriksaan, dan alasan verdict secara eksplisit.
4. Menolak memberikan kepastian ketika simbol, periode, atau bukti tidak cukup.

### Ukuran keberhasilan yang diuji, bukan dijanjikan

| Metrik | Cara ukur | Target awal untuk demo internal |
| --- | --- | --- |
| Penyelesaian alur | Klaim yang menghasilkan receipt atau status gagal yang jelas | 100% pada 6–10 kasus uji terkurasi |
| Ketepatan data utama | Cocokkan angka, simbol, periode, dan URL dengan respons API yang disimpan | 100% pada kasus demo |
| Ketepatan verdict | Penilaian manual dua anggota tim memakai rubrik §8 | ≥80% pada set uji awal; sisanya ditinjau dan dicatat |
| Keterlacakan | Penguji dapat membuka link dan menemukan bukti yang disebut | 100% receipt yang menyatakan “terdukung/bertentangan” |
| Waktu tugas pengguna | Bandingkan waktu menemukan bukti dengan cara manual vs BursaBukti | Ukur baseline; target numerik ditetapkan sesudah pilot |
| Kegagalan aman | Kasus tanpa bukti tidak diberi status “benar/salah” | 100% kasus uji tanpa bukti |

### Di luar cakupan MVP

- Eksekusi transaksi, sinyal beli/jual, prediksi keuntungan, target harga, dan saran portofolio.
- Verifikasi seluruh rumor pasar, identitas akun media sosial, atau motivasi pembuat klaim.
- Menyatakan berita media sebagai dokumen resmi perusahaan.
- Menjamin kebenaran mutlak atau data waktu nyata untuk seluruh emiten.
- Login wajib, fitur komunitas, notifikasi berkala, integrasi broker, dan unggah gambar/OCR. Input gambar menjadi pekerjaan tahap berikutnya setelah alur teks stabil.
- Skor kredibilitas universal 0–100 tanpa kalibrasi. MVP memakai verdict berbasis bukti dan alasan; skor baru dipertimbangkan setelah rubrik dan pengujian tersedia.

## 5. Cakupan jenis klaim dan strategi sumber

| Jenis klaim | Contoh input | Bukti utama yang dicari | Catatan status |
| --- | --- | --- | --- |
| Angka perusahaan | “Laba BBRI naik 17% pada semester I 2026” | Company Report / Company Quarterly Financials; angka dan periode pembanding | **Perlu validasi:** cakupan field, satuan, definisi PATMI dan cara membandingkan semester |
| Harga dan volume | “BMRI naik 3% pada 23 September 2026” | Daily Transaction Data dengan tanggal perdagangan dan harga penutupan pembanding | **Perlu validasi:** cakupan tanggal, hari libur bursa, aksi korporasi |
| Pemberitaan | “Media melaporkan BBCA melakukan X” | News Articles, `title`, `body`, `timestamp`, `source`, `symbols` | Receipt hanya memastikan adanya pemberitaan dan kesesuaian isi; bukan otomatis membenarkan kejadian |
| Insider/pemegang saham besar | “Pemegang saham besar emiten X menjual saham” | Company Filings, tipe transaksi, tanggal, jumlah, `source` pengumuman | Endpoint ini khusus transaksi insider/pemegang saham besar, bukan seluruh laporan emiten |
| Dividen/aksi korporasi | “Emiten X mengumumkan dividen Y” | Corporate Actions atau sumber resmi yang relevan | **Perlu validasi:** field dan tautan dokumen sebelum masuk demo |

**Aturan prioritas sumber:** angka terstruktur Sectors dengan periode yang cocok > dokumen emiten/IDX yang tertaut pada hasil Sectors > artikel berita untuk klaim bahwa suatu media menerbitkan berita. Artikel berita dapat memberi konteks, tetapi tidak menggantikan angka primer untuk klaim keuangan. Jika tautan publik ke data Sectors tidak tersedia, receipt menampilkan sumber data “Sectors API”, nama endpoint, parameter nonrahasia, waktu akses, dan tautan dokumen asli bila ada. Jangan membuat tautan API ber-key sebagai tombol publik.

**Penting:** daftar endpoint ini adalah rancangan, bukan pernyataan bahwa semua kategori sudah teruji. Jangan membuat dukungan kategori tertentu di UI sebelum tes respons terautentikasi, cakupan data, dan link sumbernya lulus.

## 6. Alur pengguna dan layar MVP

1. **Beranda/input:** satu kotak teks untuk satu klaim; contoh klaim realistis; tombol “Periksa klaim”. Tampilkan penjelasan singkat bahwa alat ini bukan rekomendasi investasi.
2. **Progres:** “Mengenali klaim”, “Mencari data Sectors”, “Membandingkan bukti”, “Menyiapkan receipt”. Jangan mengklaim langkah selesai bila belum terjadi.
3. **Konfirmasi ambigu:** bila ada dua kemungkinan emiten/periode, minta pengguna memilih atau tampilkan “Perlu detail tambahan”; jangan menebak.
4. **Hasil ringkas:** tampilkan klaim asli, pernyataan yang diuji, status, dua atau tiga alasan utama, tanggal data, dan tombol “Lihat receipt”.
5. **Receipt detail:** bukti per sumber, angka dan periode yang dibandingkan, keterbatasan, tautan publik, tanggal akses, dan penjelasan keputusan. Tampilkan peringatan jika sumber hanya berita atau jika data sudah lama.
6. **Riwayat lokal/server:** setelah alur inti stabil, simpan receipt agar tautan hasil bisa dibuka ulang; tanpa akun pada MVP, penggunaan publik dan privasi perlu ditinjau sebelum dibagikan.

**Contoh alur:** pengguna memasukkan “Harga BBRI naik 3% kemarin” → agent mengenali `BBRI`, jenis `harga`, tetapi “kemarin” diselesaikan berdasarkan zona waktu Asia/Jakarta dan hari bursa terakhir → service mengambil harga dua hari perdagangan yang relevan → verifier menghitung perubahan dengan rumus yang terdokumentasi → receipt menampilkan hasil dan tanggal eksplisit. Bila tanggal tidak dapat dipastikan, minta tanggal dan hentikan verdict.

## 7. Kebutuhan produk prioritas

| ID | Prioritas | Perilaku yang harus terlihat | Kriteria penerimaan |
| --- | --- | --- | --- |
| PR-01 | P0 | Terima satu klaim teks dalam Bahasa Indonesia | Input kosong/terlalu panjang ditolak dengan pesan jelas; teks asli dipertahankan |
| PR-02 | P0 | Ekstrak emiten, jenis klaim, nilai, satuan, periode, dan subklaim | Hasil terstruktur divalidasi; nilai yang tidak disebut tidak diisi dengan tebakan |
| PR-03 | P0 | Pilih endpoint hanya dari daftar yang diizinkan | Model tidak boleh membentuk URL bebas; salah jenis klaim tidak memanggil endpoint yang tidak relevan |
| PR-04 | P0 | Ambil data Sectors melalui server dengan API key rahasia | Request aktual tervalidasi; key tidak muncul di client, URL receipt, log, repo, atau respons error |
| PR-05 | P0 | Bandingkan klaim dengan angka, tanggal, dan satuan yang sama | Periode tidak cocok atau field tidak tersedia menghasilkan “bukti belum cukup” |
| PR-06 | P0 | Tampilkan verdict dan alasan yang dapat diaudit | Tiap klaim “terdukung/bertentangan” menunjukkan minimal satu bukti relevan dan timestamp |
| PR-07 | P0 | Berikan link sumber yang benar-benar dapat dibuka | Link diuji manual; bila tidak ada link publik, beri label sumber data API dan keterbatasan |
| PR-08 | P0 | Tangani error dan kehabisan kredit | Tampilkan kegagalan layanan yang jujur; jangan buat receipt seolah telah diperiksa |
| PR-09 | P0 | Blokir rekomendasi investasi dan eksekusi trading | Tidak ada kalimat “beli/jual sekarang”; ada pernyataan fungsi informasi dan analisis |
| PR-10 | P1 | Simpan jejak analisis dan receipt | Receipt yang dibuka ulang memuat snapshot data dan waktu akses yang sama |
| PR-11 | P1 | Dukung berita dan pengumuman insider | Jenis sumber dilabeli dengan tepat; berita tidak dihitung sebagai verifikasi angka primer |
| PR-12 | P2 | Unggah gambar dan OCR | Baru dikerjakan setelah input teks dan verifikasi sumber lulus |

## 8. Aturan verdict dan receipt

### Status hasil

- **Didukung bukti:** klaim spesifik, simbol dan periode cocok, angka/fakta yang dibandingkan mendukungnya menurut aturan yang terukur.
- **Bertentangan dengan bukti:** bukti relevan untuk simbol dan periode yang sama jelas menunjukkan hal berbeda.
- **Bukti belum cukup:** data tidak ada, klaim terlalu umum, sumber hanya mengutip tanpa dasar yang cocok, periode tidak jelas, atau sumber saling tidak sepadan.
- **Gagal diperiksa:** API, autentikasi, kredit, atau proses internal gagal. Ini status operasional, bukan penilaian kebenaran klaim.

Label “berita ditemukan” boleh digunakan sebagai temuan per sumber, tetapi **tidak otomatis menjadi verdict “klaim benar”**. Untuk klaim majemuk, evaluasi tiap subklaim dan tampilkan ringkasan; satu subklaim benar tidak membuat seluruh pernyataan benar. Hindari skor numerik yang terlihat presisi tetapi tidak terkalibrasi.

### Isi minimal receipt

1. ID receipt, klaim asli, waktu permintaan, dan zona waktu.
2. Interpretasi terstruktur: simbol/nama emiten, subklaim, angka, satuan, tanggal/periode.
3. Status setiap subklaim dan alasan singkat berbasis bukti.
4. Setiap bukti: jenis sumber (Sectors data, dokumen resmi, atau berita), judul/nama metrik, nilai, tanggal data, waktu diambil, nama endpoint, parameter aman, dan URL publik bila tersedia.
5. Perhitungan yang dapat dijelaskan bila hasil memakai persentase atau perubahan antarkuartal.
6. Keterbatasan: data terlambat, periode tidak sama, sumber media, tidak ada dokumen primer, atau link tidak dapat dibuka.
7. Disclaimer ringkas: hasil adalah pemeriksaan informasi, bukan nasihat investasi.

**Aturan keamanan receipt:** jangan simpan atau tampilkan API key, header Authorization, prompt rahasia, atau URL privat. Jika URL sumber rusak, jangan substitusi URL lain tanpa bukti identitas dokumen yang sama.

## 9. Perilaku AI agent dan batas kendali

Agent dipakai sebagai **pengarah alur**, bukan otoritas final. Ia membaca klaim, membuat struktur JSON dengan schema ketat, memilih kategori dari enum yang disetujui, dan menjelaskan hasil dari evidence terpilih. Service terpisah melakukan validasi input, pemanggilan endpoint, normalisasi satuan/tanggal, kalkulasi angka, serta aturan verdict. Daftar endpoint dan parameter berada di server; model tidak boleh mengirim request ke URL arbitrer.

Alur konseptual:

`klaim → ekstraksi JSON → validasi → pemilihan tool/endpoint → Sectors API → normalisasi bukti → pembandingan deterministik → narasi receipt → validasi hasil`

Jika agent gagal mengidentifikasi simbol atau jenis klaim, sistem meminta detail tambahan. Jika data dari API kosong, agent wajib menyatakan “bukti belum cukup”. Semua klaim faktual dalam narasi harus dapat ditunjuk ke satu item evidence; kalimat yang tidak punya bukti dibuang sebelum ditampilkan. Model, provider, dan biaya belum diputuskan; pilih setelah membandingkan latency dan kualitas ekstraksi pada set uji.

## 10. Data, integrasi, dan privasi produk

**Stack rancangan:** Next.js untuk UI dan endpoint server; Sectors REST API v2 sebagai data inti; PostgreSQL terkelola (rencana: Supabase) untuk riwayat receipt setelah alur inti stabil. Keputusan skema dan deployment rinci masuk SRS. Hanya satu `SECTORS_API_KEY` dan satu `SECTORS_API_BASE_URL` di environment server; path `/news/`, `/companies/`, `/filings/` dan endpoint lain dikonfigurasi di kode berdasarkan jenis klaim. Key yang sempat terlihat pada screenshot harus dicabut/diganti sebelum dipakai.

**Objek data konseptual:** `Claim` (teks, waktu, status), `Evidence` (sumber, metrik, periode, nilai, URL, snapshot), `Receipt` (versi aturan, verdict, alasan, waktu). Jangan menyimpan data pengguna yang tidak diperlukan. Retensi dan kontrol akses untuk receipt publik ditentukan sebelum fitur berbagi diaktifkan.

**Efisiensi kredit:** batasi request pada endpoint relevan, gunakan `limit` kecil, cache hasil per simbol/periode dengan umur yang sesuai, dan log pemakaian kredit tanpa menyimpan key. Uji API secukupnya; jangan menelusuri seluruh emiten untuk satu klaim. Tanggal kedaluwarsa kredit tim yang terlihat di portal adalah 30 September 2026; verifikasi kembali di akun tim sebelum merencanakan demo setelah tanggal itu.

## 11. Risiko dan keputusan produk

| Risiko | Dampak | Respons produk |
| --- | --- | --- |
| Data Playground mock | Demo terlihat berhasil padahal tidak memakai data nyata | Tes terautentikasi di aplikasi dan bukti respons yang bisa diulang; label data demo saat pengembangan |
| API hanya meliputi kategori tertentu | Klaim umum tidak dapat diverifikasi | Batasi kategori MVP; tampilkan “di luar cakupan” atau “bukti belum cukup” |
| Berita memuat prediksi atau opini | Salah memberi verdict fakta | Pisahkan fakta, opini, dan proyeksi; berita menjadi bukti pemberitaan saja |
| Simbol, tanggal, mata uang, dan satuan berbeda | Kesimpulan keliru | Validasi dan normalisasi; minta klarifikasi bila ambigu |
| Berita baru namun data keuangan lama | Receipt tampak terkini padahal pembanding tidak sesuai | Tampilkan tanggal setiap bukti dan jangan gabungkan periode yang berbeda |
| Sumber asli tidak bisa dibuka | Jejak audit lemah | Labelkan link rusak/tidak publik dan turunkan status bila verifikasi bergantung pada link itu |
| Kebocoran API key atau habis kredit | Layanan gagal/biaya membengkak | Key server saja, rotasi, rate limit, cache, pesan gagal yang jelas |
| Jawaban AI melebihi bukti | Salah informasi finansial | Verdict deterministik, evidence IDs, pemeriksaan semua angka dan URL sebelum render |

## 12. Demo dan narasi kompetisi

Demo utama harus menunjukkan dua klaim berbeda dengan sumber nyata, misalnya satu klaim yang didukung dan satu klaim yang tidak cukup bukti atau bertentangan. Rekam input, langkah pengambilan data, receipt, serta klik menuju sumber. Tunjukkan pemakaian Sectors secara substantif melalui endpoint yang benar-benar bekerja dan jejak di repo, bukan panggilan dekoratif. Jangan menggunakan respons hardcoded sebagai seolah hasil live.

**Narasi 3 menit:** masalah investor muda (singkat) → satu klaim beredar → input BursaBukti → agent memilih bukti Sectors → receipt dan link → kasus batas ketika bukti tidak cukup → nilai bagi pengguna. Video teaser 1 menit diproduksi dari alur yang sama. Angka hasil pilot hanya disebut jika sudah diukur.

**Ketentuan relevan:** AI coding tools diperbolehkan tanpa disclosure wajib; kode dan repo harus berasal dari masa build yang sah; jangan memakai kode dari proyek terdahulu sebagai proyek ini; freeze setelah submit; repo publik bebas dari API key; produk tidak boleh memberi nasihat investasi atau mengeksekusi perdagangan. Sumber: [aturan hackathon resmi](https://hackathon.sectors.app/rules).

## 13. Rencana validasi dan tahap pekerjaan

### Validasi data dan teknis sebelum menetapkan SRS final

1. Rotasi API key yang pernah terekspos dan simpan key baru hanya di server.
2. Uji News Articles terautentikasi dengan `symbols=BBCA` atau `BBRI`; periksa URL request dan hasilnya. Uji respons ketika `symbols` tidak cocok atau kosong.
3. Uji Company Report/Company Quarterly Financials untuk satu emiten dan dua periode; catat field, unit, periode, tanggal pembaruan, dan apakah ada tautan dokumen.
4. Uji Daily Transaction Data untuk dua hari bursa; pastikan cara menghitung perubahan harga.
5. Uji Company Filings atau Corporate Actions hanya jika dipilih untuk demo; jangan menambah kategori tanpa sampel data memadai.
6. Simpan contoh respons **tanpa key** dan tabel pemetaan `jenis klaim → endpoint → field → perhitungan → status` di dokumen teknis SRS.

### Validasi pengguna

Siapkan 6–10 klaim: benar, salah, periode keliru, simbol ambigu, berita tanpa sumber primer, dan data yang tidak tersedia. Minta 5–8 investor ritel mencoba mencari bukti secara manual dan dengan prototype. Ukur waktu, kemampuan menunjuk sumber, pemahaman batas verdict, dan kesalahan tafsir. Catat feedback dan revisi label/status. Ini rancangan pengujian, belum hasil empiris.

### Tahapan rilis

- **M0 — Bukti kemampuan API:** dua kategori tervalidasi dengan respons nyata.
- **M1 — Alur inti:** input teks → klasifikasi → data Sectors → receipt tanpa database wajib.
- **M2 — Keandalan:** kasus ambigu/error, audit, cache, penyimpanan receipt, pengujian pengguna.
- **M3 — Submission:** repo publik bersih dari key, video teaser dan judging, problem statement, media post, lalu freeze sesuai aturan.

## 14. Keputusan terbuka untuk tim

| Pertanyaan | Pemilik keputusan | Tenggat logis |
| --- | --- | --- |
| Dua kategori klaim mana yang benar-benar didukung respons nyata? | Tim data/backend | Sebelum SRS final |
| Field dan periode laporan keuangan apa yang paling aman untuk demo? | Tim data + verifikator | Sebelum memilih contoh klaim |
| Adakah URL sumber asli yang dapat dibuka untuk tiap kategori? | Tim data + UX | Sebelum desain receipt final |
| Provider/model apa yang mengekstrak klaim paling konsisten? | Tim AI | Sebelum integrasi final |
| Apakah receipt perlu DB pada demo pertama? | Tim backend | Setelah alur stateless berjalan |
| Siapa yang menyetujui klaim contoh dan rubrik verdict? | Product owner + anggota reviewer | Sebelum rekaman demo |

## 15. Cara tim dan coding agent bekerja tanpa saling menimpa

**Dokumen ini adalah PRD: menjelaskan apa dan mengapa.** Simpan `README.md` untuk petunjuk menjalankan aplikasi dan orientasi repo; simpan `AGENTS.md` di root repo untuk aturan bagi coding agent; simpan `docs/TASKS.md` atau issue board untuk pemilik tugas dan status. File koordinasi tersebut boleh berada di repo; aturan lomba mengizinkan AI coding tools tanpa disclosure. Menghapus dokumen di akhir untuk menyamarkan riwayat AI tidak perlu dan tidak menghapus riwayat commit. Bersihkan dokumentasi hanya jika memang sudah tidak relevan, bukan untuk menyembunyikan penggunaan AI.

**Aturan kerja yang disarankan untuk `AGENTS.md` saat repo tersedia:**

- Baca `docs/PRD.md`, `docs/SRS.md`, dan `docs/TASKS.md` sebelum mengedit.
- Ambil hanya tugas dengan satu pemilik; tulis file yang akan disentuh dan kontrak input/output sebelum mulai.
- Pisahkan area kerja: UI/UX, integrasi Sectors, agent/verifier, database, dan QA. Perubahan kontrak API atau schema DB harus disepakati dulu.
- Buat branch per tugas; satu orang mengintegrasikan PR setelah melihat diff, menjalankan pemeriksaan relevan, dan menyelesaikan konflik.
- Jangan mengubah `.env.local`, mempublikasikan secret, membuat endpoint di luar allowlist, atau menghasilkan angka demo palsu.
- Setiap perubahan harus memperbarui `docs/TASKS.md` dengan status, file yang berubah, cara menguji, dan hambatan.
- Coding agent **tidak melakukan `git commit` atau `git push`**; anggota tim meninjau diff dan melakukannya sendiri.

**Format catatan perubahan setiap kali tim siap commit/push:**

```text
Tujuan: [fitur/bug]
Pemilik: [nama]
File berubah: [daftar]
Perilaku sebelum → sesudah: [ringkas]
Tes dan hasil: [perintah + hasil, atau uji manual]
Risiko/belum selesai: [ringkas]
Usulan pesan commit: feat: ... / fix: ... / docs: ...
```

Tuliskan catatan sebelum anggota tim membuat commit. Pesan commit harus menggambarkan perubahan sebenarnya; jangan membuat commit yang memberi kesan fitur telah bekerja bila masih memakai mock. Bila belum ada repo terhubung di workspace, dokumen ini **tidak melakukan commit atau push**.

## 16. Referensi produk dan data

- [Aturan resmi Sectors Hackathon 2026](https://hackathon.sectors.app/rules)
- [Sectors Financial API v2 — Getting Started](https://docs.sectors.app/get-started/v2/overview)
- [Companies Screener](https://docs.sectors.app/api-references/v2/indonesia/screener/companies)
- [News Articles](https://docs.sectors.app/api-references/v2/indonesia/news/news)
- [Company Filings](https://docs.sectors.app/api-references/v2/indonesia/news/filings)

**Langkah setelah dokumen ini:** uji dua kategori dengan key terautentikasi; finalkan kategori MVP; turunkan kebutuhan di atas menjadi SRS (schema, endpoint, validasi, error, security, test cases). PRD dan SRS harus diperbarui bila hasil API nyata membatalkan asumsi di dokumen ini.
