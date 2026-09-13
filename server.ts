import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Helper lazy MySQL connection pool
let pool: mysql.Pool | null = null;

function getDbPool(): mysql.Pool | null {
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const database = process.env.MYSQL_DATABASE;

  if (!host || !user || !database) {
    return null;
  }

  if (!pool) {
    try {
      const isSSL = process.env.MYSQL_SSL === "true" || process.env.MYSQL_SSL === "1";
      pool = mysql.createPool({
        host,
        user,
        password: process.env.MYSQL_PASSWORD || "",
        database,
        port: Number(process.env.MYSQL_PORT) || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ssl: isSSL ? { rejectUnauthorized: false } : undefined,
      });
    } catch (err) {
      console.error("Gagal membuat koneksi pool MySQL:", err);
      pool = null;
    }
  }

  return pool;
}

// Inisialisasi tabel otomatis jika database terhubung
async function initTablesIfConnected() {
  const db = getDbPool();
  if (!db) return;

  try {
    // Tabel Siswa
    await db.query(`
      CREATE TABLE IF NOT EXISTS siswa (
        id_siswa VARCHAR(100) PRIMARY KEY,
        id_user VARCHAR(100),
        nama_lengkap VARCHAR(255) NOT NULL,
        nis VARCHAR(50) NOT NULL UNIQUE,
        kelas VARCHAR(100),
        jurusan VARCHAR(100),
        id_dudi VARCHAR(100),
        id_guru_pembimbing VARCHAR(100),
        nomor_wa VARCHAR(50),
        nomor_wa_ortu VARCHAR(50),
        alamat TEXT,
        email VARCHAR(150),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabel DUDI
    await db.query(`
      CREATE TABLE IF NOT EXISTS dudi (
        id_dudi VARCHAR(100) PRIMARY KEY,
        nama_instansi VARCHAR(255) NOT NULL,
        bidang VARCHAR(150),
        alamat TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        radius_meter INT DEFAULT 100,
        hari_kerja TEXT,
        tipe_jadwal VARCHAR(50) DEFAULT 'Reguler',
        daftar_shift JSON,
        jam_masuk_standar VARCHAR(20) DEFAULT '08:00',
        jam_pulang_standar VARCHAR(20) DEFAULT '16:30',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabel Guru Pembimbing
    await db.query(`
      CREATE TABLE IF NOT EXISTS guru (
        id_guru VARCHAR(100) PRIMARY KEY,
        id_user VARCHAR(100),
        nama_guru VARCHAR(255) NOT NULL,
        siswa_bimbingan TEXT,
        nip VARCHAR(50),
        nomor_wa VARCHAR(50),
        jadwal_kunjungan TEXT,
        email VARCHAR(150),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabel Presensi
    await db.query(`
      CREATE TABLE IF NOT EXISTS presensi (
        id_presensi VARCHAR(100) PRIMARY KEY,
        id_siswa VARCHAR(100) NOT NULL,
        tanggal DATE NOT NULL,
        hari VARCHAR(20),
        jam_masuk TIME NOT NULL,
        jam_pulang TIME,
        status VARCHAR(50) NOT NULL,
        foto_selfie LONGTEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        jarak_meter INT,
        dalam_radius TINYINT(1) DEFAULT 1,
        id_shift VARCHAR(100),
        nama_shift VARCHAR(100),
        status_ketepatan VARCHAR(50),
        keterangan TEXT,
        status_persetujuan_dudi VARCHAR(50) DEFAULT 'Menunggu',
        catatan_dudi TEXT,
        disetujui_dudi_pada DATETIME,
        nama_pembimbing_dudi VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabel Jurnal Harian
    await db.query(`
      CREATE TABLE IF NOT EXISTS jurnal (
        id_jurnal VARCHAR(100) PRIMARY KEY,
        id_siswa VARCHAR(100) NOT NULL,
        tanggal DATE NOT NULL,
        deskripsi_kegiatan LONGTEXT NOT NULL,
        kendala TEXT,
        solusi TEXT,
        status_validasi_guru VARCHAR(50) DEFAULT 'Menunggu',
        catatan_guru TEXT,
        validated_at DATETIME,
        nama_guru_penilai VARCHAR(255),
        status_validasi_dudi VARCHAR(50) DEFAULT 'Menunggu',
        catatan_dudi TEXT,
        validated_dudi_at DATETIME,
        nama_dudi_penilai VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tabel Users (Akun Login)
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id_user VARCHAR(100) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        nama_lengkap VARCHAR(255) NOT NULL,
        nomor_wa VARCHAR(50),
        id_dudi VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log("Status MySQL: Tabel database PKL siap & terverifikasi.");
  } catch (e: any) {
    console.error("Gagal inisialisasi tabel MySQL:", e.message);
  }
}

// ---------------------- API ROUTES ----------------------

// 1. Status Koneksi MySQL / TiDB Cloud
app.get("/api/db/status", async (req, res) => {
  const isConfigured = Boolean(process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE);
  if (!isConfigured) {
    return res.json({
      connected: false,
      configured: false,
      isTiDB: false,
      message: "Konfigurasi MySQL belum diatur di .env (MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE)",
    });
  }

  const db = getDbPool();
  if (!db) {
    return res.json({
      connected: false,
      configured: true,
      isTiDB: Boolean(process.env.MYSQL_HOST?.includes("tidbcloud") || process.env.MYSQL_PORT === "4000"),
      message: "Gagal membuat pool koneksi MySQL",
    });
  }

  try {
    const start = Date.now();
    const [rows]: any = await db.query("SELECT 1 AS connected, DATABASE() as db_name, VERSION() as version");
    const latencyMs = Date.now() - start;

    let tables: string[] = [];
    try {
      const [tableRows]: any = await db.query("SHOW TABLES");
      tables = tableRows.map((tr: any) => Object.values(tr)[0]);
    } catch {}

    const isTiDB = Boolean(
      process.env.MYSQL_HOST?.includes("tidbcloud") ||
      process.env.MYSQL_PORT === "4000" ||
      String(rows[0]?.version || "").toLowerCase().includes("tidb")
    );

    return res.json({
      connected: true,
      configured: true,
      database: rows[0]?.db_name || process.env.MYSQL_DATABASE,
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT) || 3306,
      ssl: process.env.MYSQL_SSL === "true" || process.env.MYSQL_SSL === "1",
      latencyMs,
      tables,
      isTiDB,
      version: rows[0]?.version || "MySQL 8.x Compatible",
      message: isTiDB
        ? "Terhubung aktif ke TiDB Cloud Serverless Distributed SQL"
        : "Terhubung aktif ke database MySQL Online",
    });
  } catch (error: any) {
    return res.status(500).json({
      connected: false,
      configured: true,
      isTiDB: Boolean(process.env.MYSQL_HOST?.includes("tidbcloud") || process.env.MYSQL_PORT === "4000"),
      message: "Gagal menyambung ke MySQL: " + error.message,
    });
  }
});

// Endpoint Mass Sync: Mengunggah data lokal ke MySQL sekaligus
app.post("/api/db/sync-all", async (req, res) => {
  const db = getDbPool();
  if (!db) {
    return res.status(503).json({ error: "MySQL belum terhubung. Konfigurasi kredensial terlebih dahulu." });
  }

  try {
    const { siswa = [], dudi = [], presensi = [], jurnal = [] } = req.body;
    let syncedCounts = { siswa: 0, dudi: 0, presensi: 0, jurnal: 0 };

    // 1. Sync DUDI
    for (const d of dudi) {
      if (!d.id_dudi || !d.nama_instansi) continue;
      await db.execute(
        `INSERT INTO dudi (
          id_dudi, nama_instansi, bidang, alamat, latitude, longitude,
          radius_meter, hari_kerja, tipe_jadwal, daftar_shift, jam_masuk_standar, jam_pulang_standar
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nama_instansi = VALUES(nama_instansi),
          bidang = VALUES(bidang),
          alamat = VALUES(alamat),
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          radius_meter = VALUES(radius_meter),
          hari_kerja = VALUES(hari_kerja),
          tipe_jadwal = VALUES(tipe_jadwal),
          daftar_shift = VALUES(daftar_shift),
          jam_masuk_standar = VALUES(jam_masuk_standar),
          jam_pulang_standar = VALUES(jam_pulang_standar)`,
        [
          d.id_dudi,
          d.nama_instansi,
          d.bidang || "",
          d.alamat || "",
          d.koordinat_lokasi?.latitude || 0,
          d.koordinat_lokasi?.longitude || 0,
          d.radius_meter || 100,
          JSON.stringify(d.hari_kerja || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]),
          d.tipe_jadwal || "Reguler",
          JSON.stringify(d.daftar_shift || []),
          d.jam_masuk_standar || "08:00",
          d.jam_pulang_standar || "16:30",
        ]
      );
      syncedCounts.dudi++;
    }

    // 2. Sync Siswa
    for (const s of siswa) {
      if (!s.id_siswa || !s.nama_lengkap || !s.nis) continue;
      await db.execute(
        `INSERT INTO siswa (
          id_siswa, id_user, nama_lengkap, nis, kelas, jurusan,
          id_dudi, id_guru_pembimbing, nomor_wa, nomor_wa_ortu, alamat, email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nama_lengkap = VALUES(nama_lengkap),
          kelas = VALUES(kelas),
          jurusan = VALUES(jurusan),
          id_dudi = VALUES(id_dudi),
          id_guru_pembimbing = VALUES(id_guru_pembimbing),
          nomor_wa = VALUES(nomor_wa),
          nomor_wa_ortu = VALUES(nomor_wa_ortu),
          alamat = VALUES(alamat),
          email = VALUES(email)`,
        [
          s.id_siswa,
          s.id_user || "",
          s.nama_lengkap,
          s.nis,
          s.kelas || "",
          s.jurusan || "",
          s.id_dudi || "",
          s.id_guru_pembimbing || "",
          s.nomor_wa || "",
          s.nomor_wa_ortu || "",
          s.alamat || "",
          s.email || "",
        ]
      );
      syncedCounts.siswa++;
    }

    // 3. Sync Presensi
    for (const p of presensi) {
      if (!p.id_presensi || !p.id_siswa || !p.tanggal) continue;
      await db.execute(
        `INSERT INTO presensi (
          id_presensi, id_siswa, tanggal, hari, jam_masuk, jam_pulang, status,
          foto_selfie, latitude, longitude, jarak_meter, dalam_radius,
          id_shift, nama_shift, status_ketepatan, keterangan,
          status_persetujuan_dudi, catatan_dudi, disetujui_dudi_pada, nama_pembimbing_dudi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          jam_pulang = VALUES(jam_pulang),
          status = VALUES(status),
          foto_selfie = VALUES(foto_selfie),
          status_ketepatan = VALUES(status_ketepatan),
          keterangan = VALUES(keterangan),
          status_persetujuan_dudi = VALUES(status_persetujuan_dudi),
          catatan_dudi = VALUES(catatan_dudi),
          disetujui_dudi_pada = VALUES(disetujui_dudi_pada),
          nama_pembimbing_dudi = VALUES(nama_pembimbing_dudi)`,
        [
          p.id_presensi,
          p.id_siswa,
          p.tanggal,
          p.hari || "",
          p.jam_masuk || "08:00",
          p.jam_pulang || null,
          p.status || "Hadir Tepat Waktu",
          p.foto_selfie || "",
          p.koordinat_absen?.latitude || 0,
          p.koordinat_absen?.longitude || 0,
          p.koordinat_absen?.jarak_meter || 0,
          p.koordinat_absen?.dalam_radius ? 1 : 0,
          p.id_shift || null,
          p.nama_shift || null,
          p.status_ketepatan || null,
          p.keterangan || null,
          p.status_persetujuan_dudi || "Menunggu",
          p.catatan_dudi || null,
          p.disetujui_dudi_pada || null,
          p.nama_pembimbing_dudi || null,
        ]
      );
      syncedCounts.presensi++;
    }

    // 4. Sync Jurnal
    for (const j of jurnal) {
      if (!j.id_jurnal || !j.id_siswa || !j.tanggal) continue;
      await db.execute(
        `INSERT INTO jurnal (
          id_jurnal, id_siswa, tanggal, deskripsi_kegiatan, kendala, solusi,
          status_validasi_guru, catatan_guru, validated_at, nama_guru_penilai,
          status_validasi_dudi, catatan_dudi, validated_dudi_at, nama_dudi_penilai
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          deskripsi_kegiatan = VALUES(deskripsi_kegiatan),
          kendala = VALUES(kendala),
          solusi = VALUES(solusi),
          status_validasi_guru = VALUES(status_validasi_guru),
          catatan_guru = VALUES(catatan_guru),
          validated_at = VALUES(validated_at),
          nama_guru_penilai = VALUES(nama_guru_penilai),
          status_validasi_dudi = VALUES(status_validasi_dudi),
          catatan_dudi = VALUES(catatan_dudi),
          validated_dudi_at = VALUES(validated_dudi_at),
          nama_dudi_penilai = VALUES(nama_dudi_penilai)`,
        [
          j.id_jurnal,
          j.id_siswa,
          j.tanggal,
          j.deskripsi_kegiatan || "",
          j.kendala || "",
          j.solusi || "",
          j.status_validasi_guru || "Menunggu",
          j.catatan_guru || null,
          j.validated_at || null,
          j.nama_guru_penilai || null,
          j.status_validasi_dudi || "Menunggu",
          j.catatan_dudi || null,
          j.validated_dudi_at || null,
          j.nama_dudi_penilai || null,
        ]
      );
      syncedCounts.jurnal++;
    }

    res.json({
      success: true,
      message: "Sinkronisasi massal ke database MySQL berhasil.",
      syncedCounts,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Gagal sinkronisasi data: " + err.message });
  }
});

// 2. SISWA: GET & POST
app.get("/api/siswa", async (req, res) => {
  const db = getDbPool();
  if (!db) {
    return res.status(503).json({ error: "MySQL belum terhubung. Periksa konfigurasi .env" });
  }

  try {
    const [rows]: any = await db.query("SELECT * FROM siswa ORDER BY nama_lengkap ASC");
    const formatted = rows.map((r: any) => ({
      id_siswa: r.id_siswa,
      id_user: r.id_user || "",
      nama_lengkap: r.nama_lengkap,
      nis: r.nis,
      kelas: r.kelas || "",
      jurusan: r.jurusan || "",
      id_dudi: r.id_dudi || "",
      id_guru_pembimbing: r.id_guru_pembimbing || "",
      nomor_wa: r.nomor_wa || "",
      nomor_wa_ortu: r.nomor_wa_ortu || "",
      alamat: r.alamat || "",
      email: r.email || "",
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/siswa", async (req, res) => {
  const db = getDbPool();
  if (!db) {
    return res.status(503).json({ error: "MySQL belum terhubung. Periksa konfigurasi .env" });
  }

  try {
    const s = req.body;
    if (!s.id_siswa || !s.nama_lengkap || !s.nis) {
      return res.status(400).json({ error: "id_siswa, nama_lengkap, dan nis wajib diisi." });
    }

    const query = `
      INSERT INTO siswa (
        id_siswa, id_user, nama_lengkap, nis, kelas, jurusan,
        id_dudi, id_guru_pembimbing, nomor_wa, nomor_wa_ortu, alamat, email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        id_user = VALUES(id_user),
        nama_lengkap = VALUES(nama_lengkap),
        kelas = VALUES(kelas),
        jurusan = VALUES(jurusan),
        id_dudi = VALUES(id_dudi),
        id_guru_pembimbing = VALUES(id_guru_pembimbing),
        nomor_wa = VALUES(nomor_wa),
        nomor_wa_ortu = VALUES(nomor_wa_ortu),
        alamat = VALUES(alamat),
        email = VALUES(email)
    `;

    await db.execute(query, [
      s.id_siswa,
      s.id_user || "",
      s.nama_lengkap,
      s.nis,
      s.kelas || "",
      s.jurusan || "",
      s.id_dudi || "",
      s.id_guru_pembimbing || "",
      s.nomor_wa || "",
      s.nomor_wa_ortu || "",
      s.alamat || "",
      s.email || "",
    ]);

    res.json({ success: true, message: "Data siswa berhasil disimpan ke MySQL" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/siswa/:id", async (req, res) => {
  const db = getDbPool();
  if (!db) return res.status(503).json({ error: "MySQL belum terhubung." });

  try {
    await db.execute("DELETE FROM siswa WHERE id_siswa = ?", [req.params.id]);
    res.json({ success: true, message: "Siswa berhasil dihapus dari MySQL" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DUDI: GET & POST
app.get("/api/dudi", async (req, res) => {
  const db = getDbPool();
  if (!db) return res.status(503).json({ error: "MySQL belum terhubung." });

  try {
    const [rows]: any = await db.query("SELECT * FROM dudi ORDER BY nama_instansi ASC");
    const formatted = rows.map((r: any) => ({
      id_dudi: r.id_dudi,
      nama_instansi: r.nama_instansi,
      bidang: r.bidang || "",
      alamat: r.alamat || "",
      koordinat_lokasi: {
        latitude: parseFloat(r.latitude) || -6.2,
        longitude: parseFloat(r.longitude) || 106.816666,
      },
      radius_meter: r.radius_meter || 100,
      hari_kerja: r.hari_kerja ? JSON.parse(r.hari_kerja) : ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"],
      tipe_jadwal: r.tipe_jadwal || "Reguler",
      daftar_shift: r.daftar_shift ? (typeof r.daftar_shift === "string" ? JSON.parse(r.daftar_shift) : r.daftar_shift) : [],
      jam_masuk_standar: r.jam_masuk_standar || "08:00",
      jam_pulang_standar: r.jam_pulang_standar || "16:30",
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/dudi", async (req, res) => {
  const db = getDbPool();
  if (!db) return res.status(503).json({ error: "MySQL belum terhubung." });

  try {
    const d = req.body;
    const query = `
      INSERT INTO dudi (
        id_dudi, nama_instansi, bidang, alamat, latitude, longitude,
        radius_meter, hari_kerja, tipe_jadwal, daftar_shift, jam_masuk_standar, jam_pulang_standar
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nama_instansi = VALUES(nama_instansi),
        bidang = VALUES(bidang),
        alamat = VALUES(alamat),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        radius_meter = VALUES(radius_meter),
        hari_kerja = VALUES(hari_kerja),
        tipe_jadwal = VALUES(tipe_jadwal),
        daftar_shift = VALUES(daftar_shift),
        jam_masuk_standar = VALUES(jam_masuk_standar),
        jam_pulang_standar = VALUES(jam_pulang_standar)
    `;

    await db.execute(query, [
      d.id_dudi,
      d.nama_instansi,
      d.bidang || "",
      d.alamat || "",
      d.koordinat_lokasi?.latitude || 0,
      d.koordinat_lokasi?.longitude || 0,
      d.radius_meter || 100,
      JSON.stringify(d.hari_kerja || ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]),
      d.tipe_jadwal || "Reguler",
      JSON.stringify(d.daftar_shift || []),
      d.jam_masuk_standar || "08:00",
      d.jam_pulang_standar || "16:30",
    ]);

    res.json({ success: true, message: "Data DUDI berhasil disimpan ke MySQL" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PRESENSI: GET & POST
app.get("/api/presensi", async (req, res) => {
  const db = getDbPool();
  if (!db) return res.status(503).json({ error: "MySQL belum terhubung." });

  try {
    const [rows]: any = await db.query("SELECT * FROM presensi ORDER BY tanggal DESC, jam_masuk DESC");
    const formatted = rows.map((r: any) => ({
      id_presensi: r.id_presensi,
      id_siswa: r.id_siswa,
      tanggal: typeof r.tanggal === "string" ? r.tanggal.substring(0, 10) : new Date(r.tanggal).toISOString().substring(0, 10),
      hari: r.hari || "",
      jam_masuk: r.jam_masuk || "",
      jam_pulang: r.jam_pulang || null,
      status: r.status,
      foto_selfie: r.foto_selfie || "",
      koordinat_absen: {
        latitude: parseFloat(r.latitude) || 0,
        longitude: parseFloat(r.longitude) || 0,
        jarak_meter: r.jarak_meter || 0,
        dalam_radius: Boolean(r.dalam_radius),
      },
      id_shift: r.id_shift,
      nama_shift: r.nama_shift,
      status_ketepatan: r.status_ketepatan,
      keterangan: r.keterangan,
      status_persetujuan_dudi: r.status_persetujuan_dudi,
      catatan_dudi: r.catatan_dudi,
      disetujui_dudi_pada: r.disetujui_dudi_pada,
      nama_pembimbing_dudi: r.nama_pembimbing_dudi,
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/presensi", async (req, res) => {
  const db = getDbPool();
  if (!db) return res.status(503).json({ error: "MySQL belum terhubung." });

  try {
    const p = req.body;
    const query = `
      INSERT INTO presensi (
        id_presensi, id_siswa, tanggal, hari, jam_masuk, jam_pulang, status,
        foto_selfie, latitude, longitude, jarak_meter, dalam_radius,
        id_shift, nama_shift, status_ketepatan, keterangan,
        status_persetujuan_dudi, catatan_dudi, disetujui_dudi_pada, nama_pembimbing_dudi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        jam_pulang = VALUES(jam_pulang),
        status = VALUES(status),
        foto_selfie = VALUES(foto_selfie),
        status_ketepatan = VALUES(status_ketepatan),
        keterangan = VALUES(keterangan),
        status_persetujuan_dudi = VALUES(status_persetujuan_dudi),
        catatan_dudi = VALUES(catatan_dudi),
        disetujui_dudi_pada = VALUES(disetujui_dudi_pada),
        nama_pembimbing_dudi = VALUES(nama_pembimbing_dudi)
    `;

    await db.execute(query, [
      p.id_presensi,
      p.id_siswa,
      p.tanggal,
      p.hari || "",
      p.jam_masuk,
      p.jam_pulang || null,
      p.status,
      p.foto_selfie || "",
      p.koordinat_absen?.latitude || 0,
      p.koordinat_absen?.longitude || 0,
      p.koordinat_absen?.jarak_meter || 0,
      p.koordinat_absen?.dalam_radius ? 1 : 0,
      p.id_shift || null,
      p.nama_shift || null,
      p.status_ketepatan || null,
      p.keterangan || null,
      p.status_persetujuan_dudi || "Menunggu",
      p.catatan_dudi || null,
      p.disetujui_dudi_pada || null,
      p.nama_pembimbing_dudi || null,
    ]);

    res.json({ success: true, message: "Data presensi berhasil disimpan ke MySQL" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. JURNAL: GET & POST
app.get("/api/jurnal", async (req, res) => {
  const db = getDbPool();
  if (!db) return res.status(503).json({ error: "MySQL belum terhubung." });

  try {
    const [rows]: any = await db.query("SELECT * FROM jurnal ORDER BY tanggal DESC");
    const formatted = rows.map((r: any) => ({
      id_jurnal: r.id_jurnal,
      id_siswa: r.id_siswa,
      tanggal: typeof r.tanggal === "string" ? r.tanggal.substring(0, 10) : new Date(r.tanggal).toISOString().substring(0, 10),
      deskripsi_kegiatan: r.deskripsi_kegiatan,
      kendala: r.kendala || "",
      solusi: r.solusi || "",
      status_validasi_guru: r.status_validasi_guru || "Menunggu",
      catatan_guru: r.catatan_guru || "",
      validated_at: r.validated_at || null,
      nama_guru_penilai: r.nama_guru_penilai || "",
      status_validasi_dudi: r.status_validasi_dudi || "Menunggu",
      catatan_dudi: r.catatan_dudi || "",
      validated_dudi_at: r.validated_dudi_at || null,
      nama_dudi_penilai: r.nama_dudi_penilai || "",
    }));
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/jurnal", async (req, res) => {
  const db = getDbPool();
  if (!db) return res.status(503).json({ error: "MySQL belum terhubung." });

  try {
    const j = req.body;
    const query = `
      INSERT INTO jurnal (
        id_jurnal, id_siswa, tanggal, deskripsi_kegiatan, kendala, solusi,
        status_validasi_guru, catatan_guru, validated_at, nama_guru_penilai,
        status_validasi_dudi, catatan_dudi, validated_dudi_at, nama_dudi_penilai
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        deskripsi_kegiatan = VALUES(deskripsi_kegiatan),
        kendala = VALUES(kendala),
        solusi = VALUES(solusi),
        status_validasi_guru = VALUES(status_validasi_guru),
        catatan_guru = VALUES(catatan_guru),
        validated_at = VALUES(validated_at),
        nama_guru_penilai = VALUES(nama_guru_penilai),
        status_validasi_dudi = VALUES(status_validasi_dudi),
        catatan_dudi = VALUES(catatan_dudi),
        validated_dudi_at = VALUES(validated_dudi_at),
        nama_dudi_penilai = VALUES(nama_dudi_penilai)
    `;

    await db.execute(query, [
      j.id_jurnal,
      j.id_siswa,
      j.tanggal,
      j.deskripsi_kegiatan,
      j.kendala || "",
      j.solusi || "",
      j.status_validasi_guru || "Menunggu",
      j.catatan_guru || null,
      j.validated_at || null,
      j.nama_guru_penilai || null,
      j.status_validasi_dudi || "Menunggu",
      j.catatan_dudi || null,
      j.validated_dudi_at || null,
      j.nama_dudi_penilai || null,
    ]);

    res.json({ success: true, message: "Data jurnal berhasil disimpan ke MySQL" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- VITE & PRODUCTION SETUP ----------------------
async function startServer() {
  // Jalankan cek tabel di latar belakang jika DB terkonfigurasi
  initTablesIfConnected().catch((err) => console.error(err));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server API & Frontend PKL berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
