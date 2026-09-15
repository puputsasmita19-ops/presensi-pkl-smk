import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { INITIAL_SISWA, INITIAL_GURU } from '../data/initialData';
import { getStoredUsers } from '../utils/userManagement';
import { getAndClearAutoLogoutNotice } from '../utils/sessionManager';
import { AdminHelpModal } from './AdminHelpModal';
import { JadwalSholatModal } from './JadwalSholatModal';
import {
  usePrayerTimes,
  getSavedPrayerReminderConfig,
  PRAYER_REMINDER_CONFIG_EVENT,
} from '../utils/prayerTimesService';
import {
  useAppBranding,
  getTimeGreeting,
} from '../utils/appBrandingService';
import {
  Lock,
  User as UserIcon,
  UserCheck,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  LogIn,
  GraduationCap,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  X,
  MapPin,
  ChevronRight,
  Sparkles,
  Bell,
  BellOff,
  Award,
  Compass,
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onOpenWhatsAppHelp?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: (e?: React.MouseEvent<HTMLElement>) => void;
  autoLogoutNotice?: string | null;
}

export type LoginPilihanRole = 'Guru' | 'Siswa' | 'DUDI' | 'Admin';

interface RoleMismatchInfo {
  actualRole: string;
  suggestedTab: LoginPilihanRole;
  userName: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onOpenWhatsAppHelp,
  isDarkMode = false,
  onToggleDarkMode,
  autoLogoutNotice = null,
}) => {
  const [securityNotice, setSecurityNotice] = useState<string | null>(() => {
    return autoLogoutNotice || getAndClearAutoLogoutNotice();
  });

  useEffect(() => {
    if (autoLogoutNotice) {
      setSecurityNotice(autoLogoutNotice);
    }
  }, [autoLogoutNotice]);

  const [selectedRole, setSelectedRole] = useState<LoginPilihanRole>(() => {
    try {
      const saved = localStorage.getItem('pkl_login_selected_role') as LoginPilihanRole;
      if (saved && ['Guru', 'Siswa', 'DUDI', 'Admin'].includes(saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'Siswa';
  });

  useEffect(() => {
    try {
      localStorage.setItem('pkl_login_selected_role', selectedRole);
    } catch {
      // ignore
    }
  }, [selectedRole]);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleMismatch, setRoleMismatch] = useState<RoleMismatchInfo | null>(null);
  const [isAdminHelpOpen, setIsAdminHelpOpen] = useState(false);
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);
  const [prayerModalTab, setPrayerModalTab] = useState<'schedule' | 'qibla'>('schedule');
  const [isReminderEnabled, setIsReminderEnabled] = useState<boolean>(() =>
    getSavedPrayerReminderConfig().enabled
  );

  useEffect(() => {
    const handleConfigChange = () => {
      setIsReminderEnabled(getSavedPrayerReminderConfig().enabled);
    };
    window.addEventListener(PRAYER_REMINDER_CONFIG_EVENT, handleConfigChange);
    window.addEventListener('storage', handleConfigChange);
    return () => {
      window.removeEventListener(PRAYER_REMINDER_CONFIG_EVENT, handleConfigChange);
      window.removeEventListener('storage', handleConfigChange);
    };
  }, []);

  // Realtime Prayer Times synchronized globally
  const {
    locationState,
    prayerTimes,
    countdown,
    hijriFormatted,
    shortLocation,
    qiblaAngle,
  } = usePrayerTimes();

  // App Branding & Identity (Nama Aplikasi & Logo Kustom)
  const { branding } = useAppBranding();

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format Indonesian Day & Date
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const dayName = days[currentTime.getDay()];
  const dateNum = currentTime.getDate();
  const monthName = months[currentTime.getMonth()];
  const year = currentTime.getFullYear();
  const formattedDate = `${dayName}, ${dateNum} ${monthName} ${year}`;

  // Timezone resolution
  const offset = -currentTime.getTimezoneOffset() / 60;
  let timezoneStr = 'WIB';
  if (offset === 8) timezoneStr = 'WITA';
  else if (offset === 9) timezoneStr = 'WIT';

  const hoursStr = String(currentTime.getHours()).padStart(2, '0');
  const minutesStr = String(currentTime.getMinutes()).padStart(2, '0');
  const secondsStr = String(currentTime.getSeconds()).padStart(2, '0');
  const timeFormatted = `${hoursStr}:${minutesStr}:${secondsStr} ${timezoneStr}`;

  // Dynamic Greeting according to time of day (Pagi, Siang, Sore, Malam)
  const timeGreeting = getTimeGreeting(currentTime);

  const renderGreetingIcon = () => {
    switch (timeGreeting.iconName) {
      case 'Sunrise':
        return <Sunrise className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'Sun':
        return <Sun className="w-4 h-4 text-sky-500 shrink-0" />;
      case 'Sunset':
        return <Sunset className="w-4 h-4 text-orange-500 shrink-0" />;
      case 'Moon':
      default:
        return <Moon className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
  };

  const renderAppLogo = () => {
    if (branding.logoUrl) {
      return (
        <img
          src={branding.logoUrl}
          alt={branding.appName}
          className="w-full h-full object-contain p-1 rounded-2xl"
          onError={(e) => {
            // Fallback jika url rusak
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }
    switch (branding.logoPreset) {
      case 'tutwuri':
        return <Award className="w-7 h-7 text-white" />;
      case 'gedung':
        return <Building2 className="w-7 h-7 text-white" />;
      case 'bintang':
        return <Sparkles className="w-7 h-7 text-white" />;
      case 'presensi':
        return <UserCheck className="w-7 h-7 text-white" />;
      case 'toga':
      default:
        return <GraduationCap className="w-7 h-7 text-white" />;
    }
  };

  // Change active tab & clear alerts
  const handleSelectRole = (role: LoginPilihanRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setRoleMismatch(null);
  };

  // Submit login form with strict condition checking
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRoleMismatch(null);

    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage(
        `Silakan masukkan ${selectedRole === 'Siswa' ? 'Username / NIS' : 'Username'} dan Kata Sandi.`
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const storedUsers = getStoredUsers();
      // 1. Search for user by username in stored users
      let matched: User | undefined = storedUsers.find(
        (u) => u.username.toLowerCase() === cleanUser
      );

      // 2. If not found by username, check if a student entered NIS
      if (!matched) {
        let currentSiswaList = INITIAL_SISWA;
        try {
          const rawSiswa = localStorage.getItem('pkl_siswa_list');
          if (rawSiswa) {
            const parsed = JSON.parse(rawSiswa);
            if (Array.isArray(parsed) && parsed.length > 0) currentSiswaList = parsed;
          }
        } catch {}
        const siswaMatch = currentSiswaList.find(
          (s) => s.nis && s.nis.toLowerCase().trim() === cleanUser
        );
        if (siswaMatch) {
          matched = storedUsers.find((u) => u.id_user === siswaMatch.id_user);
        }
      }

      // 3. If not found, check if a teacher entered NIP
      if (!matched) {
        let currentGuruList = INITIAL_GURU;
        try {
          const rawGuru = localStorage.getItem('pkl_guru_list');
          if (rawGuru) {
            const parsed = JSON.parse(rawGuru);
            if (Array.isArray(parsed) && parsed.length > 0) currentGuruList = parsed;
          }
        } catch {}
        const guruMatch = currentGuruList.find(
          (g) => g.nip && g.nip.toLowerCase().trim() === cleanUser
        );
        if (guruMatch) {
          matched = storedUsers.find((u) => u.id_user === guruMatch.id_user);
        }
      }

      // Case A: User found in database
      if (matched) {
        // Step 1: Verify Password
        if (matched.password_hash !== cleanPass) {
          setIsLoading(false);
          setErrorMessage('Kata sandi yang Anda masukkan salah. Silakan periksa kembali.');
          return;
        }

        // Step 2: Strict Role Validation
        // Define exact expected database role for current selected tab
        const expectedDbRole =
          selectedRole === 'Guru'
            ? 'Guru Pembimbing'
            : selectedRole === 'DUDI'
            ? 'DUDI'
            : selectedRole === 'Admin'
            ? 'Admin'
            : 'Siswa';

        // If the account's role does NOT match the selected role tab, REJECT LOGIN STRICTLY
        if (matched.role !== expectedDbRole) {
          setIsLoading(false);

          const targetTab: LoginPilihanRole =
            matched.role === 'Guru Pembimbing'
              ? 'Guru'
              : matched.role === 'DUDI'
              ? 'DUDI'
              : matched.role === 'Admin'
              ? 'Admin'
              : 'Siswa';

          setRoleMismatch({
            actualRole: matched.role,
            suggestedTab: targetTab,
            userName: matched.nama_lengkap,
          });
          return;
        }

        // Step 3: All conditions verified (Credentials correct AND Role matches tab)
        setIsLoading(false);
        onLoginSuccess(matched);
      } else {
        // Case B: User not found
        setIsLoading(false);
        setErrorMessage(
          `Akun tidak ditemukan. Pastikan ${
            selectedRole === 'Siswa' ? 'Username / NIS' : 'Username'
          } sudah benar.`
        );
      }
    }, 350);
  };

  // Helper labels & styles based on selected role
  const getFieldConfig = () => {
    switch (selectedRole) {
      case 'Guru':
        return {
          title: 'Guru Pembimbing',
          label: 'Username / NIP Guru',
          placeholder: 'Masukkan username guru (cth: guru_dewi)',
          icon: <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
          btnColor: 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20',
          badgeColor: 'text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10',
        };
      case 'DUDI':
        return {
          title: 'Mitra DUDI / Industri',
          label: 'Username / ID Mitra DUDI',
          placeholder: 'Masukkan username mitra DUDI (cth: dudi_telkom)',
          icon: <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
          btnColor: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20',
          badgeColor: 'text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10',
        };
      case 'Admin':
        return {
          title: 'Administrator Sistem',
          label: 'Username Admin PKL',
          placeholder: 'Masukkan username admin (cth: admin)',
          icon: <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          btnColor: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20',
          badgeColor: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10',
        };
      case 'Siswa':
      default:
        return {
          title: 'Siswa PKL',
          label: 'Username / NIS Siswa',
          placeholder: 'Masukkan NIS atau username siswa (cth: siswa_reza)',
          icon: <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          btnColor: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
          badgeColor: 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10',
        };
    }
  };

  const fieldConfig = getFieldConfig();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center items-center px-4 py-5 text-slate-800 dark:text-slate-100 antialiased select-none relative transition-colors duration-200">
      {/* Dark / Light Mode Toggle Button */}
      {onToggleDarkMode && (
        <button
          id="btn-login-toggle-theme"
          type="button"
          onClick={(e) => onToggleDarkMode(e)}
          className="absolute top-4 right-4 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-800/90 transition-colors cursor-pointer flex items-center gap-2 text-xs z-20 shadow-sm backdrop-blur-xs font-medium active:scale-95 overflow-hidden touch-manipulation select-none"
          title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDarkMode ? (
              <motion.div
                key="login-sun"
                initial={{ rotate: -70, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: 70, scale: 0.4, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 320,
                  damping: 22,
                }}
                className="flex items-center gap-1.5"
              >
                <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]" />
                <span className="hidden sm:inline font-semibold">Mode Terang</span>
              </motion.div>
            ) : (
              <motion.div
                key="login-moon"
                initial={{ rotate: 70, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: -70, scale: 0.4, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 320,
                  damping: 22,
                }}
                className="flex items-center gap-1.5"
              >
                <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span className="hidden sm:inline font-semibold">Mode Gelap</span>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      )}

      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-300/30 dark:bg-sky-600/15 rounded-full blur-3xl transition-colors duration-300" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Clean Header with Logo, App Title, Hari Tanggal Waktu, & Dynamic Greeting */}
        <div className="text-center mb-3.5">
          {/* Logo Container */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20 mb-2 overflow-hidden border border-white/40 dark:border-slate-700/60 p-0.5">
            {renderAppLogo()}
          </div>

          {/* App Title */}
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {branding.appName}
          </h1>

          {branding.appTagline && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[290px] mx-auto line-clamp-1">
              {branding.appTagline}
            </p>
          )}

          {/* Tampilan Hari, Tanggal, & Waktu Real-Time */}
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 animate-pulse shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{formattedDate}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tracking-wider">
              {timeFormatted}
            </span>
          </div>

          {/* Dynamic Ucapan Waktu (Pagi / Siang / Sore / Malam) dengan Mode Running Text */}
          <div className="mt-2.5 flex flex-col items-center w-full">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shadow-2xs backdrop-blur-xs transition-all duration-300 ${timeGreeting.badgeBg} ${timeGreeting.badgeBorder} ${timeGreeting.badgeText}`}
            >
              {renderGreetingIcon()}
              <span className="tracking-tight font-bold">{timeGreeting.greeting}</span>
            </div>

            {/* Mode Running Text untuk Ucapan Selamat Beristirahat / Sub-greeting Waktu */}
            <div
              id="running-text-ucapan-waktu"
              className="w-full max-w-[320px] sm:max-w-[340px] mt-2 relative overflow-hidden py-1 px-1 rounded-full bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs"
              title="Arahkan kursor atau tahan sentuhan untuk jeda teks berjalan"
            >
              {/* Left and right fade gradient edges */}
              <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-slate-100 dark:from-slate-900 to-transparent z-10 pointer-events-none rounded-l-full" />
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-100 dark:from-slate-900 to-transparent z-10 pointer-events-none rounded-r-full" />

              <div className="animate-running-marquee text-[11px] text-slate-600 dark:text-slate-300 font-medium cursor-default select-none">
                <div className="flex items-center gap-2.5 shrink-0 pr-6">
                  <span>{renderGreetingIcon()}</span>
                  <span>{timeGreeting.subGreeting}</span>
                  <span className="text-slate-400 dark:text-slate-600 text-xs">✦</span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 pr-6">
                  <span>{renderGreetingIcon()}</span>
                  <span>{timeGreeting.subGreeting}</span>
                  <span className="text-slate-400 dark:text-slate-600 text-xs">✦</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Realtime Waktu Sholat 5 Waktu Widget Card on Login Page */}
        <div className="mb-3.5">
          <div
            id="login-jadwal-sholat-card"
            className="w-full text-left p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 dark:border-emerald-500/30 dark:hover:border-emerald-400/60 shadow-md shadow-emerald-500/5 transition-all group"
          >
            {/* Top row: Next Prayer & Location */}
            <div
              className="flex items-center justify-between gap-2 mb-2 cursor-pointer"
              onClick={() => {
                setPrayerModalTab('schedule');
                setIsPrayerModalOpen(true);
              }}
              title={`Jadwal Sholat 5 Waktu di ${locationState.locationName}. Klik untuk detail`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-sm">🕌</span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                  {countdown.name}:
                </span>
                <span className="font-mono font-extrabold text-xs text-slate-900 dark:text-white">
                  {countdown.time}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium font-mono">
                  (-{countdown.remainingFormatted})
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 shrink-0">
                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="truncate max-w-[100px] font-semibold">
                  {shortLocation}
                </span>
                {isReminderEnabled ? (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-500/30"
                    title="Pengingat Sholat: Aktif"
                  >
                    <Bell className="w-2.5 h-2.5" />
                    <span>Aktif</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-0.5 text-[9px] text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-300 dark:border-slate-700"
                    title="Pengingat Sholat: Nonaktif"
                  >
                    <BellOff className="w-2.5 h-2.5" />
                    <span>Mute</span>
                  </span>
                )}
                <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            </div>

            {/* 5 Main Prayer Times Mini Badges Strip */}
            <div
              className="grid grid-cols-5 gap-1 pt-1.5 border-t border-slate-100 dark:border-slate-800 cursor-pointer"
              onClick={() => {
                setPrayerModalTab('schedule');
                setIsPrayerModalOpen(true);
              }}
            >
              {[
                { name: 'Subuh', time: prayerTimes.subuh, isNext: countdown.name === 'Subuh' },
                { name: 'Dzuhur', time: prayerTimes.dzuhur, isNext: countdown.name === 'Dzuhur' },
                { name: 'Ashar', time: prayerTimes.ashar, isNext: countdown.name === 'Ashar' },
                { name: 'Maghrib', time: prayerTimes.maghrib, isNext: countdown.name === 'Maghrib' },
                { name: 'Isya', time: prayerTimes.isya, isNext: countdown.name === 'Isya' },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`px-1 py-1 rounded-lg text-center transition-all ${
                    p.isNext
                      ? 'bg-emerald-500 text-white shadow-xs font-bold'
                      : 'bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-50 dark:group-hover:bg-slate-800/80'
                  }`}
                >
                  <div className={`text-[9px] uppercase tracking-wider ${p.isNext ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`}>
                    {p.name}
                  </div>
                  <div className="font-mono text-[10px] sm:text-[11px] font-extrabold leading-tight">
                    {p.time}
                  </div>
                </div>
              ))}
            </div>

            {/* Direct Qibla Compass Trigger Row */}
            <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Compass className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Kiblat:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{qiblaAngle}°</span>
                <span className="text-[10px] text-slate-400">(Barat Laut)</span>
              </div>

              <button
                type="button"
                id="btn-login-open-qibla"
                onClick={(e) => {
                  e.stopPropagation();
                  setPrayerModalTab('qibla');
                  setIsPrayerModalOpen(true);
                }}
                className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition cursor-pointer text-[10.5px] group/qibla"
                title="Buka Kompas Arah Kiblat interaktif dengan Gyroscope HP"
              >
                <span>Kompas Gyroscope</span>
                <ChevronRight className="w-3 h-3 group-hover/qibla:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Minimalist Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl shadow-xl shadow-slate-200/70 dark:shadow-2xl dark:shadow-black/60 p-5 sm:p-6 transition-colors duration-200">
          
          {/* Auto-logout security notice banner */}
          {securityNotice && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-bold block text-amber-800 dark:text-amber-300">
                  Keamanan Sesi Aplikasi
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-300/90">
                  {securityNotice}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSecurityNotice(null)}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-0.5 cursor-pointer"
                title="Tutup Pesan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Role Choice Selector: Guru, Siswa, DUDI */}
          {selectedRole !== 'Admin' ? (
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 text-center">
                Pilih Peran Masuk:
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  id="tab-login-guru"
                  onClick={() => handleSelectRole('Guru')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedRole === 'Guru'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Guru</span>
                </button>

                <button
                  type="button"
                  id="tab-login-siswa"
                  onClick={() => handleSelectRole('Siswa')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedRole === 'Siswa'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Siswa</span>
                </button>

                <button
                  type="button"
                  id="tab-login-dudi"
                  onClick={() => handleSelectRole('DUDI')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedRole === 'DUDI'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>DUDI</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-between p-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
              <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Mode Login Administrator</span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectRole('Siswa')}
                className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Kembali</span>
              </button>
            </div>
          )}

          {/* Strict Role Mismatch Warning Banner */}
          {roleMismatch && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs animate-in fade-in space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-rose-800 dark:text-rose-300">
                    Akses Ditolak: Peran Tidak Sesuai
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-200/90 mt-0.5">
                    Akun <strong className="text-slate-900 dark:text-white">{roleMismatch.userName}</strong> terdaftar sebagai{' '}
                    <strong className="text-amber-700 dark:text-amber-300">{roleMismatch.actualRole}</strong>, bukan {selectedRole}.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectRole(roleMismatch.suggestedTab)}
                className="w-full py-1.5 px-3 rounded-lg bg-rose-100 dark:bg-rose-600/30 hover:bg-rose-200 dark:hover:bg-rose-600/50 border border-rose-300 dark:border-rose-500/40 text-rose-900 dark:text-rose-100 font-medium text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Beralih ke tab <strong>{roleMismatch.suggestedTab}</strong></span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* General Error Banner */}
          {errorMessage && !roleMismatch && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {fieldConfig.label}
                </label>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${fieldConfig.badgeColor}`}>
                  {fieldConfig.title}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  {fieldConfig.icon}
                </div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    if (roleMismatch) setRoleMismatch(null);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={fieldConfig.placeholder}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-sky-500 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (roleMismatch) setRoleMismatch(null);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Masukkan kata sandi"
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-sky-500 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
                  title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${fieldConfig.btnColor}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Memverifikasi {fieldConfig.title}...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk sebagai {fieldConfig.title}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer Controls & Clean Help */}
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/60 flex flex-col gap-2 text-center">
            {selectedRole !== 'Admin' ? (
              <button
                type="button"
                onClick={() => handleSelectRole('Admin')}
                className="text-[11px] text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition cursor-pointer flex items-center justify-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Masuk sebagai Administrator</span>
              </button>
            ) : null}

            <button
              type="button"
              id="btn-hubungi-admin-login"
              onClick={() => setIsAdminHelpOpen(true)}
              className="text-[11px] text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition cursor-pointer"
            >
              Lupa sandi atau butuh bantuan? <span className="text-sky-600 dark:text-sky-400 font-semibold underline">Hubungi Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin WhatsApp Help Modal */}
      <AdminHelpModal
        isOpen={isAdminHelpOpen}
        onClose={() => setIsAdminHelpOpen(false)}
      />

      {/* Jadwal Sholat 5 Waktu & Arah Kiblat Modal */}
      <JadwalSholatModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
        initialTab={prayerModalTab}
      />
    </div>
  );
};
