# Aturan Kerja Tim & Panduan Agen AI (AGENTS.md)

Dokumen ini memuat aturan kerja dan protokol kolaborasi bagi seluruh pengembang dan agen AI yang bekerja pada repositori **BursaBukti**.

---

## 1. Wajib Membaca PRD Sebelum Mengedit
- Sebelum merancang fitur, menulis kode, atau melakukan refactoring, wajib membaca dan memahami dokumen [docs/PRD.md](file:///Users/macbook/BursaBukti/docs/PRD.md).
- Pastikan setiap perubahan selaras dengan batasan ruang lingkup (scope) MVP dan janji produk yang telah disepakati.

## 2. Hormati Area Kerja & Hindari Menimpa Pekerjaan Anggota Lain
- Bekerjalah pada modul atau file yang sesuai dengan tugas/tiket masing-masing.
- Hindari mengubah atau menimpa (overwrite) struktur atau logika pada area kerja rekan tim lain tanpa koordinasi atau konfirmasi terlebih dahulu.
- Jaga konsistensi antarmuka antarmodul (interface contract).

## 3. Jangan Menaruh Kredensial / Rahasia (Secrets) di Kode
- **DILARANG KERAS** menyisipkan API Key, secret token, atau kredensial nyata apa pun ke dalam berkas sumber kode atau berkas konfigurasi publik.
- Gunakan file konfigurasi lokal `.env.local` untuk menyimpan variabel rahasia.
- Selalu periksa `.env.example` untuk memastikan hanya nama variabel dan nilai placeholder yang tertera.

## 4. Dilarang Melakukan Commit atau Push Otomatis
- Agen AI maupun script otomasi **TIDAK BOLEH** menjalankan perintah `git commit` atau `git push` secara otomatis.
- Seluruh perubahan kode harus diserahkan kepada pengguna/developer manusia untuk ditinjau (*code review*) dan di-commit secara mandiri.

## 5. Disiplin Pengembangan Bertahap (No Fake Data & No Premature Implementation)
- Jangan mengarang data tiruan (*hallucinated mock API data*) yang tidak berdasar pada spesifikasi resmi.
- Jangan membuat dokumen SRS placeholder seolah sudah berstatus final.
- Jangan mengimplementasikan logika verifikasi sebelum dokumen spesifikasi teknis (SRS) selesai dan disepakati.
