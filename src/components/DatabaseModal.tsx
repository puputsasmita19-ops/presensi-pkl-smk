import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Cloud,
  Table,
  UploadCloud,
  X,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import {
  seedInitialDataToFirestore,
  COLLECTIONS,
} from '../services/firestoreService';
import { Siswa, DUDI, GuruPembimbing, Presensi, JurnalHarian, User, LogAktivitas, KunjunganGuru } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaList: Siswa[];
  dudiList: DUDI[];
  guruList?: GuruPembimbing[];
  presensiList: Presensi[];
  jurnalList: JurnalHarian[];
  users?: User[];
  logs?: LogAktivitas[];
  kunjunganList?: KunjunganGuru[];
  onRefreshData?: () => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  siswaList,
  dudiList,
  guruList = [],
  presensiList,
  jurnalList,
  users = [],
  logs = [],
  kunjunganList = [],
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const handleSyncAllToFirestore = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await seedInitialDataToFirestore({
        siswa: siswaList,
        dudi: dudiList,
        guru: guruList,
        presensi: presensiList,
        jurnal: jurnalList,
        users,
        logs,
        kunjungan: kunjunganList,
      });
      setSyncResult(res);
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || 'Gagal sinkronisasi data ke Firestore',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyProjectId = () => {
    navigator.clipboard.writeText(firebaseConfig.projectId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Firebase Realtime Database & Cloud Storage
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                  Aktif & Real-time
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penyimpanan data berbasis cloud NoSQL Firestore dan penyimpanan foto di Google Drive.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Status Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-amber-500" /> Database Utama
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  Firestore
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Firebase Firestore
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                ID: {(firebaseConfig as any).firestoreDatabaseId || '(default)'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-500" /> Penyimpanan Foto
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                  Google Drive
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Google Drive API (OAuth)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Folder: <span className="font-semibold text-slate-700 dark:text-slate-300">Presensi & Jurnal PKL SMK</span>
              </p>
            </div>
          </div>

          {/* Realtime Collections Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-sky-500" />
              Koleksi Real-time Firestore & Jumlah Dokumen
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Siswa PKL</span>
                <strong className="text-base font-bold text-slate-800 dark:text-slate-200">{siswaList.length}</strong>
              </div>
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-[11px] text-slate-400 block font-medium">DUDI / Mitra</span>
                <strong className="text-base font-bold text-slate-800 dark:text-slate-200">{dudiList.length}</strong>
              </div>
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Presensi</span>
                <strong className="text-base font-bold text-slate-800 dark:text-slate-200">{presensiList.length}</strong>
              </div>
              <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Jurnal Kegiatan</span>
                <strong className="text-base font-bold text-slate-800 dark:text-slate-200">{jurnalList.length}</strong>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-2 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Keunggulan Firebase Realtime:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pl-1 text-[11px]">
              <li>Tidak memerlukan server backend perantara atau konfigurasi port MySQL / TiDB.</li>
              <li>Perubahan presensi dan jurnal yang dicatat siswa langsung muncul seketika (live update) di layar DUDI dan Guru Pembimbing.</li>
              <li>Foto selfie tetap diunggah aman ke Google Drive akun Google Anda sehingga menghemat kuota dokumen Firestore.</li>
            </ul>
          </div>

          {/* Result Alert */}
          {syncResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                syncResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-900 dark:text-rose-200'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">{syncResult.success ? 'Sinkronisasi Sukses' : 'Gagal Sinkronisasi'}</p>
                <p className="text-[11px] mt-0.5">{syncResult.message}</p>
              </div>
            </div>
          )}

          {/* Project Details */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Project ID Firebase:</span>
              <div className="flex items-center gap-1.5">
                <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {firebaseConfig.projectId}
                </code>
                <button
                  onClick={handleCopyProjectId}
                  className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 transition"
                  title="Salin Project ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              Tutup
            </button>
            <button
              disabled={syncing}
              onClick={handleSyncAllToFirestore}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-95"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Menyinkronkan ke Firestore...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Sinkronkan Semua Data ke Firestore</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
