import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, ChevronRight } from 'lucide-react';
import {
  usePrayerTimes,
  savePrayerLocation,
  reverseGeocodeLocation,
} from '../utils/prayerTimesService';
import { JadwalSholatModal } from './JadwalSholatModal';

export const RealtimeClockBar: React.FC = () => {
  const [is24Hour, setIs24Hour] = useState<boolean>(true);
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState<boolean>(false);

  const {
    currentDate,
    locationState,
    setLocationState,
    countdown,
    hijriFormatted,
    shortLocation,
  } = usePrayerTimes();

  // Try auto-detecting GPS on mount silently if not saved
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const locName = await reverseGeocodeLocation(lat, lng);
          const newLoc = { lat, lng, locationName: locName, isGps: true };
          setLocationState(newLoc);
          savePrayerLocation(lat, lng, locName, true);
        },
        () => {
          // If denied, silently keep default or saved location
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
    }
  }, [setLocationState]);

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

  const dayName = days[currentDate.getDay()];
  const dateNum = currentDate.getDate();
  const monthName = months[currentDate.getMonth()];
  const year = currentDate.getFullYear();

  // Timezone resolution
  const offset = -currentDate.getTimezoneOffset() / 60;
  let timezoneStr = 'WIB';
  if (offset === 8) timezoneStr = 'WITA';
  else if (offset === 9) timezoneStr = 'WIT';
  else if (offset !== 7) timezoneStr = `UTC${offset >= 0 ? '+' : ''}${offset}`;

  // Format Time
  let hours = currentDate.getHours();
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');
  let ampm = '';

  if (!is24Hour) {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }
  const hoursStr = String(hours).padStart(2, '0');
  const timeFormatted = `${hoursStr}:${minutes}:${seconds}${ampm}`;

  return (
    <>
      <div
        id="realtime-clock-bar"
        className="bg-slate-950/95 text-slate-300 border-b border-slate-800/80 px-2.5 sm:px-4 py-1 text-xs backdrop-blur-xs select-none"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          {/* Left Side: Live Indicator & Full Indonesian Date */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
            {/* Live Indicator */}
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-[11px] font-bold tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE</span>
            </div>

            {/* Indonesian Day & Date */}
            <div className="flex items-center gap-1.5 text-slate-200 text-[11px] sm:text-xs font-medium">
              <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-semibold text-white">{dayName},</span>
              <span className="text-slate-300">{dateNum} {monthName} {year}</span>
              <span className="text-slate-400 hidden md:inline text-[11px]">({hijriFormatted})</span>
            </div>
          </div>

          {/* Center: Realtime Jadwal Sholat Ticker Button */}
          <div className="flex items-center justify-center mx-auto sm:mx-0 order-3 sm:order-2 w-full sm:w-auto mt-1 sm:mt-0">
            <button
              id="btn-jadwal-sholat-ticker"
              type="button"
              onClick={() => setIsPrayerModalOpen(true)}
              className="group w-full sm:w-auto inline-flex items-center justify-between sm:justify-center gap-2 px-2.5 py-0.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/40 hover:border-emerald-500/60 text-emerald-300 hover:text-emerald-100 transition-all cursor-pointer shadow-xs active:scale-95"
              title={`Klik untuk melihat Jadwal Sholat 5 Waktu Lengkap di ${locationState.locationName}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs">🕌</span>
                <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                  {countdown.name}:
                </span>
                <span className="font-mono font-extrabold text-white text-xs">
                  {countdown.time}
                </span>
                <span className="text-[10px] text-emerald-300/80 font-mono hidden xs:inline">
                  (-{countdown.remainingFormatted})
                </span>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-emerald-300 shrink-0 pl-1 border-l border-emerald-800/60">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span className="truncate max-w-[90px] sm:max-w-[120px] font-medium">
                  {shortLocation}
                </span>
                <ChevronRight className="w-3 h-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          </div>

          {/* Right Side: Realtime Clock Digital Display */}
          <div className="flex items-center gap-1.5 ml-auto sm:ml-0 order-2 sm:order-3 shrink-0">
            <div
              onClick={() => setIs24Hour(!is24Hour)}
              title="Klik untuk mengubah format 24 jam / 12 jam"
              className="group flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-sky-500/50 px-2 py-0.5 rounded-lg transition-all cursor-pointer shadow-inner"
            >
              <Clock className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
              
              {/* Realtime Clock Monospace Display with Live Seconds */}
              <span className="font-mono text-xs sm:text-[13px] font-extrabold text-white tracking-wider tabular-nums drop-shadow-xs">
                {timeFormatted}
              </span>

              {/* Timezone Badge */}
              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {timezoneStr}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Jadwal Sholat 5 Waktu & Arah Kiblat Modal */}
      <JadwalSholatModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
      />
    </>
  );
};
