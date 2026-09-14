import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Server,
  Database,
  Layers,
  Shield,
  Smartphone,
  Send,
  ExternalLink,
  BookMarked,
  Info,
} from 'lucide-react';
import { SOURCE_FILES, SourceFileItem } from '../data/gasSourceCode';

export const ArsitekturCodeViewer: React.FC = () => {
  // Default to Index.html (index 1) as it is the most requested file to copy
  const [activeFileIndex, setActiveFileIndex] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  const currentFile: SourceFileItem = SOURCE_FILES[activeFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Overview & Architecture Cards */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 text-sky-800 uppercase tracking-wider mb-1.5">
            Arsitektur Sistem & Spesifikasi Teknis
          </span>
          <h2 className="text-base font-bold text-slate-900">
            Sistem Presensi PKL SMK: Firebase Firestore + Google Drive + Fonnte + PWA
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
            Arsitektur dirancang dengan pemisahan peran yang modular (Separation of Concerns). Database Firebase Firestore mengelola sinkronisasi data real-time, sementara Google Drive API mengamankan foto bukti presensi siswa dan laporan kunjungan guru.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Pillar 1: Backend API */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-sky-400 flex items-center justify-center font-bold">
              <Server className="w-4 h-4" />
            </div>
            <strong className="text-slate-900 block font-bold">Backend & Express Service</strong>
            <p className="text-[11px] text-slate-600">
              Menyediakan endpoint API teroptimasi, fallback penyimpanan berkas lokal server, dan proxy keamanan.
            </p>
          </div>

          {/* Pillar 2: Database Firebase Firestore */}
          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <strong className="text-amber-950 block font-bold">Database (Firebase Firestore)</strong>
            <p className="text-[11px] text-amber-900">
              Sinkronisasi real-time multi-tier, offline persistence via IndexedDB, dan listener otomatis antar-perangkat.
            </p>
          </div>

          {/* Pillar 3: Google Drive Cloud Storage */}
          <div className="bg-sky-50/70 rounded-xl p-3 border border-sky-200 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <strong className="text-sky-950 block font-bold">Penyimpanan Google Drive</strong>
            <p className="text-[11px] text-sky-900">
              Integrasi Google Drive API via OAuth Client ID untuk auto-upload foto presensi, kunjungan guru, dan pencadangan database.
            </p>
          </div>

          {/* Pillar 4: Integrasi Fonnte & jsPDF */}
          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Send className="w-4 h-4" />
            </div>
            <strong className="text-emerald-950 block font-bold">Integrasi WA Fonnte & jsPDF</strong>
            <p className="text-[11px] text-emerald-900">
              Dispatch notifikasi WhatsApp otomatis saat siswa izin/sakit ke ortu, serta export berkas laporan PKL resmi berstandar PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Relational Schema Diagram Map */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-slate-600" />
          <span>Konsep Relasi Data RDBMS (Foreign Keys)</span>
        </h3>
        <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
          <pre>{`[Users] (PK: id_user)
  ├── 1:1 ──> [Siswa] (PK: id_siswa, FK: id_user, id_dudi, id_guru_pembimbing)
  │             ├── 1:N ──> [Presensi] (PK: id_presensi, FK: id_siswa, tanggal, selfie, gps)
  │             └── 1:N ──> [JurnalHarian] (PK: id_jurnal, FK: id_siswa, status_validasi)
  │
  ├── 1:1 ──> [GuruPembimbing] (PK: id_guru, FK: id_user, siswa_bimbingan, jadwal_kunjungan, nomor_wa)
  │
  └── 1:N ──> [DUDI] (PK: id_dudi, koordinat_lokasi {lat, lon}, radius_meter)`}</pre>
        </div>
      </div>

      {/* Quick Troubleshooting & Copy Guide */}
      <div className="bg-sky-50/90 border border-sky-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
            <Info className="w-4 h-4" />
          </div>
          <div className="space-y-2 flex-1">
            <h4 className="text-sm font-bold text-slate-900">
              Kenapa di Web App Google Apps Script Anda hanya muncul menu kamera saja?
            </h4>
            <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
              <p>
                <strong>1. Tab Navigasi Ada di Atas Kamera:</strong> Tepat di atas kotak kamera, terdapat tab menu:
                <span className="font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-sky-200 mx-1">Presensi</span>
                <span className="font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-sky-200 mx-1">Jurnal Harian</span>
                <span className="font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-sky-200 mx-1">Master Data</span>
                <span className="font-semibold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-sky-200 mx-1">Laporan PDF</span>.
                Cukup klik tab <strong>Jurnal Harian</strong> atau <strong>Laporan PDF</strong> untuk berpindah menu!
              </p>
              <p>
                <strong>2. Cara Paling Cepat & Praktis (Test Deployment):</strong> Di editor Apps Script, daripada deploy ulang terus-menerus, buka menu <strong>Deploy &rarr; Test deployments</strong>. Gunakan link berakhiran <code>/dev</code> yang selalu update otomatis setiap kali Anda menekan Simpan (Ctrl+S) tanpa perlu membuat versi baru!
              </p>
              <p>
                <strong>3. Gunakan Aplikasi Web Ini Langsung:</strong> Sistem di hadapan Anda saat ini sudah berfungsi penuh! Anda bisa langsung klik tab <em>Presensi Cerdas</em>, <em>Jurnal Harian</em>, <em>Master Data</em>, dan <em>Laporan & PDF</em> di navigasi atas untuk langsung memakai atau menguji sistem.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const idx = SOURCE_FILES.findIndex(f => f.filename === 'Index.html');
                  if (idx !== -1) {
                    setActiveFileIndex(idx);
                    navigator.clipboard.writeText(SOURCE_FILES[idx].code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }
                }}
                className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied && currentFile.filename === 'Index.html' ? 'Index.html Berhasil Disalin!' : 'Salin Cepat Index.html (All-in-One)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const file = SOURCE_FILES.find(f => f.filename === 'Index.html');
                  if (file) {
                    const blob = new Blob([file.code], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Index.html';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                }}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-sky-600" />
                <span>Unduh File Index.html (.html)</span>
              </button>

              <button
                type="button"
                id="btn-quick-download-mysql"
                onClick={() => {
                  const sqlFile = SOURCE_FILES.find(f => f.filename === 'database_mysql.sql');
                  if (sqlFile) {
                    const blob = new Blob([sqlFile.code], { type: 'application/sql;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'database_mysql.sql';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }
                }}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span>Unduh database_mysql.sql (Siap phpMyAdmin)</span>
              </button>

              <button
                type="button"
                id="btn-quick-download-all-backend"
                onClick={() => {
                  // Unduh 4 file backend langsung: server.js, db.js, package.json, .env
                  const backendFiles = ['server.js', 'db.js', 'package.json', '.env'];
                  backendFiles.forEach((fname, idx) => {
                    setTimeout(() => {
                      const f = SOURCE_FILES.find(item => item.filename === fname);
                      if (f) {
                        const mime = fname.endsWith('.json') ? 'application/json' : fname.endsWith('.js') ? 'application/javascript' : 'text/plain';
                        const blob = new Blob([f.code], { type: `${mime};charset=utf-8` });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fname;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }
                    }, idx * 250);
                  });
                }}
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh Paket Backend (server.js, db.js, package.json, .env)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Code Viewer Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* File Tabs Bar */}
        <div className="bg-slate-900 px-3 pt-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
            {SOURCE_FILES.map((file, idx) => {
              const isActive = idx === activeFileIndex;
              return (
                <button
                  key={file.filename}
                  id={`tab-file-${file.filename.replace(/\./g, '-')}`}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{file.filename}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-2 flex items-center gap-1.5 shrink-0">
            <button
              id="btn-download-code"
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition active:scale-95 cursor-pointer"
              title={`Unduh ${currentFile.filename}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh {currentFile.filename.endsWith('.json') ? '.JSON' : 'File'}</span>
            </button>

            <button
              id="btn-copy-code"
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 transition active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin File'}</span>
            </button>
          </div>
        </div>

        {/* File Description Header */}
        <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/80 text-white flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xs font-bold text-sky-300 font-mono">{currentFile.title}</h4>
            <p className="text-[11px] text-slate-300 mt-0.5">{currentFile.description}</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
            {currentFile.language.toUpperCase()}
          </span>
        </div>

        {/* Code Content Block */}
        <div className="relative bg-slate-950 text-slate-200 p-4 font-mono text-xs overflow-x-auto max-h-[600px] leading-relaxed select-all">
          <pre>{currentFile.code}</pre>
        </div>
      </div>

      {/* Step-by-Step Deployment Guide Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <BookMarked className="w-4 h-4 text-sky-600" />
          <span>Panduan Deploy & Setup (MySQL / TiDB Cloud & Google Drive)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Step 1 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <strong className="text-slate-900 block font-bold">1. Siapkan Database MySQL / TiDB Cloud</strong>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Daftar gratis di <em>tidbcloud.com</em> atau gunakan server MySQL online Anda. Masukkan host, port 4000, user, password, dan SSL=true ke variabel lingkungan (<code>.env</code>). Tabel-tabel akan terbuat otomatis.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <strong className="text-slate-900 block font-bold">2. Buka Google Apps Script</strong>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Buka <em>script.google.com</em>, buat proyek baru bernama <strong>Presensi PKL SMK</strong>. Anda hanya membutuhkan 2 file di GAS: buat file script <code>Code.gs</code> dan file HTML <code>Index.html</code> (All-in-One: HTML, CSS, dan JS sudah disatukan). Cukup salin kode dari tab di atas dan simpan.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <strong className="text-slate-900 block font-bold">3. Konfigurasi Token & API Fonnte</strong>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Di <code>Code.gs</code>, ganti <code>DATABASE_URL</code>, <code>DATABASE_SECRET</code>, dan daftarkan akun di <em>fonnte.com</em> untuk mendapatkan <code>API_TOKEN</code> agar notifikasi WhatsApp dapat dikirimkan ke nomor WhatsApp orang tua siswa.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <strong className="text-slate-900 block font-bold">4. Terapkan Web App (Deploy)</strong>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Klik tombol <strong>Deploy &gt; New deployment</strong>, pilih tipe <em>Web app</em>, atur <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>. Salin URL Web App yang dihasilkan untuk dibagikan ke siswa dan guru!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
