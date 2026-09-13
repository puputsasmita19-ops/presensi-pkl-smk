import React, { useState, useEffect } from 'react';
import {
  getSavedGasWebhookUrl,
  setSavedGasWebhookUrl,
  getSavedGasFolderId,
  setSavedGasFolderId,
  uploadViaGasWebhook,
  GAS_DRIVE_WEBHOOK_CODE,
} from '../services/gasDriveWebhook';
import {
  getCachedAccessToken,
  setCachedAccessToken,
  requestGoogleDriveToken,
  logoutGoogle,
  getSavedGoogleClientId,
  setGoogleClientId,
} from '../services/googleAuth';
import {
  listDriveFiles,
  uploadFileToDrive,
  getOrCreatePklFolder,
  DriveFileItem,
} from '../services/googleDrive';
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
  HardDrive,
  Download,
  Copy,
  Check,
  Zap,
  Code2,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
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
  // Tab Mode: 'gas' (Praktis via Apps Script Webhook) atau 'oauth' (OAuth Client ID)
  const [activeTab, setActiveTab] = useState<'gas' | 'oauth'>('gas');

  // State Webhook GAS (Metode Praktis)
  const [gasUrlInput, setGasUrlInput] = useState<string>('');
  const [gasFolderInput, setGasFolderInput] = useState<string>('');
  const [isGasConnected, setIsGasConnected] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showGasTutorial, setShowGasTutorial] = useState<boolean>(false);

  // State OAuth Tradisional
  const [isOAuthConnected, setIsOAuthConnected] = useState<boolean>(false);
  const [clientIdInput, setClientIdInput] = useState<string>('');
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [files, setFiles] = useState<DriveFileItem[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Muat data GAS Webhook
      const savedUrl = getSavedGasWebhookUrl();
      const savedFolder = getSavedGasFolderId();
      setGasUrlInput(savedUrl);
      setGasFolderInput(savedFolder);
      setIsGasConnected(!!savedUrl);

      // Muat data OAuth
      setClientIdInput(getSavedGoogleClientId());
      const token = getCachedAccessToken();
      setIsOAuthConnected(!!token);

      if (savedUrl) {
        setActiveTab('gas');
      } else if (token) {
        setActiveTab('oauth');
        fetchOAuthFiles();
      }
    }
  }, [isOpen]);

  // ===================== METODE PRAKTIS: GOOGLE APPS SCRIPT WEBHOOK =====================
  const handleSaveGasConfig = () => {
    const trimmed = gasUrlInput.trim();
    if (!trimmed) {
      setStatusMsg({
        type: 'error',
        text: 'Masukkan URL Web App Google Apps Script Anda (dimulai dengan https://script.google.com/macros/s/...).',
      });
      return;
    }

    if (!trimmed.includes('script.google.com')) {
      setStatusMsg({
        type: 'warning',
        text: 'URL tampak tidak valid. Pastikan URL berasal dari Web App Google Apps Script.',
      });
      return;
    }

    setSavedGasWebhookUrl(trimmed);
    setSavedGasFolderId(gasFolderInput.trim());
    setIsGasConnected(true);
    if (onConnectionChange) onConnectionChange(true);

    setStatusMsg({
      type: 'success',
      text: 'Google Drive Webhook berhasil disimpan! Kini cadangan dan file siap diunggah langsung ke Drive tanpa perlu verifikasi OAuth.',
    });
  };

  const handleDisconnectGas = () => {
    setSavedGasWebhookUrl('');
    setSavedGasFolderId('');
    setGasUrlInput('');
    setGasFolderInput('');
    setIsGasConnected(false);
    if (onConnectionChange) onConnectionChange(false);
    setStatusMsg({
      type: 'success',
      text: 'Koneksi Google Drive Webhook telah diputus.',
    });
  };

  const handleBackupViaGas = async () => {
    if (!gasUrlInput.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'Silakan isi URL Web App Google Apps Script Anda terlebih dahulu.',
      });
      return;
    }

    const confirmed = window.confirm(
      'Apakah Anda ingin mengirimkan cadangan data Presensi dan Jurnal PKL langsung ke Google Drive?'
    );
    if (!confirmed) return;

    setIsLoading(true);
    setStatusMsg(null);

    try {
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

      const result = await uploadViaGasWebhook(
        fileName,
        JSON.stringify(backupData, null, 2),
        'application/json',
        gasUrlInput.trim(),
        gasFolderInput.trim()
      );

      setStatusMsg({
        type: 'success',
        text: `Sukses disimpan di Google Drive! File: ${fileName}. ${result.url ? `(URL Berkas Tersedia)` : ''}`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal mengirim file ke Google Drive melalui Webhook.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyGasScript = () => {
    navigator.clipboard.writeText(GAS_DRIVE_WEBHOOK_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // ===================== METODE ALTERNATIF: OAUTH =====================
  const fetchOAuthFiles = async () => {
    setIsLoading(true);
    try {
      const driveFiles = await listDriveFiles();
      setFiles(driveFiles);
    } catch (err: any) {
      console.warn('OAuth fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectOAuth = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      await requestGoogleDriveToken(clientIdInput);
      setIsOAuthConnected(true);
      if (onConnectionChange) onConnectionChange(true);
      setStatusMsg({
        type: 'success',
        text: 'Akun Google Drive berhasil terhubung via OAuth!',
      });
      await fetchOAuthFiles();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal mengautentikasi akun Google Drive.',
      });
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
    setIsOAuthConnected(true);
    if (onConnectionChange) onConnectionChange(true);
    setStatusMsg({
      type: 'success',
      text: 'Akses token Google berhasil diterapkan!',
    });
    setManualTokenInput('');
    await fetchOAuthFiles();
  };

  const handleBackupViaOAuth = async () => {
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
        text: `Sukses mencadangkan ke Google Drive! File: ${fileName}`,
      });
      await fetchOAuthFiles();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || 'Gagal mencadangkan ke Google Drive.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Unduh Berkas JSON Lokal
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

  if (!isOpen) return null;

  const currentIsConnected = activeTab === 'gas' ? isGasConnected : isOAuthConnected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[92vh] transition-colors">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30 flex items-center justify-center shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Google Drive Storage & Cadangan</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Penyimpanan Foto Selfie Presensi & Arsip Cadangan PKL
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

        {/* Tab Pilihan Metode */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40 p-1.5 gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('gas')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'gas'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Cara Praktis: Web App Script (Rekomendasi)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'oauth'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>OAuth Client ID</span>
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

          {/* TAB 1: CARA PRAKTIS DENGAN GOOGLE APPS SCRIPT WEBHOOK */}
          {activeTab === 'gas' && (
            <div className="space-y-4">
              {/* Card Status */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 dark:text-slate-300 font-semibold text-xs">
                      Status Google Drive Webhook:
                    </span>
                    {isGasConnected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Terhubung Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                        Belum Diatur
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Bebas masalah <em>"Akses diblokir"</em> atau verifikasi Google Cloud. File langsung masuk ke Drive Anda.
                  </p>
                </div>

                {isGasConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnectGas}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/50 hover:bg-rose-200 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-semibold cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Input URL Web App */}
              <div className="space-y-2">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                  URL Web App Google Apps Script:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={gasUrlInput}
                    onChange={(e) => setGasUrlInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveGasConfig}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs active:scale-95 transition"
                  >
                    Simpan
                  </button>
                </div>
              </div>

              {/* Input ID Folder (Opsional) */}
              <div className="space-y-1">
                <label className="block text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                  ID Folder Google Drive (Opsional, kosongkan untuk buat folder otomatis &quot;Presensi &amp; Jurnal PKL SMK&quot;):
                </label>
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="contoh: 1a2B3c4D5e... (ada di link folder Drive Anda)"
                    value={gasFolderInput}
                    onChange={(e) => setGasFolderInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Panduan 3 Menit Setup */}
              <div className="border border-sky-200 dark:border-sky-800/60 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-sky-950 dark:text-sky-300 text-xs">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span>Cara Mendapatkan URL Web App (Hanya 3 Menit):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGasTutorial(!showGasTutorial)}
                    className="text-sky-600 dark:text-sky-400 hover:underline text-[11px] font-semibold cursor-pointer"
                  >
                    {showGasTutorial ? 'Sembunyikan' : 'Lihat Langkah'}
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p>1. Buka <strong>script.google.com</strong> &gt; klik <strong>Project Baru</strong>.</p>
                  <p>2. Hapus kode bawaan, lalu salin dan tempel kode script di bawah.</p>
                  <p>3. Klik tombol biru <strong>Terapkan (Deploy)</strong> di kanan atas &gt; <strong>Deployment baru</strong>.</p>
                  <p>4. Pilih jenis <strong>Aplikasi Web</strong> (Web app):</p>
                  <div className="pl-3 border-l-2 border-sky-400 space-y-0.5 text-slate-600 dark:text-slate-400">
                    <div>• Jalankan sebagai (Execute as): <strong>Saya (email Anda)</strong></div>
                    <div>• Siapa yang memiliki akses (Who has access): <strong>Siapa saja (Anyone)</strong></div>
                  </div>
                  <p>5. Klik <strong>Terapkan</strong>, izinkan akses, lalu salin <strong>URL Aplikasi Web</strong> dan tempel di atas.</p>
                </div>

                {/* Tombol Salin Script GAS */}
                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyGasScript}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Script Berhasil Disalin!' : 'Salin Kode Script Google Drive'}</span>
                  </button>
                  <a
                    href="https://script.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition flex items-center gap-1"
                  >
                    <span>Buka script.google.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: METODE OAUTH CLIENT ID */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 dark:text-slate-300 font-semibold text-xs">
                      Status OAuth Client ID:
                    </span>
                    {isOAuthConnected ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-bold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Terhubung
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                        Belum Terhubung
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Jika muncul <em>&quot;Akses diblokir&quot;</em>, tambahkan email Anda ke <strong>Test Users</strong> di Google Cloud Console.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isOAuthConnected ? (
                    <button
                      type="button"
                      onClick={handleConnectOAuth}
                      disabled={isLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow-xs cursor-pointer text-xs flex items-center gap-1.5"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Menghubungkan...' : 'Login Google'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        logoutGoogle();
                        setIsOAuthConnected(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold cursor-pointer"
                    >
                      Putus
                    </button>
                  )}
                </div>
              </div>

              {/* Input Client ID */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs">
                  Google Client ID:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="123456...apps.googleusercontent.com"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleClientId(clientIdInput.trim());
                      setStatusMsg({ type: 'success', text: 'Client ID disimpan.' });
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Simpan
                  </button>
                </div>
              </div>

              {/* Opsi Token Manual */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                  Tempel Access Token Manual (dari Google OAuth Playground):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="ya29.a0..."
                    value={manualTokenInput}
                    onChange={(e) => setManualTokenInput(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyManualToken}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AKSI PENCADANGAN (BACKUP ACTION) */}
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
                onClick={activeTab === 'gas' ? handleBackupViaGas : handleBackupViaOAuth}
                disabled={isLoading || !currentIsConnected}
                className={`px-3.5 py-2 rounded-xl font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 ${
                  currentIsConnected
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
