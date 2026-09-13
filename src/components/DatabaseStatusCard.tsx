import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Server, Globe, Key, ShieldCheck } from 'lucide-react';
import { checkDbConnection, DbStatusResponse } from '../utils/apiService';

export const DatabaseStatusCard: React.FC = () => {
  const [status, setStatus] = useState<DbStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    const res = await checkDbConnection();
    setStatus(res);
    setLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs transition mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            status?.connected
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : status?.configured
              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              : 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
          }`}>
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Koneksi Backend & Database MySQL Online
              </h3>
              {status?.connected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" /> Terhubung Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <AlertCircle className="w-3 h-3" /> Siap Dihubungkan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Backend REST API (<code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">/api/siswa</code>, <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">/api/presensi</code>) aktif.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={checkStatus}
          disabled={loading}
          className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Periksa Koneksi</span>
        </button>
      </div>

      {/* Informasi Detail Koneksi */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <Server className="w-4 h-4 text-sky-500" />
            <span>Server Backend API</span>
          </div>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            Node.js Express + TSX (Port 3000)
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">● Berjalan Aktif</span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <Globe className="w-4 h-4 text-indigo-500" />
            <span>Host MySQL Online</span>
          </div>
          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {status?.host || 'Belum diatur (.env)'}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Database: {status?.database || 'db_pkl'}
          </span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/70 dark:border-slate-700/40">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Status Sinkronisasi</span>
          </div>
          <p className="font-medium text-slate-800 dark:text-slate-200">
            {status?.connected ? 'Otomatis Sinkron ke MySQL' : 'Fallback Aman ke LocalStorage'}
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {status?.message || 'Memeriksa status...'}
          </span>
        </div>
      </div>

      {/* Petunjuk konfigurasi online */}
      {!status?.connected && (
        <div className="mt-3 p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
          <Key className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Langkah Menghubungkan ke MySQL Anda:</span>
            <p className="mt-0.5 text-sky-800 dark:text-sky-300">
              Cukup masukkan kredensial MySQL online Anda (Host cPanel/Railway/TiDB, User, Password, Nama DB) pada environment variables (menu Settings / file <code className="font-mono bg-white dark:bg-slate-800 px-1 rounded border border-sky-300 dark:border-sky-700">.env</code>). Backend server akan langsung otomatis menyambungkannya dan membuat tabel-tabelnya tanpa perlu konfigurasi tambahan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
