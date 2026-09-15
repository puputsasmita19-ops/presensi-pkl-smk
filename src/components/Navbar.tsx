import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Role } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { RealtimeClockBar } from './RealtimeClockBar';
import { DbStatusResponse } from '../utils/apiService';
import { useAppBranding } from '../utils/appBrandingService';
import { AppBrandingModal } from './AppBrandingModal';
import {
  Camera,
  BookOpen,
  Database,
  FileText,
  Code2,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  LogOut,
  Cloud,
  Activity,
  Building2,
  Wifi,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
  MapPin,
  BarChart3,
  SlidersHorizontal,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Award,
  Settings,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onRoleChange?: (role: Role) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenWhatsAppModal: () => void;
  onOpenGoogleDrive?: () => void;
  onOpenDatabaseModal?: () => void;
  dbStatus?: DbStatusResponse | null;
  onLogout?: () => void;
  isGoogleConnected?: boolean;
  isOnline?: boolean;
  pendingOfflineCount?: number;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
  syncProgress?: number;
  syncPhase?: 'idle' | 'offline' | 'reconnecting' | 'syncing' | 'completed';
  isDarkMode?: boolean;
  onToggleDarkMode?: (e?: React.MouseEvent<HTMLElement>) => void;
  onOpenProfilSiswa?: () => void;
  onOpenWalkthrough?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRoleChange,
  activeTab,
  onTabChange,
  onOpenWhatsAppModal,
  onOpenGoogleDrive,
  onOpenDatabaseModal,
  dbStatus,
  onLogout,
  isGoogleConnected,
  isOnline = true,
  pendingOfflineCount = 0,
  onTriggerSync,
  isSyncing = false,
  syncProgress = 0,
  syncPhase = 'idle',
  isDarkMode = false,
  onToggleDarkMode,
  onOpenProfilSiswa,
  onOpenWalkthrough,
}) => {
  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'Admin':
        return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
      case 'Guru Pembimbing':
        return <UserCheck className="w-3.5 h-3.5 text-sky-400" />;
      case 'DUDI':
        return <Building2 className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Siswa':
      default:
        return <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getRoleBadgeBg = (role: Role) => {
    switch (role) {
      case 'Admin':
        return 'bg-amber-500/20 border-amber-500/30 text-amber-300';
      case 'Guru Pembimbing':
        return 'bg-sky-500/20 border-sky-500/30 text-sky-300';
      case 'DUDI':
        return 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300';
      case 'Siswa':
      default:
        return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300';
    }
  };

  const getRoleLabelFormatted = (role: Role) => {
    switch (role) {
      case 'Admin':
        return 'Admin PKL';
      case 'Guru Pembimbing':
        return 'Guru Pembimbing';
      case 'DUDI':
        return 'Pembina DUDI';
      case 'Siswa':
      default:
        return 'Siswa PKL';
    }
  };

  // Running Marquee Status Component to avoid colliding with WiFi & action icons
  const UserStatusMarquee: React.FC<{
    name: string;
    role: Role;
    isSiswaWithProfile?: boolean;
  }> = ({ name, role, isSiswaWithProfile }) => {
    const roleLabel = getRoleLabelFormatted(role);
    const statusText = `${name} (${roleLabel})`;

    return (
      <div
        className="relative overflow-hidden w-full max-w-[140px] xs:max-w-[190px] sm:max-w-[280px] md:max-w-[360px] select-none py-0.5"
        title={statusText}
      >
        {/* Soft edge blur masks so the running text enters and leaves seamlessly */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-slate-800 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-3.5 bg-gradient-to-l from-slate-800 to-transparent z-10" />

        {/* Marquee Animation Track */}
        <div className="animate-running-marquee-nav flex items-center gap-6 whitespace-nowrap text-xs">
          <span className="font-bold text-slate-200 shrink-0 inline-flex items-center gap-1">
            <span className="text-white">{name}</span>
            <span className="text-sky-400 font-semibold text-[11px]">({roleLabel})</span>
            {isSiswaWithProfile && (
              <span className="text-emerald-400 text-[9px] font-bold ml-0.5">• Profil</span>
            )}
          </span>
          <span className="text-slate-600 font-bold shrink-0">•</span>
          <span className="font-bold text-slate-200 shrink-0 inline-flex items-center gap-1">
            <span className="text-white">{name}</span>
            <span className="text-sky-400 font-semibold text-[11px]">({roleLabel})</span>
            {isSiswaWithProfile && (
              <span className="text-emerald-400 text-[9px] font-bold ml-0.5">• Profil</span>
            )}
          </span>
          <span className="text-slate-600 font-bold shrink-0">•</span>
        </div>
      </div>
    );
  };

  const navScrollRef = useRef<HTMLDivElement | null>(null);

  // App Branding & Identity (Nama Aplikasi & Logo Kustom)
  const { branding, updateBranding, resetBranding } = useAppBranding();
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);

  const renderNavbarLogo = () => {
    if (branding.logoUrl) {
      return (
        <img
          src={branding.logoUrl}
          alt={branding.appName}
          className="w-full h-full object-contain p-0.5 rounded-xs"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    switch (branding.logoPreset) {
      case 'tutwuri':
        return <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />;
      case 'gedung':
        return <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />;
      case 'bintang':
        return <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />;
      case 'presensi':
        return <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />;
      case 'toga':
      default:
        return <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />;
    }
  };

  // Auto scroll active tab into view on mobile
  useEffect(() => {
    if (navScrollRef.current) {
      const activeEl = navScrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeTab]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Fitur Waktu Realtime di Bagian Paling Atas (di atas menu) */}
      <RealtimeClockBar />

      {/* Top Header */}
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
        {/* App Branding (Logo & Nama Aplikasi) & User Identity */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          {/* App Brand Badge / Admin Quick Edit */}
          <button
            id="btn-navbar-branding"
            type="button"
            onClick={() => currentUser.role === 'Admin' && setIsBrandingModalOpen(true)}
            className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center gap-1.5 sm:gap-2 shrink-0 transition ${
              currentUser.role === 'Admin'
                ? 'hover:border-sky-500/60 hover:bg-slate-700/80 cursor-pointer'
                : 'cursor-default'
            }`}
            title={
              currentUser.role === 'Admin'
                ? `${branding.appName} - Klik untuk sesuaikan Logo & Nama Aplikasi`
                : branding.appName
            }
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center overflow-hidden shrink-0">
              {renderNavbarLogo()}
            </div>
            <span className="hidden sm:inline font-bold text-xs text-slate-100 tracking-tight max-w-[120px] md:max-w-[160px] truncate">
              {branding.appName}
            </span>
            {currentUser.role === 'Admin' && (
              <Settings className="w-3 h-3 text-slate-400 hidden lg:inline" />
            )}
          </button>

          {/* User Identity & Role with Running Text Marquee */}
          {onOpenProfilSiswa && currentUser.role === 'Siswa' ? (
            <button
              type="button"
              onClick={onOpenProfilSiswa}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-sky-500/60 text-xs transition cursor-pointer flex items-center gap-1.5 sm:gap-2 group shrink min-w-0 active:scale-95"
              title="Buka Profil Saya & Rekap Presensi Siswa"
              aria-label="Profil Siswa"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              </div>
              <div className="text-left min-w-0">
                <UserStatusMarquee
                  name={currentUser.nama_lengkap}
                  role={currentUser.role}
                  isSiswaWithProfile={true}
                />
              </div>
            </button>
          ) : (
            <div className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs flex items-center gap-1.5 sm:gap-2 shrink min-w-0">
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border flex items-center justify-center shrink-0 ${getRoleBadgeBg(currentUser.role)}`}>
                {getRoleIcon(currentUser.role)}
              </div>
              <div className="text-left min-w-0">
                <UserStatusMarquee
                  name={currentUser.nama_lengkap}
                  role={currentUser.role}
                />
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge & Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

          {/* Internet Connection Status Indicator & Animated Sync Progress */}
          {!isOnline ? (
            <div
              id="indicator-internet-offline"
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium cursor-default select-none animate-pulse flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
              title={`Koneksi Terputus - Mode Offline Aktif.${pendingOfflineCount > 0 ? ` ${pendingOfflineCount} presensi tersimpan di antrean lokal.` : ''}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <WifiOff className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="hidden md:inline text-[11px] font-semibold">
                Offline {pendingOfflineCount > 0 ? `(${pendingOfflineCount})` : ''}
              </span>
            </div>
          ) : syncPhase === 'reconnecting' || syncPhase === 'syncing' || isSyncing ? (
            <button
              id="indicator-internet-syncing"
              type="button"
              onClick={onTriggerSync}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-medium cursor-pointer select-none flex items-center justify-center gap-1.5 shrink-0 transition-all hover:bg-sky-500/30 relative overflow-hidden group active:scale-95 shadow-xs"
              title={`Menyinkronkan data offline ke Cloud Database (${syncProgress}%). Klik untuk sinkronisasi paksa.`}
              aria-label="Proses Sinkronisasi Cloud"
            >
              {/* Animated background progress bar */}
              <div
                className="absolute inset-0 bg-sky-500/20 transition-all duration-300 pointer-events-none"
                style={{ width: `${Math.max(5, syncProgress)}%` }}
              />
              <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0 relative z-10" />
              <span className="relative z-10 text-[11px] font-bold font-mono">
                {syncProgress > 0 ? `${syncProgress}%` : 'Sync...'}
              </span>
              <span className="hidden lg:inline relative z-10 text-[10px] text-sky-200">
                {syncPhase === 'reconnecting' ? 'Menghubungkan' : 'Menyinkronkan'}
              </span>
            </button>
          ) : syncPhase === 'completed' ? (
            <div
              id="indicator-internet-synced"
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 text-xs font-medium cursor-default select-none flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition-all animate-bounce"
              title="Koneksi Pulih & Semua Data Berhasil Disinkronkan ke Cloud Database!"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold">100% Tersinkron</span>
            </div>
          ) : (
            <div
              id="indicator-internet-online"
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium cursor-default select-none flex items-center justify-center gap-1.5 shrink-0"
              title="Koneksi Internet Stabil (Terhubung ke Firebase Firestore & Google Drive)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden md:inline text-[11px] font-semibold">Online</span>
            </div>
          )}

          {/* Status Database Firebase Firestore - Khusus Admin */}
          {currentUser.role === 'Admin' && onOpenDatabaseModal && (
            <button
              id="btn-open-database-status"
              type="button"
              onClick={onOpenDatabaseModal}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer shrink-0 active:scale-95 bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
              title="Database: Firebase Firestore Realtime. Klik untuk cek sinkronisasi dokumen & status cloud."
              aria-label="Status Database Firestore"
            >
              <div className="relative flex items-center justify-center">
                <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-slate-900 bg-emerald-400 animate-pulse" />
              </div>
              <span className="hidden lg:inline text-[11px] font-semibold">
                Firestore
              </span>
            </button>
          )}

          {/* Google Drive Status & Backup trigger - Khusus Admin */}
          {currentUser.role === 'Admin' && onOpenGoogleDrive && (
            <button
              id="btn-open-google-drive"
              type="button"
              onClick={onOpenGoogleDrive}
              className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 text-xs font-medium cursor-pointer shrink-0 active:scale-95 ${
                isGoogleConnected
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                  : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title={
                isGoogleConnected
                  ? 'Google Drive: Terhubung Aktif. Klik untuk kelola cadangan & file arsip.'
                  : 'Google Drive: Belum Terhubung. Klik untuk mengaktifkan integrasi Google Drive.'
              }
              aria-label="Google Drive"
            >
              <div className="relative flex items-center justify-center">
                <Cloud
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    isGoogleConnected ? 'text-sky-400' : 'text-slate-400'
                  }`}
                />
                <span
                  className={`absolute -top-1 -right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full border border-slate-900 ${
                    isGoogleConnected ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
              </div>
              <span className="hidden lg:inline text-[11px] font-semibold">
                {isGoogleConnected ? 'Drive Aktif' : 'G-Drive'}
              </span>
            </button>
          )}

          {/* Fonnte WhatsApp Status / Modal trigger - Khusus Admin */}
          {currentUser.role === 'Admin' && (
            <button
              id="btn-open-wa-modal"
              onClick={onOpenWhatsAppModal}
              className="w-8 h-8 sm:w-9 sm:h-9 text-slate-300 hover:text-emerald-400 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
              title="Integrasi WhatsApp Fonnte"
              aria-label="WhatsApp Fonnte"
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Panduan & Walkthrough Button */}
          {onOpenWalkthrough && (
            <button
              id="btn-open-walkthrough"
              type="button"
              onClick={onOpenWalkthrough}
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg border border-sky-500/30 hover:border-sky-500/50 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 hover:text-sky-200 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 active:scale-95"
              title="Panduan Singkat & Walkthrough Sistem PKL (Klik untuk buka panduan langkah-demi-langkah)"
              aria-label="Panduan Sistem"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden xl:inline text-[11px]">Panduan</span>
            </button>
          )}

          {/* Dark Mode Toggle Button */}
          {onToggleDarkMode && (
            <button
              id="btn-toggle-dark-mode"
              type="button"
              onClick={(e) => onToggleDarkMode(e)}
              className="relative w-8 h-8 sm:w-9 sm:h-9 text-slate-300 hover:text-amber-300 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center shrink-0 group active:scale-95 overflow-hidden shadow-2xs touch-manipulation select-none"
              title={isDarkMode ? 'Beralih ke Mode Terang (Light Mode)' : 'Beralih ke Mode Gelap (Dark Mode)'}
              aria-label={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDarkMode ? (
                  <motion.div
                    key="theme-sun"
                    initial={{ rotate: -90, scale: 0.35, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: 90, scale: 0.35, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 22,
                    }}
                    className="flex items-center justify-center"
                  >
                    <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.55)]" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="theme-moon"
                    initial={{ rotate: 90, scale: 0.35, opacity: 0 }}
                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                    exit={{ rotate: -90, scale: 0.35, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 320,
                      damping: 22,
                    }}
                    className="flex items-center justify-center"
                  >
                    <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-amber-200 transition-colors" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              id="btn-logout"
              onClick={onLogout}
              className="h-8 sm:h-9 px-2 sm:px-2.5 text-rose-300 hover:text-rose-100 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 text-xs shrink-0 active:scale-95"
              title="Keluar / Ganti Akun"
              aria-label="Keluar"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline font-semibold">Keluar</span>
            </button>
          )}
        </div>
      </div>

      {/* Exclusive Role Menu Navigation Bar (Model Toggle) */}
      <div className="bg-slate-950/85 border-t border-slate-800/80 select-none">
        <div className="max-w-6xl mx-auto px-2.5 sm:px-4 py-1.5 flex items-center justify-center overflow-x-auto no-scrollbar">
          {/* Toggle Menu Items untuk Role yang Aktif (Model Toggle) */}
          <div
            ref={navScrollRef}
            className="inline-flex items-center p-1 rounded-xl sm:rounded-2xl bg-slate-900 border border-slate-800/90 shadow-inner overflow-x-auto no-scrollbar scroll-smooth touch-pan-x gap-1"
          >
            {(() => {
              interface RoleMenuItem {
                id: string;
                label: string;
                shortLabel?: string;
                icon: React.ComponentType<{ className?: string }>;
              }

              const getMenuItems = (role: Role): RoleMenuItem[] => {
                switch (role) {
                  case 'Siswa':
                    return [
                      { id: 'presensi', label: 'Presensi Mandiri', shortLabel: 'Presensi', icon: Camera },
                      { id: 'statistik', label: 'Statistik Kehadiran', shortLabel: 'Statistik', icon: BarChart3 },
                      { id: 'jurnal', label: 'Jurnal Harian', shortLabel: 'Jurnal', icon: BookOpen },
                      { id: 'laporan', label: 'Riwayat & Rekap Saya', shortLabel: 'Riwayat Saya', icon: FileText },
                      { id: 'info-pkl', label: 'Info Penempatan PKL', shortLabel: 'Info PKL', icon: GraduationCap },
                    ];
                  case 'Guru Pembimbing':
                    return [
                      { id: 'presensi', label: 'Presensi Kunjungan DUDI', shortLabel: 'Kunjungan DUDI', icon: MapPin },
                      { id: 'jurnal', label: 'Persetujuan Jurnal Siswa', shortLabel: 'Verifikasi Jurnal', icon: BookOpen },
                      { id: 'laporan', label: 'Monitoring Siswa Bimbingan', shortLabel: 'Monitoring Siswa', icon: FileText },
                      { id: 'log-aktivitas', label: 'Log Aktivitas Supervisi', shortLabel: 'Log Supervisi', icon: Activity },
                    ];
                  case 'DUDI':
                    return [
                      { id: 'presensi', label: 'Persetujuan Presensi Siswa', shortLabel: 'Verifikasi Presensi', icon: UserCheck },
                      { id: 'jurnal', label: 'Persetujuan Jurnal Siswa', shortLabel: 'Verifikasi Jurnal', icon: BookOpen },
                      { id: 'laporan', label: 'Laporan Presensi DUDI', shortLabel: 'Laporan DUDI', icon: FileText },
                      { id: 'info-dudi', label: 'Profil & Shift Industri', shortLabel: 'Profil DUDI', icon: Building2 },
                    ];
                  case 'Admin':
                    return [
                      { id: 'presensi', label: 'Statistik Data', shortLabel: 'Dashboard', icon: BarChart3 },
                      { id: 'master', label: 'Master Data & Akun', shortLabel: 'Master Data', icon: Database },
                      { id: 'jurnal', label: 'Persetujuan Jurnal', shortLabel: 'Jurnal Siswa', icon: BookOpen },
                      { id: 'laporan', label: 'Laporan & Rekap Global', shortLabel: 'Laporan Global', icon: FileText },
                      { id: 'log-aktivitas', label: 'Log Aktivitas Sistem', shortLabel: 'Log Sistem', icon: Activity },
                    ];
                }
              };

              const getActiveStyle = (role: Role) => {
                switch (role) {
                  case 'Admin':
                    return 'bg-amber-500 text-slate-950 font-bold shadow-xs';
                  case 'Guru Pembimbing':
                    return 'bg-sky-500 text-white font-bold shadow-xs';
                  case 'DUDI':
                    return 'bg-indigo-600 text-white font-bold shadow-xs';
                  case 'Siswa':
                  default:
                    return 'bg-emerald-500 text-slate-950 font-bold shadow-xs';
                }
              };

              return getMenuItems(currentUser.role).map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    id={`tab-${item.id}`}
                    data-active={isActive}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-all whitespace-nowrap min-h-[38px] shrink-0 active:scale-95 cursor-pointer ${
                      isActive
                        ? getActiveStyle(currentUser.role)
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>
                      {item.shortLabel ? (
                        <>
                          <span className="sm:hidden">{item.shortLabel}</span>
                          <span className="hidden sm:inline">{item.label}</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </span>
                  </button>
                );
              });
            })()}
          </div>

        </div>
      </div>

      {/* App Branding & Logo Customization Modal */}
      <AppBrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
        config={branding}
        onSave={updateBranding}
        onReset={resetBranding}
      />
    </header>
  );
};
