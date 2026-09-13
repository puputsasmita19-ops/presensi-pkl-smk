-- ==============================================================================
-- SKRIP DATABASE MYSQL LENGKAP - SISTEM MONITORING & PRESENSI PKL SMK
-- Dikonversi dari model data Firebase Firestore ke Relational Database (MySQL 8.0 / MariaDB)
-- Karakteristik: InnoDB, UTF8mb4, Foreign Key Constraint, Indexing, Data Awal (Seed)
-- ==============================================================================

-- Buat Database
CREATE DATABASE IF NOT EXISTS `db_presensi_pkl` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `db_presensi_pkl`;

-- Nonaktifkan pengecekan foreign key saat inisialisasi tabel
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABEL: users (Autentikasi & Akun Seluruh Role)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id_user` VARCHAR(50) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Admin', 'Guru Pembimbing', 'Siswa', 'DUDI') NOT NULL,
  `nama_lengkap` VARCHAR(150) NOT NULL,
  `nomor_wa` VARCHAR(25) NOT NULL,
  `id_dudi` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABEL: dudi (Mitra Industri / Tempat PKL)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `dudi`;
CREATE TABLE `dudi` (
  `id_dudi` VARCHAR(50) NOT NULL,
  `nama_instansi` VARCHAR(150) NOT NULL,
  `bidang` VARCHAR(100) NOT NULL,
  `alamat` TEXT NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `radius_meter` INT NOT NULL DEFAULT 100,
  `hari_kerja` JSON NOT NULL COMMENT 'Array JSON nama-nama hari kerja, contoh: ["Senin","Selasa","Rabu","Kamis","Jumat"]',
  `tipe_jadwal` ENUM('Reguler', 'Shift', 'Kondisional') NOT NULL DEFAULT 'Reguler',
  `jam_masuk_standar` VARCHAR(10) NOT NULL DEFAULT '08:00',
  `jam_pulang_standar` VARCHAR(10) NOT NULL DEFAULT '16:30',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_dudi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABEL: shift_kerja (Jadwal Shift Khusus per DUDI)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `shift_kerja`;
CREATE TABLE `shift_kerja` (
  `id_shift` VARCHAR(50) NOT NULL,
  `id_dudi` VARCHAR(50) NOT NULL,
  `nama_shift` VARCHAR(100) NOT NULL,
  `kode_shift` VARCHAR(20) DEFAULT NULL COMMENT 'PAGI, SIANG, MALAM, REGULER',
  `jam_masuk` VARCHAR(10) NOT NULL,
  `jam_pulang` VARCHAR(10) NOT NULL,
  `hari_khusus` JSON DEFAULT NULL COMMENT 'Array hari jika shift spesifik hari tertentu',
  `toleransi_keterlambatan_menit` INT DEFAULT 15,
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_shift`),
  INDEX `idx_shift_dudi` (`id_dudi`),
  CONSTRAINT `fk_shift_dudi` FOREIGN KEY (`id_dudi`) REFERENCES `dudi` (`id_dudi`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABEL: guru_pembimbing (Guru Supervisi Sekolah)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `guru_pembimbing`;
CREATE TABLE `guru_pembimbing` (
  `id_guru` VARCHAR(50) NOT NULL,
  `id_user` VARCHAR(50) NOT NULL,
  `nama_guru` VARCHAR(150) NOT NULL,
  `nip` VARCHAR(50) DEFAULT NULL,
  `siswa_bimbingan` TEXT NOT NULL COMMENT 'Rangkuman nama/keterangan siswa bimbingan',
  `nomor_wa` VARCHAR(25) NOT NULL,
  `jadwal_kunjungan` VARCHAR(150) NOT NULL COMMENT 'Jadwal rutin monitoring DUDI',
  `email` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_guru`),
  UNIQUE KEY `uq_guru_user` (`id_user`),
  CONSTRAINT `fk_guru_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABEL: siswa (Data Siswa Peserta PKL)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `siswa`;
CREATE TABLE `siswa` (
  `id_siswa` VARCHAR(50) NOT NULL,
  `id_user` VARCHAR(50) NOT NULL,
  `nama_lengkap` VARCHAR(150) NOT NULL,
  `nis` VARCHAR(30) NOT NULL UNIQUE,
  `kelas` VARCHAR(20) NOT NULL,
  `jurusan` VARCHAR(100) NOT NULL,
  `id_dudi` VARCHAR(50) NOT NULL,
  `id_guru_pembimbing` VARCHAR(50) NOT NULL,
  `nomor_wa` VARCHAR(25) NOT NULL,
  `nomor_wa_ortu` VARCHAR(25) NOT NULL,
  `foto_profil` LONGTEXT DEFAULT NULL COMMENT 'URL atau Base64 foto profil siswa',
  `alamat` TEXT DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_siswa`),
  UNIQUE KEY `uq_siswa_user` (`id_user`),
  INDEX `idx_siswa_dudi` (`id_dudi`),
  INDEX `idx_siswa_guru` (`id_guru_pembimbing`),
  CONSTRAINT `fk_siswa_user` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_siswa_dudi` FOREIGN KEY (`id_dudi`) REFERENCES `dudi` (`id_dudi`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_siswa_guru` FOREIGN KEY (`id_guru_pembimbing`) REFERENCES `guru_pembimbing` (`id_guru`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABEL: presensi (Data Absensi Selfie & Geotagging GPS Siswa)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `presensi`;
CREATE TABLE `presensi` (
  `id_presensi` VARCHAR(50) NOT NULL,
  `id_siswa` VARCHAR(50) NOT NULL,
  `tanggal` DATE NOT NULL,
  `hari` VARCHAR(20) DEFAULT NULL,
  `jam_masuk` TIME NOT NULL,
  `jam_pulang` TIME DEFAULT NULL,
  `status` ENUM('Hadir', 'Sakit', 'Izin', 'Alpa') NOT NULL DEFAULT 'Hadir',
  `foto_selfie` LONGTEXT NOT NULL COMMENT 'Base64 atau URL foto selfie bukti presensi',
  
  -- Geotagging Koordinat Saat Absen Masuk
  `latitude_absen` DECIMAL(10, 8) NOT NULL,
  `longitude_absen` DECIMAL(11, 8) NOT NULL,
  `jarak_meter` INT NOT NULL,
  `dalam_radius` TINYINT(1) NOT NULL DEFAULT 1,
  
  -- Info Shift & Status Waktu
  `id_shift` VARCHAR(50) DEFAULT NULL,
  `nama_shift` VARCHAR(100) DEFAULT NULL,
  `jadwal_masuk` VARCHAR(10) DEFAULT NULL,
  `jadwal_pulang` VARCHAR(10) DEFAULT NULL,
  `status_ketepatan` ENUM('Tepat Waktu', 'Terlambat', 'Tepat / Lebih Awal') DEFAULT 'Tepat Waktu',
  `keterangan` TEXT DEFAULT NULL,
  
  -- Verifikasi & Integrasi
  `notifikasi_wa_terkirim` TINYINT(1) DEFAULT 0,
  `is_offline_pending` TINYINT(1) DEFAULT 0,
  
  -- Persetujuan oleh Pembimbing DUDI
  `status_persetujuan_dudi` ENUM('Menunggu', 'Disetujui', 'Ditolak') DEFAULT 'Menunggu',
  `catatan_dudi` TEXT DEFAULT NULL,
  `disetujui_dudi_pada` DATETIME DEFAULT NULL,
  `nama_pembimbing_dudi` VARCHAR(150) DEFAULT NULL,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_presensi`),
  INDEX `idx_presensi_siswa_tgl` (`id_siswa`, `tanggal`),
  INDEX `idx_presensi_status` (`status`),
  CONSTRAINT `fk_presensi_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABEL: jurnal_harian (Logbook Kegiatan PKL Siswa & Validasi Dual-Role)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `jurnal_harian`;
CREATE TABLE `jurnal_harian` (
  `id_jurnal` VARCHAR(50) NOT NULL,
  `id_siswa` VARCHAR(50) NOT NULL,
  `tanggal` DATE NOT NULL,
  `deskripsi_kegiatan` TEXT NOT NULL,
  `kendala` TEXT NOT NULL,
  `solusi` TEXT DEFAULT NULL,
  
  -- Validasi Guru Pembimbing
  `status_validasi_guru` ENUM('Menunggu', 'Disetujui', 'Perlu Revisi') NOT NULL DEFAULT 'Menunggu',
  `catatan_guru` TEXT DEFAULT NULL,
  `validated_at` DATETIME DEFAULT NULL,
  `nama_guru_penilai` VARCHAR(150) DEFAULT NULL,
  
  -- Validasi Pembimbing DUDI
  `status_validasi_dudi` ENUM('Menunggu', 'Disetujui', 'Perlu Revisi') NOT NULL DEFAULT 'Menunggu',
  `catatan_dudi` TEXT DEFAULT NULL,
  `validated_dudi_at` DATETIME DEFAULT NULL,
  `nama_dudi_penilai` VARCHAR(150) DEFAULT NULL,
  
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_jurnal`),
  INDEX `idx_jurnal_siswa_tgl` (`id_siswa`, `tanggal`),
  CONSTRAINT `fk_jurnal_siswa` FOREIGN KEY (`id_siswa`) REFERENCES `siswa` (`id_siswa`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABEL: kunjungan_guru (Monitoring Lapangan & Supervisi Guru ke DUDI)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `kunjungan_guru`;
CREATE TABLE `kunjungan_guru` (
  `id_kunjungan` VARCHAR(50) NOT NULL,
  `id_guru` VARCHAR(50) NOT NULL,
  `nama_guru` VARCHAR(150) NOT NULL,
  `id_dudi` VARCHAR(50) NOT NULL,
  `nama_dudi` VARCHAR(150) NOT NULL,
  `tanggal` DATE NOT NULL,
  `jam_kunjungan` TIME NOT NULL,
  `tujuan_kunjungan` VARCHAR(255) NOT NULL,
  `catatan_evaluasi` TEXT NOT NULL,
  `foto_kunjungan` LONGTEXT NOT NULL COMMENT 'Foto geotagged kunjungan guru ke tempat DUDI',
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `jarak_meter` INT NOT NULL,
  `dalam_radius` TINYINT(1) NOT NULL DEFAULT 1,
  `siswa_dikunjungi` JSON NOT NULL COMMENT 'Array nama siswa yang ditemui pada kunjungan',
  `status_kunjungan` ENUM('Berlangsung', 'Selesai') NOT NULL DEFAULT 'Selesai',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_kunjungan`),
  INDEX `idx_kunjungan_guru` (`id_guru`),
  INDEX `idx_kunjungan_dudi` (`id_dudi`),
  CONSTRAINT `fk_kunjungan_guru` FOREIGN KEY (`id_guru`) REFERENCES `guru_pembimbing` (`id_guru`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_kunjungan_dudi` FOREIGN KEY (`id_dudi`) REFERENCES `dudi` (`id_dudi`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABEL: log_aktivitas (Audit Trail & Keamanan Sistem)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `log_aktivitas`;
CREATE TABLE `log_aktivitas` (
  `id_log` VARCHAR(50) NOT NULL,
  `waktu` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `kategori` ENUM('Autentikasi', 'Presensi', 'Jurnal', 'Master Data', 'Google Drive', 'WhatsApp', 'Sistem') NOT NULL,
  `aksi` VARCHAR(100) NOT NULL,
  `deskripsi` TEXT NOT NULL,
  `pengguna` VARCHAR(150) NOT NULL,
  `role` ENUM('Admin', 'Guru Pembimbing', 'Siswa', 'DUDI') NOT NULL,
  `status` ENUM('Sukses', 'Peringatan', 'Gagal', 'Info') NOT NULL DEFAULT 'Sukses',
  `ip_device` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id_log`),
  INDEX `idx_log_kategori` (`kategori`),
  INDEX `idx_log_waktu` (`waktu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. TABEL: konfigurasi_sistem (WhatsApp Gateway / Fonnte / Pengaturan)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `konfigurasi_sistem`;
CREATE TABLE `konfigurasi_sistem` (
  `id_config` INT NOT NULL AUTO_INCREMENT,
  `key_name` VARCHAR(50) NOT NULL UNIQUE,
  `key_value` TEXT NOT NULL,
  `deskripsi` VARCHAR(255) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_config`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Aktifkan kembali Foreign Key Checks
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- SEED DATA AWAL (Contoh Data Asli dari Sistem)
-- ==============================================================================

-- 1. Insert Konfigurasi WhatsApp Gateway Fonnte
INSERT INTO `konfigurasi_sistem` (`key_name`, `key_value`, `deskripsi`) VALUES
('fonnte_api_key', 'DEMO_FONNTE_TOKEN_12345', 'API Token Fonnte WhatsApp Gateway'),
('fonnte_sender_phone', '6281234567890', 'Nomor pengirim gateway'),
('auto_notify_parent_absence', '1', 'Kirim WA otomatis ke ortu jika absen/alpa'),
('auto_notify_checkin', '1', 'Kirim WA otomatis saat siswa berhasil check-in');

-- 2. Insert Users
INSERT INTO `users` (`id_user`, `username`, `password_hash`, `role`, `nama_lengkap`, `nomor_wa`, `id_dudi`) VALUES
('USR-ADMIN-01', 'admin', 'admin123', 'Admin', 'Budi Santoso, S.Kom (Koordinator PKL)', '081234567891', NULL),
('USR-GURU-01', 'guru_dewi', 'guru123', 'Guru Pembimbing', 'Dewi Lestari, M.Pd', '081234567892', NULL),
('USR-GURU-02', 'guru_arif', 'guru123', 'Guru Pembimbing', 'Arif Hidayat, S.T', '081234567893', NULL),
('USR-SISWA-01', 'siswa_reza', 'siswa123', 'Siswa', 'Reza Pratama Putra', '085712345601', NULL),
('USR-SISWA-02', 'siswa_anisa', 'siswa123', 'Siswa', 'Anisa Rahmawati', '085712345602', NULL),
('USR-SISWA-03', 'siswa_fajar', 'siswa123', 'Siswa', 'Fajar Nugraha', '085712345603', NULL),
('USR-DUDI-01', 'dudi_telkom', 'dudi123', 'DUDI', 'Hendra Wijaya (PT Telkom)', '081298765431', 'DUDI-01'),
('USR-DUDI-02', 'dudi_astra', 'dudi123', 'DUDI', 'Bambang Sudiro (Astra Motor)', '081298765432', 'DUDI-02');

-- 3. Insert DUDI
INSERT INTO `dudi` (`id_dudi`, `nama_instansi`, `bidang`, `alamat`, `latitude`, `longitude`, `radius_meter`, `hari_kerja`, `tipe_jadwal`, `jam_masuk_standar`, `jam_pulang_standar`) VALUES
('DUDI-01', 'PT Telkom Indonesia Witel Semarang', 'Telekomunikasi & Jaringan', 'Jl. Pahlawan No.10, Pleburan, Semarang Selatan, Kota Semarang', -6.99320000, 110.42080000, 150, '["Senin","Selasa","Rabu","Kamis","Jumat"]', 'Shift', '08:00', '16:30'),
('DUDI-02', 'PT Astra International Daihatsu', 'Otomotif & Manufaktur', 'Jl. Majapahit No.112, Gayamsari, Kota Semarang', -6.98560000, 110.44850000, 100, '["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"]', 'Reguler', '07:30', '16:00'),
('DUDI-03', 'Studio Animasi & Desain Kreasi Digital', 'Multimedia & Grafis', 'Jl. Kelud Raya No. 45, Gajahmungkur, Kota Semarang', -7.00840000, 110.40420000, 80, '["Senin","Selasa","Rabu","Kamis","Jumat"]', 'Kondisional', '08:30', '17:00');

-- 4. Insert Shift Kerja DUDI
INSERT INTO `shift_kerja` (`id_shift`, `id_dudi`, `nama_shift`, `kode_shift`, `jam_masuk`, `jam_pulang`, `hari_khusus`, `toleransi_keterlambatan_menit`, `keterangan`) VALUES
('SHF-01', 'DUDI-01', 'Shift 1 Pagi (Telkom)', 'PAGI', '08:00', '16:30', '["Senin","Selasa","Rabu","Kamis"]', 15, 'Shift pagi operasional jaringan NOC'),
('SHF-02', 'DUDI-01', 'Shift 2 Siang (Telkom)', 'SIANG', '13:00', '21:00', '["Senin","Selasa","Rabu","Kamis","Jumat"]', 15, 'Shift siang customer care & data center'),
('SHF-03', 'DUDI-01', 'Shift Jumat Khusus', 'REGULER', '07:30', '16:00', '["Jumat"]', 15, 'Jam pulang lebih awal untuk ibadah Jumat');

-- 5. Insert Guru Pembimbing
INSERT INTO `guru_pembimbing` (`id_guru`, `id_user`, `nama_guru`, `nip`, `siswa_bimbingan`, `nomor_wa`, `jadwal_kunjungan`, `email`) VALUES
('GURU-01', 'USR-GURU-01', 'Dewi Lestari, M.Pd', '198203152008012015', 'Reza Pratama Putra, Anisa Rahmawati', '081234567892', 'Selasa & Kamis (Minggu ke-2 dan ke-4)', 'dewi.lestari@smk.sch.id'),
('GURU-02', 'USR-GURU-02', 'Arif Hidayat, S.T', '197911042005011009', 'Fajar Nugraha', '081234567893', 'Rabu (Minggu ke-1 dan ke-3)', 'arif.hidayat@smk.sch.id');

-- 6. Insert Siswa
INSERT INTO `siswa` (`id_siswa`, `id_user`, `nama_lengkap`, `nis`, `kelas`, `jurusan`, `id_dudi`, `id_guru_pembimbing`, `nomor_wa`, `nomor_wa_ortu`, `foto_profil`, `alamat`, `email`) VALUES
('SISWA-01', 'USR-SISWA-01', 'Reza Pratama Putra', '22231001', 'XII TKJ 1', 'Teknik Komputer dan Jaringan', 'DUDI-01', 'GURU-01', '085712345601', '081298765401', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'Jl. Karangrejo No. 12, Banyumanik, Semarang', 'reza.pratama@siswa.smk.sch.id'),
('SISWA-02', 'USR-SISWA-02', 'Anisa Rahmawati', '22231002', 'XII RPL 2', 'Rekayasa Perangkat Lunak', 'DUDI-01', 'GURU-01', '085712345602', '081298765402', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'Jl. Menoreh Tengah No. 5, Sampangan, Semarang', 'anisa.rahmawati@siswa.smk.sch.id'),
('SISWA-03', 'USR-SISWA-03', 'Fajar Nugraha', '22231003', 'XII TKRO 1', 'Teknik Kendaraan Ringan Otomotif', 'DUDI-02', 'GURU-02', '085712345603', '081298765403', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Jl. Pedurungan Kidul No. 88, Semarang', 'fajar.nugraha@siswa.smk.sch.id');

-- 7. Insert Presensi Contoh
INSERT INTO `presensi` (`id_presensi`, `id_siswa`, `tanggal`, `hari`, `jam_masuk`, `jam_pulang`, `status`, `foto_selfie`, `latitude_absen`, `longitude_absen`, `jarak_meter`, `dalam_radius`, `nama_shift`, `jadwal_masuk`, `jadwal_pulang`, `status_ketepatan`, `status_persetujuan_dudi`, `nama_pembimbing_dudi`) VALUES
('PRS-20260910-01', 'SISWA-01', '2026-09-10', 'Kamis', '07:54:12', '16:35:00', 'Hadir', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200', -6.99321000, 110.42079000, 18, 1, 'Shift 1 Pagi (Telkom)', '08:00', '16:30', 'Tepat Waktu', 'Disetujui', 'Hendra Wijaya'),
('PRS-20260911-01', 'SISWA-01', '2026-09-11', 'Jumat', '07:48:30', '16:02:15', 'Hadir', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200', -6.99318000, 110.42081000, 22, 1, 'Shift Jumat Khusus', '07:30', '16:00', 'Tepat Waktu', 'Disetujui', 'Hendra Wijaya');

-- 8. Insert Jurnal Harian Contoh
INSERT INTO `jurnal_harian` (`id_jurnal`, `id_siswa`, `tanggal`, `deskripsi_kegiatan`, `kendala`, `solusi`, `status_validasi_guru`, `status_validasi_dudi`) VALUES
('JRN-01', 'SISWA-01', '2026-09-10', 'Melakukan terminasi kabel fiber optic pada OTB rack server lantai 3 dan pengujian redaman memakai OTDR.', 'Port OTB kotor dan konektor SC mengalami redaman tinggi melebihi batas standar -20dB.', 'Membersihkan ferrule dengan optical cleaner box dan mengganti pigtail baru hingga redaman stabil di -14dB.', 'Disetujui', 'Disetujui');
