import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { INITIAL_SISWA, INITIAL_GURU } from '../data/initialData';
import { getStoredUsers } from '../utils/userManagement';
import { AdminHelpModal } from './AdminHelpModal';
import {
  Lock,
  User as UserIcon,
  UserCheck,
  Building2,
  ShieldCheck,
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
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  onOpenWhatsAppHelp?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
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
}) => {
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
        const siswaMatch = INITIAL_SISWA.find(
          (s) => s.nis.toLowerCase() === cleanUser
        );
        if (siswaMatch) {
          matched = storedUsers.find((u) => u.id_user === siswaMatch.id_user);
        }
      }

      // 3. If not found, check if a teacher entered NIP
      if (!matched) {
        const guruMatch = INITIAL_GURU.find(
          (g) => g.nip.toLowerCase() === cleanUser
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
          onClick={onToggleDarkMode}
          className="absolute top-4 right-4 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-slate-50 dark:hover:bg-slate-800/90 transition cursor-pointer flex items-center gap-2 text-xs z-20 shadow-sm backdrop-blur-xs font-medium"
          title={isDarkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Mode Terang</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Mode Gelap</span>
            </>
          )}
        </button>
      )}

      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-300/30 dark:bg-sky-600/15 rounded-full blur-3xl transition-colors duration-300" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Clean Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/20 mb-2">
            <GraduationCap className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Presensi PKL SMK
          </h1>

          {/* Real-time date & time */}
          <div className="inline-flex items-center gap-2 mt-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 animate-pulse shrink-0" />
            <span className="text-slate-600 dark:text-slate-300">{formattedDate}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tracking-wider">
              {timeFormatted}
            </span>
          </div>
        </div>

        {/* Minimalist Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl shadow-xl shadow-slate-200/70 dark:shadow-2xl dark:shadow-black/60 p-5 sm:p-6 transition-colors duration-200">
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
    </div>
  );
};
