import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Compass,
  Clock,
  MapPin,
  Calendar,
  X,
  Sparkles,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { PrayerReminderConfig } from '../utils/prayerTimesService';

interface PrayerTimeAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  prayerName: string;
  prayerTime: string;
  locationName: string;
  hijriDate?: string;
  isTest?: boolean;
  config: PrayerReminderConfig;
  onToggleEnabled: () => void;
  onToggleSound?: () => void;
  onToggleAdhanSound?: () => void;
  onPlayChime?: () => void;
  onPlayAdhan?: () => void;
  onStopAdhan?: () => void;
  isAdhanPlaying?: boolean;
  onOpenFullSchedule?: () => void;
  qiblaAngle?: number;
}

export const PrayerTimeAlertModal: React.FC<PrayerTimeAlertModalProps> = ({
  isOpen,
  onClose,
  prayerName,
  prayerTime,
  locationName,
  hijriDate,
  isTest = false,
  config,
  onToggleEnabled,
  onToggleSound,
  onToggleAdhanSound,
  onPlayChime,
  onPlayAdhan,
  onStopAdhan,
  isAdhanPlaying = false,
  onOpenFullSchedule,
  qiblaAngle = 294,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="prayer-alert-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none"
        onClick={onClose}
      >
        <motion.div
          id="prayer-alert-modal-content"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/50 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Islamic Gradient Header */}
          <div className="relative bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 p-5 sm:p-6 border-b border-emerald-700/40 text-center overflow-hidden">
            {/* Ambient Background Glow Effect */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95 z-10"
              title="Tutup Pengingat"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Mosque Emblem */}
            <div className="relative inline-flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center text-3xl shadow-xl shadow-emerald-500/30 border-2 border-emerald-300/60">
                🕌
              </div>
            </div>

            {isTest && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Simulasi Pengingat</span>
              </div>
            )}

            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-400 mb-1 flex items-center justify-center gap-1.5">
              <span>Waktu Sholat Telah Tiba</span>
            </h2>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              SHOLAT {prayerName.toUpperCase()}
            </h1>

            {/* Time & Location Display */}
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/60 border border-emerald-500/30 text-xs sm:text-sm font-medium text-emerald-200">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-white text-base">{prayerTime}</span>
              <span>•</span>
              <span className="truncate max-w-[170px] sm:max-w-[220px]">{locationName}</span>
            </div>

            {hijriDate && (
              <div className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{hijriDate}</span>
              </div>
            )}
          </div>

          {/* Modal Body: Advice, Qibla, & On/Off Toggles */}
          <div className="p-4 sm:p-5 space-y-3.5">
            {/* Inspirational Islamic Message */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 text-center space-y-1.5">
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                Mari sejenak menunda aktivitas, mengambil air wudhu, dan menunaikan ibadah sholat berjamaah tepat waktu.
              </p>
              <p className="text-[11px] text-amber-300/90 italic">
                &ldquo;Amalan yang paling dicintai oleh Allah adalah sholat tepat pada waktunya.&rdquo; (HR. Bukhari & Muslim)
              </p>
            </div>

            {/* Quick Qibla Info Badge */}
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Arah Kiblat:</span>
                <span className="font-bold text-white font-mono">{qiblaAngle}°</span>
                <span className="text-[10px] text-slate-400">(Barat Laut)</span>
              </div>

              {onOpenFullSchedule && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenFullSchedule();
                  }}
                  className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <span>Jadwal Lengkap</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* ON / OFF FEATURE TOGGLE BAR */}
            {/* Live Adhan Playing Banner */}
            {isAdhanPlaying && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-400/60 shadow-lg flex items-center justify-between gap-2 animate-pulse">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/40">
                    <Volume2 className="w-4 h-4 animate-bounce text-emerald-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Suara Adzan Berkumandang</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <div className="text-[10px] text-emerald-300 truncate">
                      Panggilan sholat sedang diputar
                    </div>
                  </div>
                </div>

                {onStopAdhan && (
                  <button
                    type="button"
                    onClick={onStopAdhan}
                    className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-500/40 text-[10px] font-bold transition cursor-pointer active:scale-95 shrink-0"
                    title="Hentikan Kumandang Adzan"
                  >
                    Hentikan Adzan
                  </button>
                )}
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Pengaturan Pengingat & Suara Adzan</span>
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                  config.enabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}>
                  {config.enabled ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Master On/Off Switch */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  {config.enabled ? (
                    <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <BellOff className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">
                      Pengingat Otomatis Pop-up
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Tampilkan notifikasi saat waktu sholat tiba
                    </div>
                  </div>
                </div>

                {/* Styled Switch Button */}
                <button
                  type="button"
                  id="btn-toggle-prayer-reminder-modal"
                  onClick={onToggleEnabled}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={config.enabled}
                  title="Aktifkan atau Nonaktifkan Pengingat Sholat"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      config.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Adzan Sound On/Off Switch */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    config.adhanSoundEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                  }`}>
                    🕌
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>Suara Adzan Masuk Waktu</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-bold ${
                        config.adhanSoundEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {config.adhanSoundEnabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Kumandangkan suara adzan saat waktu sholat tiba
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isAdhanPlaying ? (
                    <button
                      type="button"
                      onClick={onStopAdhan}
                      className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-medium border border-rose-500/40 transition cursor-pointer active:scale-95"
                      title="Hentikan Adzan"
                    >
                      Hentikan
                    </button>
                  ) : (
                    onPlayAdhan && (
                      <button
                        type="button"
                        onClick={onPlayAdhan}
                        className="px-2 py-0.5 rounded bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[10px] font-medium border border-emerald-500/40 transition cursor-pointer active:scale-95"
                        title="Uji Putar Suara Adzan"
                      >
                        Tes Adzan
                      </button>
                    )
                  )}

                  {onToggleAdhanSound && (
                    <button
                      type="button"
                      id="btn-toggle-prayer-adhan-sound"
                      onClick={onToggleAdhanSound}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        config.adhanSoundEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={config.adhanSoundEnabled}
                      title="Aktifkan atau Matikan Suara Adzan Otomatis"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          config.adhanSoundEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2.5">
            {onOpenFullSchedule ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullSchedule();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>Lihat Semua Jadwal</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              id="btn-close-prayer-alert"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-1.5 active:scale-95 ml-auto"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Alhamdulillah, Siap Sholat</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
