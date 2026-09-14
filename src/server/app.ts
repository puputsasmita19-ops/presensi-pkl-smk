import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Deteksi lingkungan Serverless (Vercel / Lambda) vs Container / Standalone Server
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.NETLIFY
);

// Direktori data & upload lokal server
const DATA_DIR = isServerless
  ? path.join(os.tmpdir(), "pkl-data")
  : path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

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

// Middleware CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Layanan File Statis Foto Bukti Presensi & Kunjungan
app.use("/api/uploads", express.static(UPLOADS_DIR));
app.use("/uploads", express.static(UPLOADS_DIR));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper Penyimpanan Data Lokal Disk Server
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
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const dataBuffer = Buffer.from(matches[2], "base64");
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${prefix}_${safeId}_${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    fs.writeFileSync(filePath, dataBuffer);

    return {
      localUrl: `/api/uploads/${fileName}`,
      fileName,
    };
  } catch (err) {
    console.error("Gagal menyimpan file gambar ke disk:", err);
    return null;
  }
}

// ==============================================================================
// REST API ENDPOINTS
// ==============================================================================

// 1. Status Server & Penyimpanan Cloud
app.get("/api/db/status", (req, res) => {
  const local = readLocalDb();
  res.json({
    connected: true,
    storage_type: "Firestore & Google Drive",
    total_local_siswa: local.siswa.length,
    total_local_presensi: local.presensi.length,
    message: "Server Backend Aktif (Menggunakan Firebase Firestore & Google Drive)",
  });
});

// 2. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 3. Endpoint Upload Foto Mandiri ke Server (Fallback Lokal)
app.post("/api/storage/upload-photo", (req, res) => {
  try {
    const { imageBase64, id, type } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: "Foto base64 tidak ditemukan" });
    }

    const saved = saveBase64ImageToDisk(imageBase64, id || "image", type || "selfie");
    if (!saved) {
      return res.status(500).json({ success: false, message: "Gagal memproses file foto" });
    }

    res.json({
      success: true,
      url: saved.localUrl,
      fileName: saved.fileName,
      message: "Foto berhasil disimpan ke server.",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Kesalahan server saat upload foto" });
  }
});

// 4. Sinkronisasi Data Cadangan Lokal Server
app.post("/api/sync/backup", (req, res) => {
  try {
    const { siswa, dudi, presensi, jurnal, kunjungan, users } = req.body;
    writeLocalDb({
      ...(siswa ? { siswa } : {}),
      ...(dudi ? { dudi } : {}),
      ...(presensi ? { presensi } : {}),
      ...(jurnal ? { jurnal } : {}),
      ...(kunjungan ? { kunjungan } : {}),
      ...(users ? { users } : {}),
    });
    res.json({ success: true, message: "Cadangan data server berhasil diperbarui." });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Gagal menyimpan cadangan server" });
  }
});

// 5. Baca Cadangan Data Server
app.get("/api/sync/backup", (req, res) => {
  try {
    const local = readLocalDb();
    res.json({ success: true, data: local });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Gagal membaca cadangan server" });
  }
});

export default app;
