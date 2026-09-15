import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Check,
  GraduationCap,
  Building2,
  Award,
  Sparkles,
  UserCheck,
  Link2,
  Trash2,
  Eye,
  Settings,
} from 'lucide-react';
import {
  AppBrandingConfig,
  LogoPresetType,
  processLogoUpload,
  DEFAULT_BRANDING_CONFIG,
} from '../utils/appBrandingService';
import { playSyncSuccessChime } from '../utils/audioNotification';

interface AppBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppBrandingConfig;
  onSave: (config: Partial<AppBrandingConfig>) => void;
  onReset: () => void;
}

export const AppBrandingModal: React.FC<AppBrandingModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onReset,
}) => {
  const [appName, setAppName] = useState(config.appName);
  const [appTagline, setAppTagline] = useState(config.appTagline);
  const [schoolName, setSchoolName] = useState(config.schoolName);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [logoPreset, setLogoPreset] = useState<LogoPresetType>(config.logoPreset);
  const [urlInput, setUrlInput] = useState('');
  const [activeLogoTab, setActiveLogoTab] = useState<'upload' | 'preset' | 'url'>('upload');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setAppName(config.appName);
      setAppTagline(config.appTagline);
      setSchoolName(config.schoolName);
      setLogoUrl(config.logoUrl);
      setLogoPreset(config.logoPreset);
      setUrlInput(config.logoUrl.startsWith('http') ? config.logoUrl : '');
      setActiveLogoTab(config.logoUrl ? (config.logoUrl.startsWith('http') ? 'url' : 'upload') : 'preset');
      setErrorMessage(null);
      setSuccessToast(false);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Berkas yang dipilih harus berupa file gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran file gambar maksimal 5 MB.');
      return;
    }

    try {
      setIsProcessingFile(true);
      setErrorMessage(null);
      const dataUrl = await processLogoUpload(file);
      setLogoUrl(dataUrl);
      setLogoPreset('custom');
      setActiveLogoTab('upload');
    } catch (err) {
      console.error('Gagal mengolah file logo:', err);
      setErrorMessage('Gagal memproses gambar. Pastikan format gambar valid.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) {
      setErrorMessage('Masukkan tautan URL gambar logo yang valid.');
      return;
    }
    setLogoUrl(urlInput.trim());
    setLogoPreset('custom');
    setErrorMessage(null);
  };

  const handleSelectPreset = (preset: LogoPresetType) => {
    setLogoPreset(preset);
    setLogoUrl('');
    setErrorMessage(null);
  };

  const handleClearLogo = () => {
    setLogoUrl('');
    setLogoPreset('toga');
    setUrlInput('');
  };

  const handleSave = () => {
    if (!appName.trim()) {
      setErrorMessage('Nama aplikasi tidak boleh kosong.');
      return;
    }

    onSave({
      appName: appName.trim(),
      appTagline: appTagline.trim(),
      schoolName: schoolName.trim(),
      logoUrl,
      logoPreset,
    });

    try {
      playSyncSuccessChime();
    } catch {
      // Audio optional
    }

    setSuccessToast(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan nama aplikasi dan logo ke pengaturan bawaan ("Presensi PKL SMK")?')) {
      onReset();
      setAppName(DEFAULT_BRANDING_CONFIG.appName);
      setAppTagline(DEFAULT_BRANDING_CONFIG.appTagline);
      setSchoolName(DEFAULT_BRANDING_CONFIG.schoolName);
      setLogoUrl('');
      setLogoPreset('toga');
      setUrlInput('');
      setErrorMessage(null);
      try {
        playSyncSuccessChime();
      } catch {
        // ignore
      }
      onClose();
    }
  };

  const renderLogoPreview = () => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt="Logo Aplikasi"
          className="w-full h-full object-contain p-1"
          onError={() => {
            setErrorMessage('Tautan gambar logo tidak dapat dimuat. Pastikan URL valid.');
          }}
        />
      );
    }

    switch (logoPreset) {
      case 'tutwuri':
        return <Award className="w-8 h-8 text-white" />;
      case 'gedung':
        return <Building2 className="w-8 h-8 text-white" />;
      case 'bintang':
        return <Sparkles className="w-8 h-8 text-white" />;
      case 'presensi':
        return <UserCheck className="w-8 h-8 text-white" />;
      case 'toga':
      default:
        return <GraduationCap className="w-8 h-8 text-white" />;
    }
  };

  return (
    <div
      id="modal-branding-aplikasi"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 text-white">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                Sesuaikan Logo & Nama Aplikasi
              </h2>
              <p className="text-xs text-sky-100 opacity-90">
                Ubah identitas sistem presensi PKL secara instan & persisten
              </p>
            </div>
          </div>
          <button
            id="btn-close-branding-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-100 text-sm">
          {/* Alert Error / Sukses */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 cursor-pointer text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-semibold animate-pulse">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Perubahan logo & nama aplikasi berhasil disimpan!</span>
            </div>
          )}

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-sky-500" />
                Pratinjau Halaman Login
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium">
                Live Preview
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/50 shadow-xs text-center">
              {/* Logo Visual */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center shadow-md shadow-sky-500/20 overflow-hidden mb-2 border border-white/20">
                {renderLogoPreview()}
              </div>

              {/* Title & Tagline */}
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {appName.trim() || 'Presensi PKL SMK'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
                {appTagline.trim() || 'Sistem Presensi & Jurnal Praktik Kerja Lapangan'}
              </p>
            </div>
          </div>

          {/* Form Input 1: Nama Aplikasi */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Nama Aplikasi <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-branding-app-name"
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="cth: Presensi PKL SMK / SIM PKL Vokasi"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-medium text-sm transition"
              maxLength={60}
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Nama ini akan ditampilkan pada header halaman login, navbar, dan judul tab browser.
            </p>
          </div>

          {/* Form Input 2: Tagline / Subtitle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Tagline / Subtitle Aplikasi
            </label>
            <input
              id="input-branding-app-tagline"
              type="text"
              value={appTagline}
              onChange={(e) => setAppTagline(e.target.value)}
              placeholder="cth: Sistem Presensi & Jurnal Praktik Kerja Lapangan"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-sm transition"
              maxLength={100}
            />
          </div>

          {/* Bagian Ganti Logo Aplikasi */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-500" />
                Logo Aplikasi
              </label>

              {logoUrl && (
                <button
                  type="button"
                  onClick={handleClearLogo}
                  className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Hapus Logo Kustom
                </button>
              )}
            </div>

            {/* Tab Pilihan Logo: Upload / Preset / URL */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveLogoTab('upload')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeLogoTab === 'upload'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah File</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLogoTab('preset')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeLogoTab === 'preset'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Preset Ikon</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLogoTab('url')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1 ${
                  activeLogoTab === 'url'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Link URL</span>
              </button>
            </div>

            {/* Panel Tab 1: Upload File */}
            {activeLogoTab === 'upload' && (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-sky-400/50 dark:border-sky-500/30 hover:border-sky-500 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 text-center cursor-pointer transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isProcessingFile ? 'Sedang memproses gambar...' : 'Klik untuk memilih atau seret berkas logo ke sini'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Format didukung: PNG (transparan disarankan), JPG, SVG, WebP (maks. 5 MB)
                </p>
              </div>
            )}

            {/* Panel Tab 2: Preset Ikon */}
            {activeLogoTab === 'preset' && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pilih gaya simbol/ikon siap pakai untuk aplikasi:
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { id: 'toga' as LogoPresetType, name: 'Toga Vokasi', icon: <GraduationCap className="w-5 h-5" /> },
                    { id: 'tutwuri' as LogoPresetType, name: 'Edukasi', icon: <Award className="w-5 h-5" /> },
                    { id: 'gedung' as LogoPresetType, name: 'Sekolah', icon: <Building2 className="w-5 h-5" /> },
                    { id: 'bintang' as LogoPresetType, name: 'Prestasi', icon: <Sparkles className="w-5 h-5" /> },
                    { id: 'presensi' as LogoPresetType, name: 'Presensi', icon: <UserCheck className="w-5 h-5" /> },
                  ].map((p) => {
                    const isSelected = !logoUrl && logoPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition cursor-pointer text-center ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                            : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-teal-500 text-white flex items-center justify-center">
                          {p.icon}
                        </div>
                        <span className="text-[10px] font-semibold truncate w-full">{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Panel Tab 3: Link URL */}
            {activeLogoTab === 'url' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://domain-anda.com/logo-sekolah.png"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition cursor-pointer shrink-0"
                  >
                    Terapkan
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gunakan URL publik gambar logo (misal dari website sekolah atau hosting gambar).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            id="btn-branding-reset-default"
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="Kembalikan ke Nama & Logo Default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset ke</span> Bawaan
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-branding-save"
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
