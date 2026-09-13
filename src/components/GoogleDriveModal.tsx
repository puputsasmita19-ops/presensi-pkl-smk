import React, { useState, useEffect } from 'react';
import {
  listDriveFiles,
  uploadFileToDrive,
  getOrCreatePklFolder,
  DriveFileItem,
} from '../services/googleDrive';
import {
  getCachedAccessToken,
  signInWithGoogle,
  logoutFirebase,
} from '../services/firebase';
import { Presensi, JurnalHarian, Siswa, DUDI } from '../types';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  UploadCloud,
  FileText,
  ExternalLink,
  RefreshCw,
  X,
  Lock,
  HardDrive,
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  presensiList: Presensi[];
  jurnalList: JurnalHarian[];
  siswaList: Siswa[];
  dudiList: DUDI[];
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  presensiList,
  jurnalList,
  siswaList,
  dudiList,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkDriveStatus();
    }
  }, [isOpen]);

  const checkDriveStatus = async () => {
    const token = getCachedAccessToken();
    if (token) {
      setIsConnected(true);
      fetchFiles();
    } else {
      setIsConnected(false);
      setFiles([]);
    }
  };

  const fetchFiles = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const driveFiles = await listDriveFiles();
      setFiles(driveFiles);
    } catch (err: any) {
      console.warn('Drive fetch notice:', err);
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal memuat file Google Drive.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      await signInWithGoogle();
      setIsConnected(true);
      setStatusMsg({
        type: 'success',
        text: 'Berhasil terhubung ke Google Drive!',
      });
      await fetchFiles();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal mengautentikasi akun Google Drive.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupToDrive = async () => {
    const token = getCachedAccessToken();
    if (!token) {
      setStatusMsg({
        type: 'error',
        text: 'Silakan hubungkan akun Google terlebih dahulu.',
      });
      return;
    }

    const confirmed = window.confirm(
      'Apakah Anda ingin membuat cadangan data Presensi dan Jurnal PKL ke Google Drive?'
    );
    if (!confirmed) return;

    setIsLoading(true);
    setStatusMsg(null);

    try {
      // 1. Get or create folder
      const targetFolderId = await getOrCreatePklFolder();
      setFolderId(targetFolderId);

      // 2. Prepare payload
      const backupData = {
        timestamp: new Date().toISOString(),
        metadata: {
          app: 'Sistem Presensi & Jurnal PKL SMK',
          totalPresensi: presensiList.length,
          totalJurnal: jurnalList.length,
          totalSiswa: siswaList.length,
          totalDudi: dudiList.length,
        },
        presensi: presensiList,
        jurnal: jurnalList,
        siswa: siswaList,
        dudi: dudiList,
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Backup_Data_PKL_${dateStr}.json`;

      await uploadFileToDrive(
        fileName,
        JSON.stringify(backupData, null, 2),
        'application/json',
        targetFolderId
      );

      setStatusMsg({
        type: 'success',
        text: `Sukses mencadangkan ke Google Drive (Folder: "Presensi & Jurnal PKL SMK", File: ${fileName})!`,
      });

      await fetchFiles();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal mencadangkan ke Google Drive.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">Google Drive Integration</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Sinkronisasi Dokumen & Cadangan Cloud PKL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              )}
              <span className="leading-relaxed">{statusMsg.text}</span>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800 dark:text-slate-300 font-semibold">Status Google Drive:</span>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold text-[10px]">
                    <CheckCircle2 className="w-3 h-3" />
                    Terhubung
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium text-[10px]">
                    <Lock className="w-3 h-3" />
                    Belum Terhubung
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isConnected
                  ? 'Siap menyimpan data presensi, laporan spreadsheet, dan jurnal PKL.'
                  : 'Masuk dengan Akun Google untuk mengaktifkan sinkronisasi cloud.'}
              </p>
            </div>

            {!isConnected ? (
              <button
                type="button"
                onClick={handleConnectGoogle}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-400 dark:text-sky-600" />
                <span>Hubungkan Drive</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={fetchFiles}
                disabled={isLoading}
                className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer text-xs flex items-center gap-1"
                title="Muat Ulang File"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            )}
          </div>

          {/* Backup Action */}
          {isConnected && (
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sky-900 dark:text-sky-200">Cadangkan Data PKL ke Google Drive</h4>
                  <p className="text-[11px] text-sky-700/80 dark:text-slate-400">
                    Otomatis membuat folder & menyimpan arsip data sekolah
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackupToDrive}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Cadangkan Sekarang</span>
                </button>
              </div>
            </div>
          )}

          {/* Files List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 dark:text-slate-300">File Dokumen di Google Drive:</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{files.length} file ditemukan</span>
            </div>

            {isLoading ? (
              <div className="p-6 text-center text-slate-400">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>Menghubungi Google Drive API...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400">
                <HardDrive className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
                <p>Belum ada file cadangan PKL di Google Drive Anda.</p>
                {isConnected && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Klik tombol <strong>Cadangkan Sekarang</strong> di atas untuk membuat file pertama.
                  </p>
                )}
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {file.createdTime ? new Date(file.createdTime).toLocaleString('id-ID') : 'Drive'}
                        </div>
                      </div>
                    </div>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded transition shrink-0 ml-2"
                        title="Buka di Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
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
