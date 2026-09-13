import React, { useState, useEffect } from 'react';
import {
  listDriveFiles,
  uploadFileToDrive,
  getOrCreatePklFolder,
  DriveFileItem,
} from '../services/googleDrive';
import {
  getCachedAccessToken,
  setCachedAccessToken,
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
  Copy,
  Check,
  KeyRound,
  Download,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  presensiList: Presensi[];
  jurnalList: JurnalHarian[];
  siswaList: Siswa[];
  dudiList: DUDI[];
  onConnectionChange?: (connected: boolean) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  presensiList,
  jurnalList,
  siswaList,
  dudiList,
  onConnectionChange,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);

  // Unauthorized Domain Guidance State
  const [isDomainError, setIsDomainError] = useState<boolean>(false);
  const [currentHostname, setCurrentHostname] = useState<string>('');
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);

  // Manual OAuth Token Input State
  const [showManualToken, setShowManualToken] = useState<boolean>(false);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentHostname(window.location.hostname);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      checkDriveStatus();
    }
  }, [isOpen]);

  const checkDriveStatus = async () => {
    const token = getCachedAccessToken();
    if (token) {
      setIsConnected(true);
      if (onConnectionChange) onConnectionChange(true);
      fetchFiles();
    } else {
      setIsConnected(false);
      if (onConnectionChange) onConnectionChange(false);
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
      // Jika token expired
      if (err?.message?.includes('401') || err?.message?.includes('Invalid Credentials')) {
        setCachedAccessToken(null);
        setIsConnected(false);
        if (onConnectionChange) onConnectionChange(false);
        setStatusMsg({
          type: 'error',
          text: 'Sesi Google Drive telah berakhir. Silakan hubungkan kembali akun Google Anda.',
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: err?.message || 'Gagal memuat daftar file dari Google Drive.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    setIsDomainError(false);

    try {
      await signInWithGoogle();
      setIsConnected(true);
      if (onConnectionChange) onConnectionChange(true);
      setStatusMsg({
        type: 'success',
        text: 'Alhamdulillah, akun Google Drive berhasil terhubung!',
      });
      await fetchFiles();
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isUnauthorized =
        err?.code === 'auth/unauthorized-domain' ||
        errMsg.includes('auth/unauthorized-domain') ||
        errMsg.includes('unauthorized domain');

      if (isUnauthorized) {
        setIsDomainError(true);
        setStatusMsg({
          type: 'error',
          text: `Domain web "${currentHostname}" belum diizinkan di Firebase Console. Ikuti panduan di bawah untuk mengizinkannya atau gunakan opsi token manual.`,
        });
      } else if (err?.code === 'auth/popup-blocked') {
        setStatusMsg({
          type: 'warning',
          text: 'Jendela pop-up Google Sign-In diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.',
        });
      } else if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
        setStatusMsg({
          type: 'warning',
          text: 'Proses login Google dibatalkan sebelum selesai.',
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: errMsg || 'Gagal mengautentikasi akun Google Drive.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyManualToken = async () => {
    const trimmed = manualTokenInput.trim();
    if (!trimmed) {
      alert('Masukkan OAuth Access Token Google yang valid.');
      return;
    }

    setCachedAccessToken(trimmed);
    setIsConnected(true);
    if (onConnectionChange) onConnectionChange(true);
    setStatusMsg({
      type: 'success',
      text: 'Akses token manual berhasil diterapkan. Memeriksa akses ke Google Drive...',
    });
    setManualTokenInput('');
    await fetchFiles();
  };

  const handleDisconnect = async () => {
    await logoutFirebase();
    setIsConnected(false);
    if (onConnectionChange) onConnectionChange(false);
    setFiles([]);
    setStatusMsg({
      type: 'success',
      text: 'Koneksi Google Drive telah diputus.',
    });
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
      const targetFolderId = await getOrCreatePklFolder();
      setFolderId(targetFolderId);

      const backupData = {
        timestamp: new Date().toISOString(),
        metadata: {
          app: 'Sistem Presensi & Jurnal PKL SMK',
          sekolah: 'SMK PKL Digital',
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

  const handleDownloadLocalBackup = () => {
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

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_PKL_Lokal_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh] transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Google Drive Integration
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Penyimpanan Foto Selfie & Cadangan Dokumen Cloud PKL
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

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : statusMsg.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
                  : 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : statusMsg.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              )}
              <span className="leading-relaxed">{statusMsg.text}</span>
            </div>
          )}

          {/* Special Guidance: Unauthorized Domain Fix */}
          {isDomainError && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Solusi Mengatasi "auth/unauthorized-domain":</span>
                </div>
              </div>
              <p className="text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed">
                Google Firebase memblokir login karena domain web ini belum dimasukkan ke daftar domain yang diizinkan (*Authorized Domains*).
              </p>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900 flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
                  {currentHostname || 'Domain Anda'}
                </span>
                <button
                  type="button"
                  onClick={copyDomain}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 transition cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDomain ? 'Tersalin' : 'Salin Domain'}</span>
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900 dark:text-amber-300 pl-1">
                <li>Buka <strong>Firebase Console</strong> &gt; pilih project Anda.</li>
                <li>Pilih menu <strong>Build</strong> &gt; <strong>Authentication</strong> &gt; tab <strong>Settings</strong>.</li>
                <li>Di bagian <strong>Authorized domains</strong>, klik <strong>Add domain</strong>, tempel domain di atas, lalu klik <strong>Save</strong>.</li>
              </ol>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 dark:text-slate-300 font-semibold text-xs">
                  Status Akun Google Drive:
                </span>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terhubung Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Belum Terhubung
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {isConnected
                  ? 'Siap menyimpan berkas foto selfie presensi dan arsip cadangan data PKL.'
                  : 'Masuk dengan Akun Google untuk mengaktifkan folder penyimpanan Google Drive.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isConnected ? (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow-xs cursor-pointer text-xs flex items-center gap-1.5 active:scale-95"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Menghubungkan...' : 'Hubungkan Google Drive'}</span>
                </button>
              ) : (
                <>
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
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition cursor-pointer text-xs font-semibold"
                  >
                    Putus
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Opsi Cadangan Alternatif: Token Manual Google */}
          {!isConnected && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowManualToken(!showManualToken)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition"
              >
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>Opsi Alternatif: Gunakan Google OAuth Token Manual</span>
                </div>
                {showManualToken ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showManualToken && (
                <div className="p-3 bg-white dark:bg-slate-900 space-y-2 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Jika Anda memiliki Google OAuth Access Token (misalnya dari OAuth Playground atau Google Workspace), Anda dapat menempelkannya di sini:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="Tempel OAuth Access Token (ya29...)"
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleApplyManualToken}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backup Actions */}
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sky-950 dark:text-sky-200 text-xs">
                Cadangan Data PKL Sekolah
              </h4>
              <p className="text-[11px] text-sky-800/80 dark:text-slate-400 mt-0.5">
                Arsip lengkap: {siswaList.length} siswa, {dudiList.length} DUDI, {presensiList.length} presensi, {jurnalList.length} jurnal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <button
                  type="button"
                  onClick={handleBackupToDrive}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Cadangkan ke Drive</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadLocalBackup}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                title="Unduh file .JSON ke komputer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh JSON</span>
              </button>
            </div>
          </div>

          {/* Files List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 dark:text-slate-300 text-xs">
                File Dokumen di Google Drive:
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                {files.length} file ditemukan
              </span>
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
                    Klik tombol <strong>Cadangkan ke Drive</strong> di atas untuk membuat arsip pertama.
                  </p>
                )}
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {file.name}
                        </div>
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
