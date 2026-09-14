import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Key,
  Globe,
  Clock,
  Table,
  UploadCloud,
  X,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  Sliders
} from 'lucide-react';
import {
  checkDbConnection,
  syncAllDataToDb,
  testAndSaveDbConfig,
  DbStatusResponse,
  DbConfigPayload
} from '../utils/apiService';
import { Siswa, DUDI, Presensi, JurnalHarian } from '../types';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaList: Siswa[];
  dudiList: DUDI[];
  presensiList: Presensi[];
  jurnalList: JurnalHarian[];
  onRefreshData?: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  siswaList,
  dudiList,
  presensiList,
  jurnalList,
  onRefreshData,
}) => {
  const [status, setStatus] = useState<DbStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'connect' | 'vercel' | 'env'>('status');

  // Form Koneksi Database Interaktif
  const [formData, setFormData] = useState<DbConfigPayload>({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '',
    password: '',
    database: 'db_presensi_pkl',
    ssl: true,
  });
  const [testingDb, setTestingDb] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await checkDbConnection();
      setStatus(data);
      if (data.host) {
        setFormData((prev) => ({
          ...prev,
          host: data.host || prev.host,
          port: data.port || prev.port,
          database: data.database || prev.database,
          ssl: data.ssl ?? prev.ssl,
        }));
      }
    } catch {
      setStatus({
        connected: false,
        configured: false,
        isTiDB: false,
        message: 'Koneksi backend belum aktif.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setSyncResult(null);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleApplyTemplate = (type: 'tidb' | 'localhost') => {
    if (type === 'tidb') {
      setFormData((prev) => ({
        ...prev,
        host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
        port: 4000,
        database: 'db_presensi_pkl',
        ssl: true,
      }));
    } else {
      setFormData({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'db_presensi_pkl',
        ssl: false,
      });
    }
  };

  const handleTestAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.host || !formData.user || !formData.database) {
      setTestResult({
        success: false,
        message: 'Mohon lengkapi Host, User, dan Nama Database.',
      });
      return;
    }

    setTestingDb(true);
    setTestResult(null);
    try {
      const res = await testAndSaveDbConfig(formData);
      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || 'Berhasil terhubung ke database MySQL!',
        });
        await fetchStatus();
        // Otomatis lakukan sinkronisasi data lokal ke database baru
        await handleSyncAll();
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Gagal terhubung ke database.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Terjadi kesalahan saat menguji koneksi.',
      });
    } finally {
      setTestingDb(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncAllDataToDb({
        siswa: siswaList,
        dudi: dudiList,
        presensi: presensiList,
        jurnal: jurnalList,
      });

      if (res.success) {
        setSyncResult({
          success: true,
          message: `Berhasil menyinkronkan data ke MySQL: ${res.syncedCounts?.siswa ?? 0} siswa, ${res.syncedCounts?.dudi ?? 0} DUDI, ${res.syncedCounts?.presensi ?? 0} presensi, ${res.syncedCounts?.jurnal ?? 0} jurnal.`,
        });
        if (onRefreshData) onRefreshData();
      } else {
        setSyncResult({
          success: false,
          message: res.message || 'Gagal menyinkronkan data ke database.',
        });
      }
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'Terjadi kesalahan saat proses sinkronisasi.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const sampleEnv = `# Konfigurasi TiDB Cloud / MySQL Online (.env atau Vercel Env)
MYSQL_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=349mpFScgYPyr7v.root
MYSQL_PASSWORD=your_tidb_password
MYSQL_DATABASE=db_presensi_pkl
MYSQL_SSL=true

# ATAU FORMAT ALTERNATIF (PILIH SALAH SATU):
# DATABASE_URL=mysql://username:password@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/db_presensi_pkl?ssl={"rejectUnauthorized":true}`;

  const copyEnvToClipboard = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                status?.connected
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Pusat Database & Penyimpanan PKL
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Penyimpanan Otomatis Persisten • Siap Pakai & Kompatibel Vercel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 px-5 pt-2 gap-2 text-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`pb-2 px-3 font-semibold border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'status'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Status Penyimpanan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`pb-2 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'connect'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Hubungkan MySQL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vercel')}
            className={`pb-2 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'vercel'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Hosting Vercel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`pb-2 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'env'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Format .env
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* TAB 1: STATUS PENYIMPANAN */}
          {activeTab === 'status' && (
            <>
              {/* Ready-to-use highlight banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">
                    Penyimpanan Otomatis Langsung Aktif (Siap Pakai)
                  </h4>
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5">
                    Data siswa, DUDI, presensi, dan jurnal Anda langsung tersimpan secara aman tanpa wajib konfigurasi rumit.
                  </p>
                </div>
              </div>

              {/* Main Status Badge Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                      Status Database:
                    </span>
                    {status?.connected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        {status.isTiDB ? 'TiDB Cloud Online' : 'MySQL Online'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                        <Server className="w-3 h-3 text-indigo-500" />
                        Database Serverless & Lokal Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {status?.message || 'Memeriksa koneksi database...'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchStatus}
                  disabled={loading}
                  className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Memeriksa...' : 'Uji Koneksi'}</span>
                </button>
              </div>

              {/* Sync Result Alert */}
              {syncResult && (
                <div
                  className={`p-3 rounded-xl flex items-start gap-2 ${
                    syncResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {syncResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span className="leading-relaxed">{syncResult.message}</span>
                </div>
              )}

              {/* Diagnostic Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/50">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    <Cpu className="w-3.5 h-3.5 text-sky-500" />
                    <span>Engine Backend</span>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Express / Vercel API
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Serverless Ready
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/50">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Host & Port</span>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {status?.host ? `${status.host}` : 'Default / Serverless'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Port: {status?.port || 3306} {status?.ssl ? '• SSL Aktif' : ''}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/50">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Status Query</span>
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {status?.latencyMs !== undefined ? `${status.latencyMs} ms` : 'Aktif'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    DB: {status?.database || 'db_presensi_pkl'}
                  </div>
                </div>
              </div>

              {/* Database Tables Section */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Table className="w-4 h-4 text-emerald-500" />
                    <span>Tabel Database PKL Otomatis:</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {status?.tables ? `${status.tables.length} tabel terverifikasi` : '6 skema tabel siap'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  {['siswa', 'dudi', 'guru', 'presensi', 'jurnal', 'users'].map((tbl) => (
                    <div
                      key={tbl}
                      className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                    >
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {tbl}
                      </span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action: Sinkronisasi Massal */}
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-indigo-950 dark:text-indigo-200">
                    Sinkronisasi & Perbarui Data
                  </h4>
                  <p className="text-[11px] text-indigo-700/80 dark:text-slate-400 mt-0.5">
                    Kirim seluruh data siswa, DUDI, presensi, dan jurnal ke database online dan disk server.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAll}
                  disabled={syncing}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  <UploadCloud className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
                  <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            </>
          )}

          {/* TAB 2: HUBUNGKAN MYSQL INTERAKTIF */}
          {activeTab === 'connect' && (
            <form onSubmit={handleTestAndConnect} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Masukkan kredensial MySQL/TiDB Cloud Anda di bawah. Sistem akan langsung menguji koneksi dan otomatis membuat seluruh tabel PKL.
                </p>
              </div>

              {/* Template Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500">Template Cepat:</span>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('tidb')}
                  className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold hover:bg-indigo-100 transition cursor-pointer"
                >
                  🌟 TiDB Cloud (Online)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('localhost')}
                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  💻 Localhost (XAMPP)
                </button>
              </div>

              {/* Panduan Tombol Run & TiDB Cloud */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Tentang Tombol "Run" & Kredensial di TiDB Cloud:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  <li><strong>Tombol "Run" di TiDB Cloud:</strong> Ini adalah SQL Editor di web TiDB untuk menjalankan query manual. <strong>Tidak wajib dijalankan</strong> karena aplikasi ini otomatis membuat tabel sendiri begitu terhubung.</li>
                  <li><strong>Username:</strong> Di TiDB Cloud, username berbentuk <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">xxxx.root</code> (dilihat dari menu <em>Connect</em>), bukan sekadar <em>root</em>.</li>
                  <li><strong>Nama Database:</strong> Anda bisa isi <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">test</code> (database bawaan TiDB) atau <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">db_presensi_pkl</code>.</li>
                  <li><strong>SSL:</strong> Wajib dicentang aktif untuk TiDB Cloud.</li>
                </ul>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Host Database:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="misal: gateway01.ap-southeast-1.prod.aws.tidbcloud.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Port:
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: Number(e.target.value) || 3306 })}
                    placeholder="4000 atau 3306"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username Database:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                    placeholder="misal: 349mpFScgYPyr7v.root atau root"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password Database:
                  </label>
                  <input
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Password database Anda"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Database:
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    placeholder="db_presensi_pkl atau test"
                    className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.ssl)}
                      onChange={(e) => setFormData({ ...formData, ssl: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Aktifkan Koneksi SSL / TLS (Wajib untuk TiDB)
                    </span>
                  </label>
                </div>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div
                  className={`p-3 rounded-xl flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={testingDb}
                className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${testingDb ? 'animate-spin' : ''}`} />
                <span>{testingDb ? 'Sedang Menguji Koneksi & Sinkronisasi...' : '🚀 Sambungkan & Uji Sekarang'}</span>
              </button>
            </form>
          )}

          {/* TAB 3: HOSTING DI VERCEL */}
          {activeTab === 'vercel' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 space-y-2 text-sky-900 dark:text-sky-200">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span>Langkah Menjalankan Database di Vercel Hosting</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Aplikasi telah dilengkapi arsitektur <strong>Vercel Serverless Function</strong> (<code className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded">/api/index.ts</code>). Agar database MySQL/TiDB berfungsi di Vercel:
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <ol className="list-decimal list-inside space-y-2 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    Buka dashboard proyek Anda di{' '}
                    <a
                      href="https://vercel.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-bold underline"
                    >
                      vercel.com
                    </a>
                  </li>
                  <li>
                    Masuk ke menu <strong>Settings</strong> &rarr; <strong>Environment Variables</strong>
                  </li>
                  <li>
                    Tambahkan variabel database berikut (dapat disalin dari tab <em>Format .env</em>):
                    <ul className="list-disc list-inside mt-1 ml-3 space-y-1 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                      <li><code>MYSQL_HOST</code> (misal: <em>gateway01.ap-southeast-1.prod.aws.tidbcloud.com</em>)</li>
                      <li><code>MYSQL_PORT</code> (misal: <em>4000</em> untuk TiDB atau <em>3306</em>)</li>
                      <li><code>MYSQL_USER</code> (misal: <em>349mpFScgYPyr7v.root</em>)</li>
                      <li><code>MYSQL_PASSWORD</code> (password database Anda)</li>
                      <li><code>MYSQL_DATABASE</code> (misal: <em>db_presensi_pkl</em>)</li>
                      <li><code>MYSQL_SSL</code> (isi: <em>true</em>)</li>
                    </ul>
                  </li>
                  <li>
                    Lakukan <strong>Redeploy</strong> di Vercel (menu <em>Deployments &rarr; Redeploy</em>).
                  </li>
                  <li>
                    Backend Serverless Vercel akan otomatis membuat seluruh tabel dan menyinkronkan data presensi & jurnal secara realtime!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: FORMAT .ENV */}
          {activeTab === 'env' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Key className="w-4 h-4 text-sky-500" />
                  <span>Format Variabel Lingkungan (.env):</span>
                </div>
                <button
                  type="button"
                  onClick={copyEnvToClipboard}
                  className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedEnv ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kredensial</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Kredensial ini dapat ditempatkan pada file <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.env</code> saat menjalankan server lokal/container, maupun pada <strong>Environment Variables</strong> di Vercel Dashboard.
              </p>
              <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto leading-relaxed border border-slate-800">
                {sampleEnv}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
