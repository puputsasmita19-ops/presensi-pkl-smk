import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Deteksi lingkungan Serverless (Vercel / Lambda) vs Container / Standalone Server
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY
);

// Di lingkungan Vercel / Serverless, direktori root read-only, gunakan os.tmpdir()
const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), "pkl-data")
  : path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const CONFIG_FILE = path.join(DATA_DIR, "db-config.json");

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("Info direktori data/uploads:", err);
}

// Layanan File Statis Foto Bukti Presensi & Kunjungan
app.use("/api/uploads", express.static(UPLOADS_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper Penyimpanan Data Lokal Disk Server (Fallback saat MySQL belum/sedang terhubung)
export interface LocalDbStore {
  siswa: any[];
  dudi: any[];
  presensi: any[];
  jurnal: any[];
  kunjungan: any[];
  users: any[];
}

export function readLocalDb(): LocalDbStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Gagal membaca db.json lokal:", e);
  }
  return { siswa: [], dudi: [], presensi: [], jurnal: [], kunjungan: [], users: [] };
}

export function writeLocalDb(data: Partial<LocalDbStore>) {
  try {
    const current = readLocalDb();
    const updated = { ...current, ...data };
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (e) {
    console.warn("Gagal menulis ke db.json lokal:", e);
  }
}

// Helper Simpan Foto Base64 ke File Disk Server
export function saveBase64ImageToDisk(
  base64Str: string,
  id: string,
  prefix: string = "foto"
): { localUrl: string; fileName: string } | null {
  if (!base64Str || typeof base64Str !== "string" || !base64Str.startsWith("data:image")) {
    return null;
  }

  try {
    const matches = base64Str.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const base64Data = matches[2];
    const cleanId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${prefix}_${cleanId}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    return {
      localUrl: `/api/uploads/${fileName}`,
      fileName,
    };
  } catch (err) {
    console.warn("Gagal menyimpan foto ke disk:", err);
    return null;
  }
}

// Ekstraksi konfigurasi database yang fleksibel (mendukung MYSQL_*, DB_*, DATABASE_URL, dan Dynamic Runtime Config)
export interface DbConfig {
  host: string;
  user: string;
  password?: string;
  database: string;
  port: number;
  ssl?: { rejectUnauthorized: boolean; minVersion?: string };
  isTiDB: boolean;
}

// Runtime config memory
let runtimeDbConfig: DbConfig | null = null;

function loadSavedRuntimeConfig(): DbConfig | null {
  if (runtimeDbConfig) return runtimeDbConfig;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.host && parsed.user && parsed.database) {
        runtimeDbConfig = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Info config file:", e);
  }
  return null;
}

export function parseDbConfig(): DbConfig | null {
  // 1. Cek runtime saved config terlebih dahulu
  const runtime = loadSavedRuntimeConfig();
  if (runtime) {
    return runtime;
  }

  // 2. Cek DATABASE_URL jika ada (misal dari TiDB Cloud, Aiven, Railway, dsb.)
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      const isTiDB = parsed.hostname.includes("tidbcloud") || parsed.port === "4000";
      const isSSL = parsed.searchParams.get("ssl") !== "false" || isTiDB;
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || (isTiDB ? 4000 : 3306),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ""),
        ssl: isSSL ? { rejectUnauthorized: false } : undefined,
        isTiDB,
      };
    } catch (e) {
      console.warn("Gagal parse DATABASE_URL:", e);
    }
  }

  // 3. Mendukung variabel MYSQL_* dan DB_*
  const host = process.env.MYSQL_HOST || process.env.DB_HOST;
  const user = process.env.MYSQL_USER || process.env.DB_USER;
  const database =
    process.env.MYSQL_DATABASE ||
    process.env.DB_NAME ||
    process.env.DB_DATABASE ||
    process.env.MYSQL_DB;
  const password =
    process.env.MYSQL_PASSWORD ||
    process.env.DB_PASSWORD ||
    process.env.DB_PASS ||
    "";
  
  if (!host || !user || !database) {
    return null;
  }

  const isTiDB = Boolean(
    host.includes("tidbcloud") ||
    process.env.MYSQL_PORT === "4000" ||
    process.env.DB_PORT === "4000"
  );

  const port = Number(process.env.MYSQL_PORT || process.env.DB_PORT) || (isTiDB ? 4000 : 3306);
  
  const isSSL =
    process.env.MYSQL_SSL === "true" ||
    process.env.MYSQL_SSL === "1" ||
    process.env.DB_SSL === "true" ||
    process.env.DB_SSL === "1" ||
    isTiDB ||
    host.includes("aivencloud") ||
    host.includes("clever-cloud");

  return {
    host,
    user,
    password,
    database,
    port,
    ssl: isSSL ? { rejectUnauthorized: false } : undefined,
    isTiDB,
  };
}

// MySQL connection pool dengan optimasi serverless & reconnect
let pool: mysql.Pool | null = null;
let tablesInitialized = false;

export function getDbPool(): mysql.Pool | null {
  const config = parseDbConfig();
  if (!config) {
    return null;
  }

  if (!pool) {
    try {
      pool = mysql.createPool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        port: config.port,
        waitForConnections: true,
        connectionLimit: isServerless ? 5 : 10,
        queueLimit: 0,
        connectTimeout: 8000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        ssl: config.ssl,
      });

      (pool as any)?.on?.("error", (err: any) => {
        console.warn("Peringatan Pool MySQL Terkoneksi:", err?.message || err);
      });
    } catch (err) {
      console.error("Gagal membuat koneksi pool MySQL:", err);
      pool = null;
    }
  }

  return pool;
}

// Inisialisasi tabel otomatis jika database terhubung
export async function initTablesIfConnected(customPool?: mysql.Pool | null) {
  const db = customPool || getDbPool();
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
        jam_masuk VARCHAR(50) DEFAULT '00:00:00',
        jam_pulang VARCHAR(50),
        status VARCHAR(50) NOT NULL,
        foto_selfie LONGTEXT,
        drive_file_id VARCHAR(255),
        drive_view_url TEXT,
        image_sync_status VARCHAR(50) DEFAULT 'synced',
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

    // Migrasi kolom presensi
    try { await db.query(`ALTER TABLE presensi MODIFY COLUMN jam_masuk VARCHAR(50) NULL`); } catch {}
    try { await db.query(`ALTER TABLE presensi MODIFY COLUMN jam_pulang VARCHAR(50) NULL`); } catch {}
    try { await db.query(`ALTER TABLE presensi ADD COLUMN drive_file_id VARCHAR(255) AFTER foto_selfie`); } catch {}
    try { await db.query(`ALTER TABLE presensi ADD COLUMN drive_view_url TEXT AFTER drive_file_id`); } catch {}
    try { await db.query(`ALTER TABLE presensi ADD COLUMN image_sync_status VARCHAR(50) DEFAULT 'synced' AFTER drive_view_url`); } catch {}

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

    // Tabel Kunjungan Guru
    await db.query(`
      CREATE TABLE IF NOT EXISTS kunjungan (
        id_kunjungan VARCHAR(100) PRIMARY KEY,
        id_guru VARCHAR(100) NOT NULL,
        nama_guru VARCHAR(255) NOT NULL,
        id_dudi VARCHAR(100) NOT NULL,
        nama_dudi VARCHAR(255) NOT NULL,
        tanggal DATE NOT NULL,
        jam_kunjungan TIME NOT NULL,
        tujuan_kunjungan TEXT NOT NULL,
        catatan_evaluasi LONGTEXT NOT NULL,
        foto_kunjungan LONGTEXT,
        drive_file_id VARCHAR(255),
        drive_view_url TEXT,
        image_sync_status VARCHAR(50) DEFAULT 'synced',
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        jarak_meter INT,
        dalam_radius TINYINT(1) DEFAULT 1,
        siswa_dikunjungi JSON,
        status_kunjungan VARCHAR(50) DEFAULT 'Selesai',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try { await db.query(`ALTER TABLE kunjungan ADD COLUMN drive_file_id VARCHAR(255) AFTER foto_kunjungan`); } catch {}
    try { await db.query(`ALTER TABLE kunjungan ADD COLUMN drive_view_url TEXT AFTER drive_file_id`); } catch {}
    try { await db.query(`ALTER TABLE kunjungan ADD COLUMN image_sync_status VARCHAR(50) DEFAULT 'synced' AFTER drive_view_url`); } catch {}

    tablesInitialized = true;
    console.log("Status MySQL: Tabel database PKL siap & terverifikasi.");
  } catch (e: any) {
    console.error("Gagal inisialisasi tabel MySQL:", e.message);
  }
}

// ---------------------- API ROUTER ----------------------
const apiRouter = express.Router();

// Middleware: Auto trigger inisialisasi tabel saat ada request API pertama kali
apiRouter.use(async (req, res, next) => {
  if (!tablesInitialized) {
    initTablesIfConnected().catch(() => {});
  }
  next();
});

// 0. Dedicated Photo Upload API (Simpan Foto Base64 ke File Disk Server)
apiRouter.post("/upload-photo", async (req, res) => {
  try {
    const { photo, id, prefix = "foto" } = req.body;
    if (!photo || typeof photo !== "string") {
      return res.status(400).json({ error: "Data foto (base64) wajib disertakan." });
    }

    const saved = saveBase64ImageToDisk(photo, id || `file_${Date.now()}`, prefix);
    if (!saved) {
      return res.status(500).json({ error: "Gagal memproses dan menyimpan file foto ke disk server." });
    }

    res.json({
      success: true,
      url: saved.localUrl,
      fileName: saved.fileName,
      message: "Foto berhasil disimpan di penyimpanan server.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Status Koneksi MySQL / TiDB Cloud
apiRouter.get("/db/status", async (req, res) => {
  const config = parseDbConfig();
  if (!config) {
    const localDb = readLocalDb();
    return res.json({
      connected: false,
      configured: false,
      isTiDB: false,
      localStorageActive: true,
      recordsCount: {
        siswa: localDb.siswa.length,
        dudi: localDb.dudi.length,
        presensi: localDb.presensi.length,
        jurnal: localDb.jurnal.length,
        kunjungan: localDb.kunjungan.length,
      },
      message: "Mode Database Lokal / Serverless Aktif (Siap Pakai). Data otomatis tersimpan.",
    });
  }

  try {
    const db = getDbPool();
    if (!db) {
      throw new Error("Pool MySQL tidak dapat diinisialisasi.");
    }

    const start = Date.now();
    const [rows]: any = await db.query("SELECT 1 + 1 AS result, VERSION() as version");
    const latencyMs = Date.now() - start;

    const [tableRows]: any = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
      [config.database]
    );
    const tables = tableRows.map((r: any) => r.TABLE_NAME || r.table_name);

    return res.json({
      connected: true,
      configured: true,
      database: config.database,
      host: config.host,
      port: config.port,
      ssl: Boolean(config.ssl),
      isTiDB: config.isTiDB,
      latencyMs,
      tables,
      version: rows[0]?.version,
      message: config.isTiDB
        ? "Terhubung aktif ke TiDB Cloud Serverless Distributed SQL"
        : "Terhubung aktif ke database MySQL Online",
    });
  } catch (error: any) {
    return res.status(200).json({
      connected: false,
      configured: true,
      isTiDB: config.isTiDB,
      localStorageActive: true,
      message: `Koneksi MySQL terganggu (${error.message}), penyimpanan lokal server aktif.`,
    });
  }
});

// Helper Format Pesan Kesalahan MySQL agar Ramah Pengguna
export function formatMySQLError(err: any): string {
  if (!err) return "Terjadi kesalahan tidak diketahui.";
  const msg = err.message || String(err);
  const code = err.code || "";

  if (code === "ER_ACCESS_DENIED_ERROR" || msg.includes("Access denied")) {
    return "Akses Ditolak: Username atau Password database salah, atau pengguna tidak memiliki izin akses ke database ini.";
  }
  if (code === "ER_BAD_DB_ERROR" || msg.includes("Unknown database")) {
    return "Database Tidak Ditemukan: Nama database tidak ada di server. Buat database tersebut terlebih dahulu di phpMyAdmin/TiDB Cloud.";
  }
  if (code === "ENOTFOUND" || msg.includes("getaddrinfo ENOTFOUND")) {
    return "Host Tidak Ditemukan: Alamat Host database salah atau tidak dapat dijangkau dari internet.";
  }
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    msg.includes("timed out") ||
    msg.includes("connect ECONNREFUSED")
  ) {
    return "Koneksi Gagal / Timeout: Server database tidak merespons. Jika menggunakan Hosting cPanel atau Server pribadi, pastikan fitur 'Remote MySQL' sudah mengizinkan koneksi dari luar (IP: %).";
  }
  if (msg.includes("SSL") || code === "HANDSHAKE_NO_SSL_SUPPORT") {
    return "Masalah SSL / TLS: Server tidak mendukung SSL atau sertifikat tidak cocok. Coba nonaktifkan centang SSL.";
  }
  return `Gagal menghubungkan: ${msg} ${code ? `(Kode: ${code})` : ""}`;
}

// 1.1 Endpoint Uji & Simpan Konfigurasi MySQL Langsung dari UI (Untuk Newbie / Zero-Friction)
apiRouter.post("/db/test-and-save", async (req, res) => {
  try {
    const { host, port = 3306, user, password = "", database, ssl = false } = req.body || {};

    if (!host || !user || !database) {
      return res.status(200).json({
        success: false,
        error: "Host, User, dan Nama Database wajib diisi!",
      });
    }

    const hostStr = String(host).trim();
    const isTiDB = Boolean(
      hostStr.includes("tidbcloud") ||
      Number(port) === 4000
    );

    const isSSL = Boolean(ssl || isTiDB);

    const testConfig: DbConfig = {
      host: hostStr,
      port: Number(port) || (isTiDB ? 4000 : 3306),
      user: String(user).trim(),
      password: String(password || "").trim(),
      database: String(database).trim(),
      ssl: isSSL ? { rejectUnauthorized: false } : undefined,
      isTiDB,
    };

    let testPool: mysql.Pool | null = null;
    try {
      testPool = mysql.createPool({
        host: testConfig.host,
        user: testConfig.user,
        password: testConfig.password,
        database: testConfig.database,
        port: testConfig.port,
        waitForConnections: true,
        connectionLimit: 3,
        queueLimit: 0,
        connectTimeout: 7000,
        ssl: testConfig.ssl,
      });

      // Cegah unhandled 'error' event pada pool instance
      (testPool as any)?.on?.("error", (poolErr: any) => {
        console.warn("Peringatan Pool MySQL Uji:", poolErr?.message || poolErr);
      });

      const start = Date.now();
      await testPool.query("SELECT 1 + 1 AS test_res");
      const latencyMs = Date.now() - start;

      // Inisialisasi seluruh tabel pada database baru secara aman
      try {
        await initTablesIfConnected(testPool);
      } catch (tableErr: any) {
        console.warn("Peringatan inisialisasi tabel baru:", tableErr.message);
      }

      // Sukses: update runtime config & pool utama
      if (pool) {
        try { await pool.end(); } catch {}
      }
      runtimeDbConfig = testConfig;
      pool = testPool;
      tablesInitialized = true;

      // Simpan ke disk config jika memungkinkan
      try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(testConfig, null, 2), "utf-8");
      } catch {}

      return res.json({
        success: true,
        latencyMs,
        isTiDB,
        message: `Berhasil terhubung ke ${isTiDB ? "TiDB Cloud" : "MySQL"} (${testConfig.database})! Semua 6 tabel PKL siap.`,
      });
    } catch (err: any) {
      if (testPool) {
        try { await testPool.end(); } catch {}
      }
      return res.status(200).json({
        success: false,
        error: formatMySQLError(err),
      });
    }
  } catch (outerErr: any) {
    return res.status(200).json({
      success: false,
      error: `Kesalahan internal: ${outerErr.message}`,
    });
  }
});

// Endpoint Mass Sync: Mengunggah data lokal ke MySQL sekaligus
apiRouter.post("/db/sync-all", async (req, res) => {
  const { siswa = [], dudi = [], presensi = [], jurnal = [], kunjungan = [] } = req.body;
  const db = getDbPool();

  // Selalu amankan ke local DB disk server
  const currentDb = readLocalDb();
  writeLocalDb({
    siswa: siswa.length ? siswa : currentDb.siswa,
    dudi: dudi.length ? dudi : currentDb.dudi,
    presensi: presensi.length ? presensi : currentDb.presensi,
    jurnal: jurnal.length ? jurnal : currentDb.jurnal,
    kunjungan: kunjungan.length ? kunjungan : currentDb.kunjungan,
  });

  if (!db) {
    return res.json({
      success: true,
      message: "Data tersimpan di database lokal & browser siap pakai.",
      syncedCounts: {
        siswa: siswa.length,
        dudi: dudi.length,
        presensi: presensi.length,
        jurnal: jurnal.length,
        kunjungan: kunjungan.length,
      },
    });
  }

  try {
    let syncedCounts = { siswa: 0, dudi: 0, presensi: 0, jurnal: 0, kunjungan: 0 };

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
          foto_selfie, drive_file_id, drive_view_url, image_sync_status, latitude, longitude, jarak_meter, dalam_radius,
          id_shift, nama_shift, status_ketepatan, keterangan,
          status_persetujuan_dudi, catatan_dudi, disetujui_dudi_pada, nama_pembimbing_dudi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          jam_pulang = VALUES(jam_pulang),
          status = VALUES(status),
          foto_selfie = VALUES(foto_selfie),
          drive_file_id = VALUES(drive_file_id),
          drive_view_url = VALUES(drive_view_url),
          image_sync_status = VALUES(image_sync_status),
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
          p.status || "Hadir",
          p.foto_selfie || "",
          p.drive_file_id || null,
          p.drive_view_url || null,
          p.image_sync_status || "synced",
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

    // 5. Sync Kunjungan Guru
    for (const k of kunjungan) {
      if (!k.id_kunjungan || !k.id_guru || !k.tanggal) continue;
      await db.execute(
        `INSERT INTO kunjungan (
          id_kunjungan, id_guru, nama_guru, id_dudi, nama_dudi,
          tanggal, jam_kunjungan, tujuan_kunjungan, catatan_evaluasi,
          foto_kunjungan, drive_file_id, drive_view_url, image_sync_status,
          latitude, longitude, jarak_meter, dalam_radius,
          siswa_dikunjungi, status_kunjungan
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          nama_guru = VALUES(nama_guru),
          id_dudi = VALUES(id_dudi),
          nama_dudi = VALUES(nama_dudi),
          tanggal = VALUES(tanggal),
          jam_kunjungan = VALUES(jam_kunjungan),
          tujuan_kunjungan = VALUES(tujuan_kunjungan),
          catatan_evaluasi = VALUES(catatan_evaluasi),
          foto_kunjungan = VALUES(foto_kunjungan),
          drive_file_id = VALUES(drive_file_id),
          drive_view_url = VALUES(drive_view_url),
          image_sync_status = VALUES(image_sync_status),
          latitude = VALUES(latitude),
          longitude = VALUES(longitude),
          jarak_meter = VALUES(jarak_meter),
          dalam_radius = VALUES(dalam_radius),
          siswa_dikunjungi = VALUES(siswa_dikunjungi),
          status_kunjungan = VALUES(status_kunjungan)`,
        [
          k.id_kunjungan,
          k.id_guru,
          k.nama_guru,
          k.id_dudi,
          k.nama_dudi,
          k.tanggal,
          k.jam_kunjungan,
          k.tujuan_kunjungan,
          k.catatan_evaluasi,
          k.foto_kunjungan || "",
          k.drive_file_id || null,
          k.drive_view_url || null,
          k.image_sync_status || "synced",
          k.koordinat?.latitude || 0,
          k.koordinat?.longitude || 0,
          k.koordinat?.jarak_meter || 0,
          k.koordinat?.dalam_radius ? 1 : 0,
          JSON.stringify(k.siswa_dikunjungi || []),
          k.status_kunjungan || "Selesai",
        ]
      );
      syncedCounts.kunjungan++;
    }

    res.json({
      success: true,
      message: "Sinkronisasi massal ke database MySQL & backup lokal berhasil.",
      syncedCounts,
    });
  } catch (err: any) {
    res.json({
      success: true,
      message: `Data tersimpan di penyimpanan disk server (MySQL warning: ${err.message})`,
    });
  }
});

// 2. SISWA: GET, POST & DELETE
apiRouter.get("/siswa", async (req, res) => {
  const db = getDbPool();
  if (db) {
    try {
      const [rows]: any = await db.query("SELECT * FROM siswa ORDER BY nama_lengkap ASC");
      if (rows && rows.length > 0) {
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
        return res.json(formatted);
      }
    } catch (err) {
      console.warn("Query siswa MySQL gagal, membaca db.json lokal:", err);
    }
  }

  const localDb = readLocalDb();
  res.json(localDb.siswa || []);
});

apiRouter.post("/siswa", async (req, res) => {
  const s = req.body;
  if (!s.id_siswa || !s.nama_lengkap || !s.nis) {
    return res.status(400).json({ error: "id_siswa, nama_lengkap, dan nis wajib diisi." });
  }

  const localDb = readLocalDb();
  const existingIdx = localDb.siswa.findIndex((x) => x.id_siswa === s.id_siswa);
  if (existingIdx >= 0) {
    localDb.siswa[existingIdx] = s;
  } else {
    localDb.siswa.push(s);
  }
  writeLocalDb({ siswa: localDb.siswa });

  const db = getDbPool();
  if (db) {
    try {
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
    } catch (err: any) {
      console.warn("Gagal simpan siswa ke MySQL:", err.message);
    }
  }

  res.json({ success: true, message: "Data siswa berhasil disimpan." });
});

apiRouter.delete("/siswa/:id", async (req, res) => {
  const localDb = readLocalDb();
  localDb.siswa = localDb.siswa.filter((x) => x.id_siswa !== req.params.id);
  writeLocalDb({ siswa: localDb.siswa });

  const db = getDbPool();
  if (db) {
    try {
      await db.execute("DELETE FROM siswa WHERE id_siswa = ?", [req.params.id]);
    } catch {}
  }
  res.json({ success: true, message: "Siswa berhasil dihapus." });
});

// 3. DUDI: GET & POST
apiRouter.get("/dudi", async (req, res) => {
  const db = getDbPool();
  if (db) {
    try {
      const [rows]: any = await db.query("SELECT * FROM dudi ORDER BY nama_instansi ASC");
      if (rows && rows.length > 0) {
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
        return res.json(formatted);
      }
    } catch (err) {
      console.warn("Query DUDI MySQL gagal, membaca db.json lokal:", err);
    }
  }

  const localDb = readLocalDb();
  res.json(localDb.dudi || []);
});

apiRouter.post("/dudi", async (req, res) => {
  const d = req.body;
  const localDb = readLocalDb();
  const existingIdx = localDb.dudi.findIndex((x) => x.id_dudi === d.id_dudi);
  if (existingIdx >= 0) {
    localDb.dudi[existingIdx] = d;
  } else {
    localDb.dudi.push(d);
  }
  writeLocalDb({ dudi: localDb.dudi });

  const db = getDbPool();
  if (db) {
    try {
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
    } catch (err: any) {
      console.warn("Gagal simpan DUDI ke MySQL:", err.message);
    }
  }

  res.json({ success: true, message: "Data DUDI berhasil disimpan." });
});

// 4. PRESENSI: GET & POST
apiRouter.get("/presensi", async (req, res) => {
  const db = getDbPool();
  if (db) {
    try {
      const [rows]: any = await db.query("SELECT * FROM presensi ORDER BY tanggal DESC, jam_masuk DESC");
      if (rows && rows.length > 0) {
        const formatted = rows.map((r: any) => ({
          id_presensi: r.id_presensi,
          id_siswa: r.id_siswa,
          tanggal: typeof r.tanggal === "string" ? r.tanggal.substring(0, 10) : new Date(r.tanggal).toISOString().substring(0, 10),
          hari: r.hari || "",
          jam_masuk: r.jam_masuk || "",
          jam_pulang: r.jam_pulang || null,
          status: r.status,
          foto_selfie: r.foto_selfie || "",
          drive_file_id: r.drive_file_id || undefined,
          drive_view_url: r.drive_view_url || undefined,
          image_sync_status: r.image_sync_status || "synced",
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
        return res.json(formatted);
      }
    } catch (err) {
      console.warn("Query presensi MySQL gagal, membaca db.json lokal:", err);
    }
  }

  const localDb = readLocalDb();
  res.json(localDb.presensi || []);
});

apiRouter.post("/presensi", async (req, res) => {
  try {
    const p = req.body;
    if (!p.id_presensi || !p.id_siswa || !p.tanggal) {
      return res.status(400).json({ error: "id_presensi, id_siswa, dan tanggal wajib diisi." });
    }

    let driveViewUrl = p.drive_view_url;
    if (p.foto_selfie && typeof p.foto_selfie === "string" && p.foto_selfie.startsWith("data:image")) {
      const savedPhoto = saveBase64ImageToDisk(p.foto_selfie, p.id_presensi, "selfie");
      if (savedPhoto && !driveViewUrl) {
        driveViewUrl = savedPhoto.localUrl;
      }
    }

    const payloadWithDrive: any = {
      ...p,
      drive_view_url: driveViewUrl || p.drive_view_url || null,
    };

    const localDb = readLocalDb();
    const existingIdx = localDb.presensi.findIndex((x) => x.id_presensi === p.id_presensi);
    if (existingIdx >= 0) {
      localDb.presensi[existingIdx] = payloadWithDrive;
    } else {
      localDb.presensi.unshift(payloadWithDrive);
    }
    writeLocalDb({ presensi: localDb.presensi });

    const db = getDbPool();
    if (db) {
      try {
        const query = `
          INSERT INTO presensi (
            id_presensi, id_siswa, tanggal, hari, jam_masuk, jam_pulang, status,
            foto_selfie, drive_file_id, drive_view_url, image_sync_status, latitude, longitude, jarak_meter, dalam_radius,
            id_shift, nama_shift, status_ketepatan, keterangan,
            status_persetujuan_dudi, catatan_dudi, disetujui_dudi_pada, nama_pembimbing_dudi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            jam_pulang = VALUES(jam_pulang),
            status = VALUES(status),
            foto_selfie = VALUES(foto_selfie),
            drive_file_id = VALUES(drive_file_id),
            drive_view_url = VALUES(drive_view_url),
            image_sync_status = VALUES(image_sync_status),
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
          p.jam_masuk || "08:00",
          p.jam_pulang || null,
          p.status || "Hadir",
          p.foto_selfie || "",
          p.drive_file_id || null,
          driveViewUrl || null,
          p.image_sync_status || "synced",
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
      } catch (dbErr: any) {
        console.warn("Gagal simpan presensi ke MySQL:", dbErr.message);
      }
    }

    res.json({
      success: true,
      message: "Data presensi & foto selfie berhasil disimpan ke database.",
      driveViewUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. JURNAL: GET & POST
apiRouter.get("/jurnal", async (req, res) => {
  const db = getDbPool();
  if (db) {
    try {
      const [rows]: any = await db.query("SELECT * FROM jurnal ORDER BY tanggal DESC");
      if (rows && rows.length > 0) {
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
        return res.json(formatted);
      }
    } catch (err) {
      console.warn("Query jurnal MySQL gagal, membaca db.json lokal:", err);
    }
  }

  const localDb = readLocalDb();
  res.json(localDb.jurnal || []);
});

apiRouter.post("/jurnal", async (req, res) => {
  const j = req.body;
  const localDb = readLocalDb();
  const existingIdx = localDb.jurnal.findIndex((x) => x.id_jurnal === j.id_jurnal);
  if (existingIdx >= 0) {
    localDb.jurnal[existingIdx] = j;
  } else {
    localDb.jurnal.unshift(j);
  }
  writeLocalDb({ jurnal: localDb.jurnal });

  const db = getDbPool();
  if (db) {
    try {
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
      ]);
    } catch (err: any) {
      console.warn("Gagal simpan jurnal ke MySQL:", err.message);
    }
  }

  res.json({ success: true, message: "Data jurnal berhasil disimpan." });
});

// 6. KUNJUNGAN GURU: GET & POST
apiRouter.get("/kunjungan", async (req, res) => {
  const db = getDbPool();
  if (db) {
    try {
      const [rows]: any = await db.query("SELECT * FROM kunjungan ORDER BY tanggal DESC, jam_kunjungan DESC");
      if (rows && rows.length > 0) {
        const formatted = rows.map((r: any) => ({
          id_kunjungan: r.id_kunjungan,
          id_guru: r.id_guru,
          nama_guru: r.nama_guru,
          id_dudi: r.id_dudi,
          nama_dudi: r.nama_dudi,
          tanggal: typeof r.tanggal === "string" ? r.tanggal.substring(0, 10) : new Date(r.tanggal).toISOString().substring(0, 10),
          jam_kunjungan: r.jam_kunjungan || "",
          tujuan_kunjungan: r.tujuan_kunjungan || "",
          catatan_evaluasi: r.catatan_evaluasi || "",
          foto_kunjungan: r.foto_kunjungan || "",
          drive_file_id: r.drive_file_id || undefined,
          drive_view_url: r.drive_view_url || undefined,
          image_sync_status: r.image_sync_status || "synced",
          koordinat: {
            latitude: parseFloat(r.latitude) || 0,
            longitude: parseFloat(r.longitude) || 0,
            jarak_meter: r.jarak_meter || 0,
            dalam_radius: Boolean(r.dalam_radius),
          },
          siswa_dikunjungi: r.siswa_dikunjungi ? (typeof r.siswa_dikunjungi === "string" ? JSON.parse(r.siswa_dikunjungi) : r.siswa_dikunjungi) : [],
          status_kunjungan: r.status_kunjungan || "Selesai",
        }));
        return res.json(formatted);
      }
    } catch (err) {
      console.warn("Query kunjungan MySQL gagal, membaca db.json lokal:", err);
    }
  }

  const localDb = readLocalDb();
  res.json(localDb.kunjungan || []);
});

apiRouter.post("/kunjungan", async (req, res) => {
  try {
    const k = req.body;
    if (!k.id_kunjungan || !k.id_guru || !k.tanggal) {
      return res.status(400).json({ error: "id_kunjungan, id_guru, dan tanggal wajib diisi." });
    }

    let driveViewUrl = k.drive_view_url;
    if (k.foto_kunjungan && typeof k.foto_kunjungan === "string" && k.foto_kunjungan.startsWith("data:image")) {
      const savedPhoto = saveBase64ImageToDisk(k.foto_kunjungan, k.id_kunjungan, "kunjungan");
      if (savedPhoto && !driveViewUrl) {
        driveViewUrl = savedPhoto.localUrl;
      }
    }

    const payloadWithDrive: any = {
      ...k,
      drive_view_url: driveViewUrl || k.drive_view_url || null,
    };

    const localDb = readLocalDb();
    const existingIdx = localDb.kunjungan.findIndex((x) => x.id_kunjungan === k.id_kunjungan);
    if (existingIdx >= 0) {
      localDb.kunjungan[existingIdx] = payloadWithDrive;
    } else {
      localDb.kunjungan.unshift(payloadWithDrive);
    }
    writeLocalDb({ kunjungan: localDb.kunjungan });

    const db = getDbPool();
    if (db) {
      try {
        const query = `
          INSERT INTO kunjungan (
            id_kunjungan, id_guru, nama_guru, id_dudi, nama_dudi,
            tanggal, jam_kunjungan, tujuan_kunjungan, catatan_evaluasi,
            foto_kunjungan, drive_file_id, drive_view_url, image_sync_status,
            latitude, longitude, jarak_meter, dalam_radius,
            siswa_dikunjungi, status_kunjungan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nama_guru = VALUES(nama_guru),
            id_dudi = VALUES(id_dudi),
            nama_dudi = VALUES(nama_dudi),
            tanggal = VALUES(tanggal),
            jam_kunjungan = VALUES(jam_kunjungan),
            tujuan_kunjungan = VALUES(tujuan_kunjungan),
            catatan_evaluasi = VALUES(catatan_evaluasi),
            foto_kunjungan = VALUES(foto_kunjungan),
            drive_file_id = VALUES(drive_file_id),
            drive_view_url = VALUES(drive_view_url),
            image_sync_status = VALUES(image_sync_status),
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            jarak_meter = VALUES(jarak_meter),
            dalam_radius = VALUES(dalam_radius),
            siswa_dikunjungi = VALUES(siswa_dikunjungi),
            status_kunjungan = VALUES(status_kunjungan)
        `;

        await db.execute(query, [
          k.id_kunjungan,
          k.id_guru,
          k.nama_guru,
          k.id_dudi,
          k.nama_dudi,
          k.tanggal,
          k.jam_kunjungan,
          k.tujuan_kunjungan,
          k.catatan_evaluasi,
          k.foto_kunjungan || "",
          k.drive_file_id || null,
          driveViewUrl || null,
          k.image_sync_status || "synced",
          k.koordinat?.latitude || 0,
          k.koordinat?.longitude || 0,
          k.koordinat?.jarak_meter || 0,
          k.koordinat?.dalam_radius ? 1 : 0,
          JSON.stringify(k.siswa_dikunjungi || []),
          k.status_kunjungan || "Selesai",
        ]);
      } catch (dbErr: any) {
        console.warn("Gagal simpan kunjungan ke MySQL:", dbErr.message);
      }
    }

    res.json({
      success: true,
      message: "Data kunjungan guru & foto bukti berhasil disimpan ke database.",
      driveViewUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Daftarkan router ke /api dan / (sehingga kompatibel dengan berbagai rewrite Vercel maupun express standar)
app.use("/api", apiRouter);
app.use("/", apiRouter);

// Global Error Handler untuk memastikan response selalu JSON dan ramah pengguna
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Server Error:", err);
  if (!res.headersSent) {
    res.status(200).json({
      success: false,
      error: err?.message || "Terjadi kendala saat memproses permintaan di server.",
    });
  }
});

export default app;
