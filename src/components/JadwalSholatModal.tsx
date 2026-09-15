import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Compass,
  RefreshCw,
  Sun,
  Sunset,
  Moon,
  Clock,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  X,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Navigation,
  Globe,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  INDONESIAN_CITIES,
  CityPreset,
  usePrayerTimes,
  savePrayerLocation,
  reverseGeocodeLocation,
  PrayerReminderConfig,
  getSavedPrayerReminderConfig,
  savePrayerReminderConfig,
  triggerTestPrayerAlert,
  PRAYER_REMINDER_CONFIG_EVENT,
} from '../utils/prayerTimesService';
import { QiblaCompass } from './QiblaCompass';

import {
  playAdhanAudio,
  stopAdhanAudio,
  isAdhanPlaying,
  addAdhanListener,
} from '../utils/audioNotification';

interface JadwalSholatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'schedule' | 'qibla';
}

export const JadwalSholatModal: React.FC<JadwalSholatModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'schedule',
}) => {
  const {
    currentDate,
    locationState,
    setLocationState,
    prayerTimes,
    countdown,
    hijriFormatted,
    qiblaAngle,
  } = usePrayerTimes();

  const [activeTab, setActiveTab] = useState<'schedule' | 'qibla'>(initialTab);
  const [isPlayingAdhan, setIsPlayingAdhan] = useState<boolean>(() => isAdhanPlaying());

  useEffect(() => {
    return addAdhanListener((playing) => {
      setIsPlayingAdhan(playing);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'schedule');
    }
  }, [isOpen, initialTab]);

  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchCity, setSearchCity] = useState<string>('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState<boolean>(false);

  // Prayer reminder preferences
  const [reminderConfig, setReminderConfig] = useState<PrayerReminderConfig>(() =>
    getSavedPrayerReminderConfig()
  );

  useEffect(() => {
    const handleConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent<PrayerReminderConfig>;
      if (customEvent.detail) {
        setReminderConfig(customEvent.detail);
      } else {
        setReminderConfig(getSavedPrayerReminderConfig());
      }
    };
    window.addEventListener(PRAYER_REMINDER_CONFIG_EVENT, handleConfigChange);
    return () => {
      window.removeEventListener(PRAYER_REMINDER_CONFIG_EVENT, handleConfigChange);
    };
  }, []);

  const handleToggleReminder = () => {
    const updated = savePrayerReminderConfig({ enabled: !reminderConfig.enabled });
    setReminderConfig(updated);
  };

  const handleToggleSound = () => {
    const updated = savePrayerReminderConfig({ soundEnabled: !reminderConfig.soundEnabled });
    setReminderConfig(updated);
  };

  const handleToggleAdhanSound = () => {
    const updated = savePrayerReminderConfig({ adhanSoundEnabled: !reminderConfig.adhanSoundEnabled });
    setReminderConfig(updated);
  };

  const handleToggleTestAdhan = () => {
    if (isPlayingAdhan) {
      stopAdhanAudio();
    } else {
      playAdhanAudio();
    }
  };

  const handleTestReminder = () => {
    triggerTestPrayerAlert(countdown.name, countdown.time);
  };

  // Detect GPS location with instant reactive feedback
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setLocationError('Browser atau perangkat Anda tidak mendukung fitur Geolocation.');
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const locName = await reverseGeocodeLocation(lat, lng);

        const newLoc = {
          lat,
          lng,
          locationName: locName,
          isGps: true,
        };

        // Instantly update local state AND broadcast globally to all components
        setLocationState(newLoc);
        savePrayerLocation(lat, lng, locName, true);
        setIsLoadingLocation(false);
      },
      (err) => {
        setIsLoadingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Izin akses lokasi GPS ditolak. Silakan pilih kota manual di bawah.');
        } else {
          setLocationError('Gagal mendeteksi koordinat GPS secara otomatis. Menggunakan estimasi kota.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  // Select Preset City with instant reactive feedback
  const handleSelectCity = (city: CityPreset) => {
    const locName = `${city.name}, ${city.province}`;
    const newLoc = {
      lat: city.latitude,
      lng: city.longitude,
      locationName: locName,
      isGps: false,
    };
    // Instantly update local state AND broadcast globally to all components
    setLocationState(newLoc);
    savePrayerLocation(city.latitude, city.longitude, locName, false);
    setIsCityDropdownOpen(false);
    setSearchCity('');
    setLocationError(null);
  };

  const filteredCities = useMemo(() => {
    if (!searchCity.trim()) return INDONESIAN_CITIES;
    const q = searchCity.toLowerCase();
    return INDONESIAN_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.province.toLowerCase().includes(q)
    );
  }, [searchCity]);

  // Main 5 Prayers list + extra milestones
  const mainPrayers = [
    {
      id: 'subuh',
      name: 'Subuh',
      time: prayerTimes.subuh,
      icon: <Moon className="w-5 h-5 text-indigo-400" />,
      color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/40 text-indigo-300',
      activeColor: 'ring-2 ring-indigo-400 bg-indigo-500/30 text-white',
      desc: 'Fajar Shodiq (20.0°)',
      isNext: countdown.name === 'Subuh',
    },
    {
      id: 'dzuhur',
      name: 'Dzuhur',
      time: prayerTimes.dzuhur,
      icon: <Sun className="w-5 h-5 text-amber-400" />,
      color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-300',
      activeColor: 'ring-2 ring-amber-400 bg-amber-500/30 text-white',
      desc: 'Tergelincir Matahari (Zawal)',
      isNext: countdown.name === 'Dzuhur',
    },
    {
      id: 'ashar',
      name: 'Ashar',
      time: prayerTimes.ashar,
      icon: <Sunset className="w-5 h-5 text-orange-400" />,
      color: 'from-orange-500/20 to-amber-500/20 border-orange-500/40 text-orange-300',
      activeColor: 'ring-2 ring-orange-400 bg-orange-500/30 text-white',
      desc: 'Bayangan = Panjang Benda',
      isNext: countdown.name === 'Ashar',
    },
    {
      id: 'maghrib',
      name: 'Maghrib',
      time: prayerTimes.maghrib,
      icon: <Sunset className="w-5 h-5 text-rose-400" />,
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-300',
      activeColor: 'ring-2 ring-rose-400 bg-rose-500/30 text-white',
      desc: 'Terbenam Piringan Matahari',
      isNext: countdown.name === 'Maghrib',
    },
    {
      id: 'isya',
      name: 'Isya',
      time: prayerTimes.isya,
      icon: <Moon className="w-5 h-5 text-purple-400" />,
      color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
      activeColor: 'ring-2 ring-purple-400 bg-purple-500/30 text-white',
      desc: 'Hilangnya Syafaq Merah (18.0°)',
      isNext: countdown.name === 'Isya',
    },
  ];

  const subMilestones = [
    { name: 'Imsak', time: prayerTimes.imsak, note: '10m sblm Subuh', isNext: countdown.name === 'Imsak' },
    { name: 'Terbit (Syuruq)', time: prayerTimes.terbit, note: 'Matahari terbit', isNext: countdown.name === 'Terbit' },
    { name: 'Dhuha', time: prayerTimes.dhuha, note: '+20m dr Terbit', isNext: countdown.name === 'Dhuha' },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="jadwal-sholat-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto animate-fadeIn select-none"
        onClick={onClose}
      >
        <motion.div
          id="jadwal-sholat-modal-content"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Decorative Header Banner */}
          <div className="relative bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-4 sm:p-5 border-b border-emerald-800/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 font-bold">
                  🕌
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Realtime Kemenag RI</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    Jadwal Sholat 5 Waktu
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-200/80 font-medium">
                    {hijriFormatted} • {countdown.currentPrayerName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition cursor-pointer shrink-0 active:scale-95"
                title="Tutup Jadwal Sholat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Next Prayer Countdown Hero Card */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 animate-pulse text-emerald-400" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">
                    Menuju Waktu {countdown.name}
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    Pukul <span className="font-bold text-white text-sm font-mono">{countdown.time}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-medium">Sisa Waktu:</div>
                <div className="text-lg sm:text-xl font-extrabold font-mono text-amber-300 tracking-tight tabular-nums drop-shadow-xs">
                  {countdown.remainingFormatted}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Tab Switcher: Jadwal Sholat vs Kompas Kiblat Gyroscope */}
          <div className="flex border-b border-slate-800 bg-slate-950/90 px-4 pt-2 gap-2">
            <button
              id="tab-jadwal-sholat-list"
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
                activeTab === 'schedule'
                  ? 'bg-slate-900 border-slate-700 text-emerald-400 border-b-slate-900 -mb-px'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Jadwal Sholat</span>
            </button>

            <button
              id="tab-kompas-kiblat-gyro"
              type="button"
              onClick={() => setActiveTab('qibla')}
              className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
                activeTab === 'qibla'
                  ? 'bg-slate-900 border-slate-700 text-emerald-400 border-b-slate-900 -mb-px'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kompas Kiblat (Gyroscope)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Live
              </span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[72vh] overflow-y-auto">
            {/* Geolocation Bar & Actions (shared across both tabs) */}
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 font-medium">Lokasi Aktif:</span>
                  <span className="font-bold text-white truncate max-w-[200px] sm:max-w-[260px] bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700">
                    {locationState.locationName}
                  </span>
                  {locationState.isGps && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shrink-0">
                      GPS Aktif
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={isLoadingLocation}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                    title="Deteksi Lokasi GPS Otomatis"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLoadingLocation ? 'animate-spin' : ''}`} />
                    <span>{isLoadingLocation ? 'Mencari...' : 'GPS Saya'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-600 active:scale-95"
                    title="Pilih Kota Manual"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>Pilih Kota</span>
                  </button>
                </div>
              </div>

              {locationError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{locationError}</span>
                </div>
              )}

              {/* City Selection Dropdown Panel */}
              {isCityDropdownOpen && (
                <div className="mt-2 pt-2 border-t border-slate-700 space-y-2">
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    placeholder="Ketik nama kota / provinsi (misal: Surabaya, Jakarta, Bandung, Medan)..."
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {filteredCities.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => handleSelectCity(c)}
                        className={`text-left px-2.5 py-1.5 rounded border text-xs transition truncate cursor-pointer flex flex-col ${
                          locationState.locationName.includes(c.name)
                            ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                            : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                        }`}
                      >
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-[10px] opacity-75 truncate">{c.province} ({c.timezoneName})</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'schedule' ? (
              <>
                {/* 5 Main Prayer Times Grid */}
                <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Waktu Sholat 5 Waktu Hari Ini</span>
                </h3>
                <span className="text-[11px] text-emerald-400 font-medium font-mono">
                  Standar Kemenag RI (+2m)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {mainPrayers.map((p) => (
                  <div
                    key={p.id}
                    className={`relative p-3 rounded-xl border transition-all flex flex-col items-center justify-center text-center group ${
                      p.isNext
                        ? 'bg-gradient-to-b from-emerald-500/20 to-teal-500/20 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-400/50'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {p.isNext && (
                      <div className="absolute -top-2.5 px-2 py-0.2 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
                        Berikutnya
                      </div>
                    )}
                    <div className="mb-1">{p.icon}</div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-white">
                      {p.name}
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold font-mono text-white tracking-tight my-0.5">
                      {p.time}
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium leading-tight line-clamp-1">
                      {p.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Islamic Milestones (Imsak, Terbit, Dhuha) */}
            <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Waktu Pelengkap & Imsakiyah
              </div>
              <div className="grid grid-cols-3 gap-2">
                {subMilestones.map((m) => (
                  <div
                    key={m.name}
                    className={`p-2 rounded-lg border text-center ${
                      m.isNext
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-[11px] text-slate-400 font-medium">{m.name}</div>
                    <div className="text-sm font-extrabold font-mono text-white">{m.time}</div>
                    <div className="text-[9px] text-slate-500">{m.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PENGATURAN NOTIFIKASI & POP-UP PENGINGAT WAKTU SHOLAT */}
            <div
              id="pengaturan-pengingat-sholat-card"
              className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-emerald-500/30 space-y-3 shadow-inner"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Pengingat & Pop-up Waktu Sholat</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/15 px-2 py-0.2 rounded-full border border-emerald-500/30">
                        Semua Role & Login
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Notifikasi visual dan nada pengingat saat adzan berkumandang
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    reminderConfig.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {reminderConfig.enabled ? 'Fitur Aktif' : 'Fitur Nonaktif'}
                </span>
              </div>

              {/* Toggles Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Master Pop-up Toggle */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {reminderConfig.enabled ? (
                      <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <BellOff className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">
                        Pop-up Pengingat
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {reminderConfig.enabled ? 'Aktif di semua layar' : 'Dimatikan'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-toggle-reminder-master"
                    onClick={handleToggleReminder}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      reminderConfig.enabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={reminderConfig.enabled}
                    title="Aktifkan atau Matikan Pengingat Pop-up"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        reminderConfig.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Adzan Sound On/Off Toggle */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-sm shrink-0">🕌</div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white flex items-center gap-1">
                        <span>Suara Adzan</span>
                        <span className={`text-[8.5px] px-1 py-0.2 rounded-xs font-bold ${
                          reminderConfig.adhanSoundEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {reminderConfig.adhanSoundEnabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {reminderConfig.adhanSoundEnabled ? 'Kumandang adzan aktif' : 'Adzan dimatikan'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-toggle-reminder-adhan"
                    onClick={handleToggleAdhanSound}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      reminderConfig.adhanSoundEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={reminderConfig.adhanSoundEnabled}
                    title="Aktifkan atau Matikan Kumandang Suara Adzan"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        reminderConfig.adhanSoundEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Sound Chime Toggle */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    {reminderConfig.soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">
                        Nada Chime
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {reminderConfig.soundEnabled ? 'Melodi lembut' : 'Mode senyap'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-toggle-reminder-sound"
                    onClick={handleToggleSound}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      reminderConfig.soundEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={reminderConfig.soundEnabled}
                    title="Aktifkan atau Matikan Suara Nada Pengingat"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        reminderConfig.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Test Button Row */}
              <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-slate-400">
                  Uji coba bagaimana tampilan pop-up dan suara adzan saat waktu sholat tiba:
                </p>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    id="btn-uji-coba-suara-adzan"
                    onClick={handleToggleTestAdhan}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95 ${
                      isPlayingAdhan
                        ? 'bg-rose-900/70 hover:bg-rose-800 text-rose-200 border-rose-500/50'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                    title="Uji coba dengarkan lantunan suara adzan"
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${isPlayingAdhan ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
                    <span>{isPlayingAdhan ? 'Hentikan Adzan' : 'Uji Suara Adzan'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-uji-coba-pengingat-sholat"
                    onClick={handleTestReminder}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold border border-emerald-500/40 transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                    title="Klik untuk membuka simulasi pop-up pengingat sholat sekarang"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Simulasi Pop-up</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Qibla Direction & Coordinates Section */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-800/90 to-slate-900 border border-slate-700 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full bg-slate-950 border-2 border-emerald-500/50 flex items-center justify-center shadow-inner">
                  {/* Qibla Compass Needle Indicator */}
                  <div
                    className="absolute w-1 h-10 flex flex-col items-center justify-between transition-transform duration-700"
                    style={{ transform: `rotate(${qiblaAngle}deg)` }}
                  >
                    <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)]" title="Arah Kiblat" />
                    <div className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                  </div>
                  <Compass className="w-5 h-5 text-emerald-400" />
                </div>

                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Arah Kiblat (Ka'bah):</span>
                    <span className="text-emerald-400 font-mono font-extrabold text-sm">
                      {qiblaAngle}°
                    </span>
                    <span className="text-[10px] text-slate-400">(Barat Laut)</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Koordinat: {locationState.lat.toFixed(4)}°, {locationState.lng.toFixed(4)}°
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto sm:ml-0 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kemenag Standar</span>
                </div>

                <button
                  type="button"
                  id="btn-open-gyro-compass"
                  onClick={() => setActiveTab('qibla')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Buka Kompas Gyroscope &rarr;</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* TAB 2: LIVE GYROSCOPE QIBLA COMPASS */
          <div className="py-1">
            <QiblaCompass
              qiblaAngle={qiblaAngle}
              latitude={locationState.lat}
              longitude={locationState.lng}
              locationName={locationState.locationName}
            />
          </div>
        )}
          </div>

          {/* Footer Note */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="text-[11px]">
              Kementerian Agama RI • Algoritma Hisab Astronomis Ephemeris
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer active:scale-95"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
