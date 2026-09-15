import React, { useState, useMemo } from 'react';
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
} from '../utils/prayerTimesService';

interface JadwalSholatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JadwalSholatModal: React.FC<JadwalSholatModalProps> = ({ isOpen, onClose }) => {
  const {
    currentDate,
    locationState,
    setLocationState,
    prayerTimes,
    countdown,
    hijriFormatted,
    qiblaAngle,
  } = usePrayerTimes();

  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchCity, setSearchCity] = useState<string>('');
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState<boolean>(false);

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

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Geolocation Bar & Actions */}
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

              <div className="text-right ml-auto sm:ml-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kemenag Standar</span>
                </div>
              </div>
            </div>
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
