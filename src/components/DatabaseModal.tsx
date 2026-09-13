import React, { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Globe,
  ShieldCheck,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Key,
  Copy,
  Check,
  Clock,
  Table,
  Cpu,
} from 'lucide-react';
import {
  checkDbConnection,
  DbStatusResponse,
  syncAllDataToDb,
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
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedEnv, setCopiedEnv] = useState<boolean>(false);

  const fetchStatus = async () => {
    setLoading(true);
    setSyncResult(null);
    try {
      const res = await checkDbConnection();
      setStatus(res);
    } catch {
      setStatus({
        connected: false,
        configured: false,
        message: 'Gagal menghubungi endpoint backend /api/db/status',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleSyncAll = async () => {
    if (!status?.connected) {
      alert('Database MySQL / TiDB belum terhubung secara online.');
      return;
    }

    const confirmSync = window.confirm(
      `Unggah dan sinkronkan semua data lokal ke database MySQL/TiDB?\n\n• ${siswaList.length} Siswa\n• ${dudiList.length} DUDI\n• ${presensiList.length} Presensi\n• ${jurnalList.length} Jurnal`
    );
    if (!confirmSync) return;

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

  const sampleEnv = `# Konfigurasi TiDB Cloud / MySQL Online
MYSQL_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
MYSQL_PORT=4000
MYSQL_USER=349mpFScgYPyr7v.root
MYSQL_PASSWORD=your_tidb_password
MYSQL_DATABASE=db_presensi_pkl
MYSQL_SSL=true`;

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
                  : status?.configured
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Koneksi Backend & Database MySQL / TiDB
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pusat Penyimpanan Relasional SQL Terpusat & Sinkronisasi Online
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

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
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
                ) : status?.configured ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold text-[11px]">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    Gagal Menyambung ke Host
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                    <Server className="w-3 h-3 text-slate-400" />
                    Belum Dikonfigurasi di .env
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
                <span>Backend Engine</span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Express + TSX
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Port 3000 Active
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Host & Port</span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                {status?.host ? `${status.host}` : 'Localhost / None'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Port: {status?.port || 3306} {status?.ssl ? '• SSL On' : ''}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Latency Query</span>
              </div>
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {status?.latencyMs !== undefined ? `${status.latencyMs} ms` : '-'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                DB: {status?.database || 'db_pkl'}
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
              {['siswa', 'dudi', 'guru', 'presensi', 'jurnal', 'users'].map((tbl) => {
                const isCreated = status?.connected;
                return (
                  <div
                    key={tbl}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {tbl}
                    </span>
                    {isCreated ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Siap</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action: Sinkronisasi Massal ke MySQL jika terhubung */}
          {status?.connected && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-indigo-950 dark:text-indigo-200">
                  Sinkronisasi Data Lokal ke MySQL / TiDB
                </h4>
                <p className="text-[11px] text-indigo-700/80 dark:text-slate-400 mt-0.5">
                  Unggah seluruh data siswa, DUDI, presensi, dan jurnal dari memori lokal ke database online.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncAll}
                disabled={syncing}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
              >
                <UploadCloud className={`w-4 h-4 ${syncing ? 'animate-bounce' : ''}`} />
                <span>{syncing ? 'Mengunggah...' : 'Sinkronkan Sekarang'}</span>
              </button>
            </div>
          )}

          {/* Guide / Panduan Setup TiDB Cloud / MySQL */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                <Key className="w-4 h-4 text-sky-500" />
                <span>Panduan Kredensial TiDB Cloud / MySQL:</span>
              </div>
              <button
                type="button"
                onClick={copyEnvToClipboard}
                className="px-2 py-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 text-[11px] font-medium flex items-center gap-1 transition cursor-pointer"
                title="Salin format .env"
              >
                {copiedEnv ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin .env</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Jika menggunakan <strong>TiDB Cloud</strong>: Buat Serverless Cluster gratis di{' '}
              <a
                href="https://tidbcloud.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-sky-400 underline font-semibold"
              >
                tidbcloud.com
              </a>
              , dapatkan Host dan User, lalu masukkan ke file <code className="font-mono bg-white dark:bg-slate-900 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700">.env</code> atau Vercel Environment Variables.
            </p>
            <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto leading-relaxed border border-slate-800">
              {sampleEnv}
            </pre>
          </div>
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
