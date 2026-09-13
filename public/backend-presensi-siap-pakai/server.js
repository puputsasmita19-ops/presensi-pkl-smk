const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Izinkan aplikasi React membaca data (CORS) & parsing payload JSON hingga 25mb untuk foto selfie
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ====================================================================
// 1. ENDPOINT: Cek Status Server
// ====================================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', pesan: 'Server Backend Presensi PKL MySQL Siap Digunakan!' });
});

// ====================================================================
// 2. ENDPOINT: Login Pengguna (Siswa, Guru, DUDI, Admin)
// ====================================================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const [rows] = await db.query(
      'SELECT id_user, username, role, nama_lengkap, nomor_wa, id_dudi FROM users WHERE username = ? AND password_hash = ?',
      [username, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ sukses: false, pesan: 'Username atau Password salah!' });
    }

    const user = rows[0];
    res.json({
      sukses: true,
      pesan: 'Login berhasil!',
      data: user,
    });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// ====================================================================
// 3. ENDPOINT: Profil Lengkap Siswa (JOIN ke DUDI & Guru Pembimbing)
// ====================================================================
app.get('/api/siswa/profil/:id_user', async (req, res) => {
  try {
    const { id_user } = req.params;

    const [rows] = await db.query(
      `SELECT 
        s.*, 
        d.nama_instansi AS nama_dudi, 
        d.alamat AS alamat_dudi,
        d.latitude AS lat_dudi, 
        d.longitude AS long_dudi, 
        d.radius_meter,
        d.jam_masuk_standar,
        d.jam_pulang_standar,
        g.nama_guru AS nama_guru_pembimbing,
        g.nomor_wa AS wa_guru
      FROM siswa s
      JOIN dudi d ON s.id_dudi = d.id_dudi
      JOIN guru_pembimbing g ON s.id_guru_pembimbing = g.id_guru
      WHERE s.id_user = ?`,
      [id_user]
    );

    if (rows.length === 0) {
      return res.status(404).json({ sukses: false, pesan: 'Data siswa tidak ditemukan' });
    }

    res.json({ sukses: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// ====================================================================
// 4. ENDPOINT: Simpan Presensi Masuk (Selfie + Geotagging GPS)
// ====================================================================
app.post('/api/presensi/masuk', async (req, res) => {
  try {
    const {
      id_siswa,
      tanggal,
      hari,
      jam_masuk,
      status,
      foto_selfie,
      latitude_absen,
      longitude_absen,
      jarak_meter,
      dalam_radius,
      nama_shift,
      status_ketepatan,
      keterangan
    } = req.body;

    const id_presensi = `PRS-${Date.now()}`;

    await db.query(
      `INSERT INTO presensi (
        id_presensi, id_siswa, tanggal, hari, jam_masuk, status, 
        foto_selfie, latitude_absen, longitude_absen, jarak_meter, 
        dalam_radius, nama_shift, status_ketepatan, keterangan,
        status_persetujuan_dudi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Menunggu')`,
      [
        id_presensi,
        id_siswa,
        tanggal,
        hari,
        jam_masuk,
        status,
        foto_selfie,
        latitude_absen,
        longitude_absen,
        jarak_meter,
        dalam_radius ? 1 : 0,
        nama_shift || null,
        status_ketepatan || 'Tepat Waktu',
        keterangan || null
      ]
    );

    res.json({ sukses: true, pesan: 'Presensi berhasil dicatat!', id_presensi });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// ====================================================================
// 5. ENDPOINT: Riwayat Presensi Siswa
// ====================================================================
app.get('/api/presensi/riwayat/:id_siswa', async (req, res) => {
  try {
    const { id_siswa } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM presensi WHERE id_siswa = ? ORDER BY tanggal DESC, jam_masuk DESC',
      [id_siswa]
    );
    res.json({ sukses: true, data: rows });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// ====================================================================
// 6. ENDPOINT: Simpan Jurnal Harian Siswa
// ====================================================================
app.post('/api/jurnal/tambah', async (req, res) => {
  try {
    const { id_siswa, tanggal, deskripsi_kegiatan, kendala, solusi } = req.body;
    const id_jurnal = `JRN-${Date.now()}`;

    await db.query(
      `INSERT INTO jurnal_harian (
        id_jurnal, id_siswa, tanggal, deskripsi_kegiatan, kendala, solusi, 
        status_validasi_guru, status_validasi_dudi
      ) VALUES (?, ?, ?, ?, ?, ?, 'Menunggu', 'Menunggu')`,
      [id_jurnal, id_siswa, tanggal, deskripsi_kegiatan, kendala, solusi]
    );

    res.json({ sukses: true, pesan: 'Jurnal harian berhasil disimpan!', id_jurnal });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// ====================================================================
// 7. ENDPOINT: Riwayat Jurnal Siswa
// ====================================================================
app.get('/api/jurnal/riwayat/:id_siswa', async (req, res) => {
  try {
    const { id_siswa } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM jurnal_harian WHERE id_siswa = ? ORDER BY tanggal DESC',
      [id_siswa]
    );
    res.json({ sukses: true, data: rows });
  } catch (error) {
    res.status(500).json({ sukses: false, pesan: error.message });
  }
});

// Jalankan Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 SERVER BACKEND AKTIF DI: http://localhost:${PORT}`);
  console.log('   Tekan Ctrl + C di jendela ini untuk mematikan server.');
  console.log('====================================================');
});
