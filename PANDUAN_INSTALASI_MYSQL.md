# PANDUAN LENGKAP INSTALASI DATABASE MYSQL UNTUK SISTEM PRESENSI PKL

Panduan ini menjelaskan langkah demi langkah cara migrasi atau pemasangan database MySQL/MariaDB dari skema Firestore ke database relasional SQL (MySQL) menggunakan file `database_mysql.sql`.

---

## 1. Persiapan Lingkungan (Prerequisites)

Pilih salah satu web/database server yang paling mudah Anda gunakan:
- **XAMPP** (Windows / macOS / Linux) - *Paling direkomendasikan untuk pemula*
- **Laragon** (Windows) - *Sangat cepat dan praktis*
- **Docker** (Semua OS)
- **MySQL Server Mandiri / MySQL Workbench**

---

## 2. Cara Impor Database Menggunakan phpMyAdmin (XAMPP / Laragon)

1. **Jalankan Apache & MySQL**:
   - Buka aplikasi **XAMPP Control Panel**.
   - Klik tombol **Start** pada modul **Apache** dan **MySQL** (pastikan warnanya berubah menjadi hijau).

2. **Buka phpMyAdmin**:
   - Buka browser (Chrome, Edge, Firefox) lalu buka alamat:
     ```
     http://localhost/phpmyadmin
     ```

3. **Buat Database Baru**:
   - Klik menu **"New"** (Baru) pada bilah samping kiri.
   - Masukkan nama database: `db_presensi_pkl`
   - Pilih Collation: `utf8mb4_unicode_ci`
   - Klik tombol **"Create"** (Buat).

4. **Impor Skrip SQL**:
   - Klik nama database `db_presensi_pkl` yang baru dibuat.
   - Klik tab **"Import"** (Impor) di menu atas.
   - Klik tombol **"Choose File"** (Pilih Berkas) lalu pilih file `database_mysql.sql` dari proyek ini.
   - Gulir ke bawah dan klik tombol **"Import"** / **"Go"** (Kirim).
   - Tunggu hingga muncul pesan centang hijau: *"Import has been successfully finished"*.

---

## 3. Cara Impor Melalui Command Line (Terminal / CMD)

Jika Anda menyukai terminal atau menggunakan Linux/VPS:

```bash
# 1. Masuk ke folder tempat file database_mysql.sql berada
cd /path/to/project

# 2. Login ke MySQL dan eksekusi file SQL secara langsung
mysql -u root -p < database_mysql.sql
```
*(Masukkan kata sandi root MySQL jika diminta, atau tekan Enter jika tanpa password default).*

---

## 4. Struktur Relasi Tabel Relasional (ERD Sederhana)

```
[users] (id_user, username, password_hash, role)
   │
   ├── 1:1 ──> [guru_pembimbing] (id_guru, id_user, nama_guru, nomor_wa)
   │                 │
   │                 └── 1:N ──┐ (Supervisi)
   │                           ▼
   ├── 1:1 ──> [siswa] (id_siswa, id_user, nama_lengkap, nis, id_dudi, id_guru_pembimbing)
   │             │             │
   │             │ (Magang)    ├── 1:N ──> [presensi] (Selfie, GPS lat/long, jam_masuk/pulang, DUDI approval)
   │             ▼             │
   └── 1:N ──> [dudi] <────────┴── 1:N ──> [jurnal_harian] (Deskripsi kerja, approval Guru & DUDI)
                 │
                 ├── 1:N ──> [shift_kerja] (Shift Pagi, Siang, Malam, Kondisional)
                 └── 1:N ──> [kunjungan_guru] (Supervisi GPS kunjungan guru ke DUDI)

[log_aktivitas]       -> Audit trail & keamanan sistem
[konfigurasi_sistem]  -> Konfigurasi WhatsApp gateway Fonnte
```

---

## 5. Menghubungkan Backend Node.js / Express ke MySQL

Jika Anda ingin menghubungkan aplikasi frontend/backend ke MySQL ini, Anda dapat menggunakan library `mysql2` atau ORM seperti `Prisma` atau `Drizzle`:

### A. Install Driver MySQL
```bash
npm install mysql2 dotenv
```

### B. Konfigurasi Environment (`.env`)
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=db_presensi_pkl
```

### C. Contoh Kode Koneksi Pool (`db.ts`):
```typescript
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'db_presensi_pkl',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Contoh Pengambilan Data Siswa Beserta DUDI & Guru (JOIN Relasional)
export async function getDaftarSiswaLengkap() {
  const [rows] = await pool.query(`
    SELECT 
      s.id_siswa,
      s.nama_lengkap,
      s.nis,
      s.kelas,
      s.jurusan,
      d.nama_instansi AS nama_dudi,
      d.alamat AS alamat_dudi,
      g.nama_guru AS nama_guru_pembimbing,
      s.nomor_wa,
      s.nomor_wa_ortu
    FROM siswa s
    JOIN dudi d ON s.id_dudi = d.id_dudi
    JOIN guru_pembimbing g ON s.id_guru_pembimbing = g.id_guru
    ORDER BY s.nama_lengkap ASC
  `);
  return rows;
}
```

---

## 6. Akun Pengguna Bawaan (Default Seed Users)

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
