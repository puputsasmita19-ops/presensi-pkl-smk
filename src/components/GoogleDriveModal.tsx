import React, { useState, useEffect } from 'react';
import {
  getCachedAccessToken,
  setCachedAccessToken,
  requestGoogleDriveToken,
  logoutGoogle,
  getSavedGoogleClientId,
  setGoogleClientId,
  getConnectedGoogleUser,
  GoogleUserProfile,
  PROVISIONED_CLIENT_ID,
} from '../services/googleAuth';
import {
  listDriveFiles,
  uploadFileToDrive,
  getOrCreatePklFolder,
  resetCachedPklFolderId,
  DriveFileItem,
} from '../services/googleDrive';
import {
  CompressionPreset,
  getSavedCompressionPreset,
  setSavedCompressionPreset,
  COMPRESSION_PRESETS,
} from '../utils/imageCompressor';
import { Presensi, JurnalHarian, Siswa, DUDI } from '../types';
import {
  Cloud,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  ExternalLink,
  X,
  Lock,
  Download,
  Copy,
  Check,
  Zap,
  FolderOpen,
  ShieldCheck,
  RefreshCw,
  User as UserIcon,
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
  const [isOAuthConnected, setIsOAuthConnected] = useState<boolean>(false);
  const [connectedUser, setConnectedUser] = useState<GoogleUserProfile | null>(null);
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [pklFolderId, setPklFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [showAdvancedOAuth, setShowAdvancedOAuth] = useState<boolean>(false);
  const [copiedFolderId, setCopiedFolderId] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>(getSavedCompressionPreset());
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCompressionPreset(getSavedCompressionPreset());

      const activeClientId = getSavedGoogleClientId() || PROVISIONED_CLIENT_ID;
      setClientIdInput(activeClientId);
      const token = getCachedAccessToken();
      setIsOAuthConnected(!!token);
      setConnectedUser(getConnectedGoogleUser());

      if (token) {
        fetchOAuthFiles();
        loadPklFolderInfo();
      }
    }
  }, [isOpen]);

  const loadPklFolderInfo = async () => {
    try {
      const fid = await getOrCreatePklFolder();
      setPklFolderId(fid);
    } catch (e) {
      console.warn('Folder PKL Google Drive belum siap:', e);
    }
  };

  const fetchOAuthFiles = async () => {
    setIsLoading(true);
    try {
      const driveFiles = await listDriveFiles();
      setFiles(driveFiles);
    } catch (err: any) {
      console.warn('Gagal memuat berkas Google Drive:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectOAuth = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const token = await requestGoogleDriveToken(clientIdInput);
      if (token) {
        setIsOAuthConnected(true);
        const user = getConnectedGoogleUser();
        setConnectedUser(user);
        if (onConnectionChange) onConnectionChange(true);
        setStatusMsg({
          type: 'success',
          text: 'Akun Google Drive berhasil terhubung! Foto presensi siswa dan berkas cadangan otomatis tersimpan di Google Drive.',
        });
        await loadPklFolderInfo();
        await fetchOAuthFiles();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal mengautentikasi akun Google Drive. Pastikan pop-up diizinkan di browser Anda.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectOAuth = async () => {
    await logoutGoogle();
    resetCachedPklFolderId();
    setIsOAuthConnected(false);
    setConnectedUser(null);
    setPklFolderId(null);
    setFiles([]);
    if (onConnectionChange) onConnectionChange(false);
    setStatusMsg({
      type: 'success',
      text: 'Koneksi akun Google Drive berhasil diputuskan.',
    });
  };

  const handleApplyManualToken = async () => {
    const trimmed = manualTokenInput.trim();
    if (!trimmed) {
      setStatusMsg({ type: 'warning', text: 'Masukkan OAuth Access Token Google yang valid.' });
      return;
    }
    setCachedAccessToken(trimmed);
    setIsOAuthConnected(true);
    if (onConnectionChange) onConnectionChange(true);
    setStatusMsg({
      type: 'success',
      text: 'Akses token Google berhasil diterapkan!',
    });
    setManualTokenInput('');
    await loadPklFolderInfo();
    await fetchOAuthFiles();
  };

  const handleBackupToDrive = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      const targetFolderId = await getOrCreatePklFolder();
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
        text: `Sukses mencadangkan ke Google Drive! Berkas: ${fileName}`,
      });
      await fetchOAuthFiles();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal mencadangkan data ke Google Drive.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyFolderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedFolderId(true);
    setTimeout(() => setCopiedFolderId(false), 2000);
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

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Cadangan_PKL_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePresetChange = (preset: CompressionPreset) => {
    setCompressionPreset(preset);
    setSavedCompressionPreset(preset);
    setStatusMsg({
      type: 'success',
      text: `Pengaturan kompresi foto diubah ke mode "${COMPRESSION_PRESETS[preset].name}".`,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                Penyimpanan Google Drive
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Otentikasi OAuth Client ID Resmi &amp; Kompresi Foto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="leading-relaxed">{statusMsg.text}</span>
            </div>
          )}

          {/* Kartu Status & Hubungkan Akun Google */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-800 dark:text-slate-300 font-semibold text-xs">
                  Status Akun Google Drive:
                </span>
                {isOAuthConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terhubung &amp; Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                    Siap Dihubungkan
                  </span>
                )}
              </div>

              {isOAuthConnected && (
                <button
                  type="button"
                  onClick={handleDisconnectOAuth}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[11px] font-semibold cursor-pointer transition"
                >
                  Putus Akun
                </button>
              )}
            </div>

            {/* Profil Terhubung / Tombol Login */}
            {isOAuthConnected ? (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {connectedUser?.photoURL ? (
                    <img
                      src={connectedUser.photoURL}
                      alt="Avatar Google"
                      className="w-10 h-10 rounded-full border border-slate-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 flex items-center justify-center font-bold text-sm shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                      {connectedUser?.displayName || 'Akun Google Terhubung'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {connectedUser?.email || 'Izin Google Drive Aktif'}
                    </div>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold shrink-0">
                  OAuth Aktif
                </span>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>OAuth Client ID Resmi Google Cloud</strong> sudah disetel otomatis. Cukup klik tombol di bawah untuk menghubungkan akun Google Drive Anda.
                  </span>
                </div>

                {/* Tombol Resmi Sign In with Google */}
                <button
                  type="button"
                  onClick={handleConnectOAuth}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold border border-slate-300 dark:border-slate-600 shadow-xs transition flex items-center justify-center gap-3 cursor-pointer active:scale-98"
                >
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                  <span>{isLoading ? 'Menghubungkan ke Google...' : 'Hubungkan Akun Google Drive (OAuth)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Info Folder Google Drive */}
          {isOAuthConnected && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    Folder Penyimpanan: &quot;Presensi &amp; Jurnal PKL SMK&quot;
                  </span>
                </div>
                {pklFolderId && (
                  <a
                    href={`https://drive.google.com/drive/folders/${pklFolderId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sky-600 dark:text-sky-400 hover:bg-slate-50 text-[11px] font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <span>Buka di Google Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {pklFolderId ? (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                    ID Folder Drive:
                  </span>
                  <code className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-xs">
                    {pklFolderId}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyFolderId(pklFolderId)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    title="Salin ID Folder"
                  >
                    {copiedFolderId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Folder khusus akan dibuat otomatis saat pertama kali foto presensi atau cadangan diunggah.
                </p>
              )}
            </div>
          )}

          {/* Pengaturan Lanjutan (Advanced OAuth) */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedOAuth(!showAdvancedOAuth)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Pengaturan Lanjutan OAuth Client ID</span>
              </span>
              {showAdvancedOAuth ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedOAuth && (
              <div className="p-3.5 space-y-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                <div className="space-y-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                    Google Client ID Aktif:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={clientIdInput}
                      onChange={(e) => setClientIdInput(e.target.value)}
                      placeholder="Client ID Google Cloud..."
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setGoogleClientId(clientIdInput.trim());
                        setStatusMsg({ type: 'success', text: 'Client ID berhasil diperbarui.' });
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Bawaan Sistem: <code>{PROVISIONED_CLIENT_ID || 'Client ID Terpasang'}</code>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                    Tempel Access Token Manual (Opsional):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="ya29.a0..."
                      value={manualTokenInput}
                      onChange={(e) => setManualTokenInput(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleApplyManualToken}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Daftar Berkas Terakhir di Google Drive */}
          {isOAuthConnected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                  Berkas Terakhir di Google Drive ({files.length}):
                </span>
                <button
                  type="button"
                  onClick={fetchOAuthFiles}
                  className="text-sky-600 dark:text-sky-400 hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {files.length > 0 ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto bg-slate-50/50 dark:bg-slate-800/40">
                  {files.map((file) => (
                    <div key={file.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                          {file.name}
                        </span>
                      </div>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sky-600 hover:text-sky-700 p-1 shrink-0"
                          title="Buka Berkas"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-[11px]">
                  Belum ada berkas di Google Drive.
                </div>
              )}
            </div>
          )}

          {/* Pengaturan Kompresi Foto Otomatis */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Kompresi Foto Otomatis Hemat Ruang &amp; Kuota</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Foto selfie presensi dikompresi sebelum diunggah ke Google Drive (menghemat hingga 95% ruang).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {(Object.keys(COMPRESSION_PRESETS) as CompressionPreset[]).map((key) => {
                const preset = COMPRESSION_PRESETS[key];
                const isSelected = compressionPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handlePresetChange(key)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-500 text-sky-950 dark:text-sky-200 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">{preset.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                    </div>
                    <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {preset.estimatedSize}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cadangan Data PKL */}
          <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sky-950 dark:text-sky-200 text-xs">
                Cadangan Data PKL Sekolah
              </h4>
              <p className="text-[11px] text-sky-800/80 dark:text-slate-400 mt-0.5">
                Total: {siswaList.length} siswa, {dudiList.length} DUDI, {presensiList.length} presensi, {jurnalList.length} jurnal.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBackupToDrive}
                disabled={isLoading || !isOAuthConnected}
                className={`px-3.5 py-2 rounded-xl font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  isOAuthConnected
                    ? 'bg-sky-600 hover:bg-sky-500 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Mengunggah...' : 'Cadangkan ke Drive'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadLocalBackup}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95"
                title="Unduh file .JSON ke komputer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Unduh JSON</span>
              </button>
            </div>
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
