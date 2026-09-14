import React from 'react';
import { ShieldAlert, Clock, LogOut, ArrowRight } from 'lucide-react';

interface AutoLogoutWarningModalProps {
  isOpen: boolean;
  remainingSeconds: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const AutoLogoutWarningModal: React.FC<AutoLogoutWarningModalProps> = ({
  isOpen,
  remainingSeconds,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Hitung persentase mundur dari 120 detik (2 menit)
  const maxWarningSeconds = 120;
  const progressPercent = Math.min(100, Math.max(0, (remainingSeconds / maxWarningSeconds) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/60 overflow-hidden flex flex-col p-6 space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Header with security icon */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 shrink-0 ring-4 ring-amber-50 dark:ring-amber-950/40 animate-pulse">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Peringatan Keamanan Sesi
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tidak ada aktivitas terdeteksi. Demi keamanan data siswa &amp; privasi akun, sesi akan keluar otomatis.
            </p>
          </div>
        </div>

        {/* Countdown Box */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            <Clock className="w-4 h-4" />
            <span>Sesi Berakhir Otomatis Dalam:</span>
          </div>

          <div className="text-3xl font-extrabold font-mono tracking-tight text-amber-600 dark:text-amber-400">
            {timeFormatted}
          </div>

          {/* Progress bar */}
          <div className="w-full bg-amber-200/60 dark:bg-amber-900/40 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-amber-500 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="w-full sm:flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 transition-all duration-150"
          >
            <span>Tetap Masuk</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onLogoutNow}
            className="w-full sm:w-auto py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Keluar Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
