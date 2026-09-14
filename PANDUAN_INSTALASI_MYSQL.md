# PANDUAN LENGKAP INSTALASI DATABASE MYSQL & HOSTING VERCEL UNTUK SISTEM PRESENSI PKL

Panduan ini menjelaskan langkah demi langkah cara menghubungkan database MySQL/TiDB Cloud dan menjalankan aplikasi di **Google AI Studio**, **Server Lokal / Container**, maupun saat di-deploy ke **GitHub & Vercel**.

---

## 1. Menjalankan di Vercel Hosting (Serverless Architecture)

Aplikasi ini sudah dilengkapi dengan **Vercel Serverless Function** (`/api/index.ts`) dan routing otomatis (`vercel.json`), sehingga backend API dan koneksi database MySQL akan langsung bekerja ketika di-hosting di Vercel.

### Langkah-langkah Deployment ke Vercel:

1. **Push Proyek ke GitHub**:
   ```bash
   git add .
   git commit -m "Deploy Sistem Presensi PKL with MySQL"
   git push origin main
   ```

2. **Impor Proyek ke Vercel**:
   - Buka [vercel.com](https://vercel.com) dan login.
   - Klik **"Add New"** &rarr; **"Project"**, lalu pilih repository GitHub Anda.
   - Framework Preset: **Vite** (otomatis terdeteksi).

3. **Atur Environment Variables di Vercel**:
   - Sebelum atau sesudah deploy, buka tab **Settings** &rarr; **Environment Variables** pada proyek Vercel Anda.
   - Tambahkan variabel berikut:
     - `MYSQL_HOST` : Host database (misal: `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` atau host MySQL Anda)
     - `MYSQL_PORT` : `4000` (TiDB) atau `3306` (MySQL standar)
     - `MYSQL_USER` : Username database Anda
     - `MYSQL_PASSWORD` : Password database Anda
     - `MYSQL_DATABASE` : `db_presensi_pkl`
     - `MYSQL_SSL` : `true` (wajib `true` untuk TiDB Cloud / database cloud)
   - *Alternatif:* Anda juga dapat memasukkan satu variabel `DATABASE_URL=mysql://user:pass@host:4000/db_presensi_pkl?ssl={"rejectUnauthorized":true}`.

4. **Deploy / Redeploy**:
   - Klik **Deploy** atau lakukan **Redeploy**.
   - Selesai! Seluruh endpoint `/api/presensi`, `/api/siswa`, `/api/dudi`, `/api/jurnal`, `/api/kunjungan`, dan `/api/db/status` akan berjalan mulus di serverless Vercel dan seluruh tabel otomatis terinisialisasi.

---

## 2. Pilihan Database MySQL Online Gratis (TiDB Cloud)

Jika Anda ingin database MySQL online yang dapat diakses oleh Vercel tanpa perlu setup VPS sendiri, gunakan **TiDB Cloud Serverless** (gratis selamanya):

1. Buka [tidbcloud.com](https://tidbcloud.com) dan buat akun gratis.
2. Buat cluster **Serverless** (pilih region terdekat misal `ap-southeast-1` Singapura).
3. Klik tombol **"Connect"**, pilih **MySQL Client / General Connection**.
4. Dapatkan kredensial **Host**, **Port (4000)**, **User**, dan **Password**.
5. Masukkan ke file `.env` lokal atau ke Vercel Environment Variables.

---

## 3. Cara Impor Database Lokal Menggunakan phpMyAdmin (XAMPP / Laragon)

1. **Jalankan Apache & MySQL**:
   - Buka aplikasi **XAMPP Control Panel** / **Laragon**.
   - Klik tombol **Start** pada modul Apache dan MySQL.

2. **Buka phpMyAdmin**:
   - Buka browser lalu kunjungi: `http://localhost/phpmyadmin`

3. **Buat Database Baru**:
   - Klik menu **"New"** (Baru).
   - Masukkan nama database: `db_presensi_pkl`
   - Pilih Collation: `utf8mb4_unicode_ci` lalu klik **"Create"**.

4. **Impor Skrip SQL**:
   - Klik nama database `db_presensi_pkl`.
   - Klik tab **"Import"** di menu atas.
   - Pilih file `database_mysql.sql` dari proyek ini lalu klik **"Go"** / **"Import"**.

---

## 4. Struktur Relasi Tabel Relasional (ERD)

```
[users] (id_user, username, password_hash, role)
   │
   ├── 1:1 ──> [guru] (id_guru, id_user, nama_guru, nomor_wa)
   │             │
   │             └── 1:N ──┐ (Supervisi)
   │                       ▼
   ├── 1:1 ──> [siswa] (id_siswa, id_user, nama_lengkap, nis, id_dudi, id_guru_pembimbing)
   │             │         │
   │             │         ├── 1:N ──> [presensi] (Selfie, GPS lat/long, jam_masuk/pulang, DUDI approval)
   │             ▼         │
   └── 1:N ──> [dudi] <────┴── 1:N ──> [jurnal] (Deskripsi kerja, approval Guru & DUDI)
                 │
                 └── 1:N ──> [kunjungan] (Supervisi GPS kunjungan guru ke DUDI)
```

---

## 5. Akun Pengguna Bawaan (Default Seed Users)

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Koordinator PKL Sekolah |
| **Guru Pembimbing** | `guru_dewi` | `guru123` | Guru Pembimbing TKJ & RPL |
| **Guru Pembimbing** | `guru_arif` | `guru123` | Guru Pembimbing TKRO |
| **Siswa** | `siswa_reza` | `siswa123` | Siswa XII TKJ 1 (PT Telkom) |
| **Siswa** | `siswa_anisa` | `siswa123` | Siswa XII RPL 2 (PT Telkom) |
| **Siswa** | `siswa_fajar` | `siswa123` | Siswa XII TKRO 1 (Astra Motor) |
| **DUDI** | `dudi_telkom` | `dudi123` | Pembimbing Industri Telkom |
| **DUDI** | `dudi_astra` | `dudi123` | Pembimbing Industri Astra |
