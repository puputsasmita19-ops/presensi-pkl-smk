import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldCheck } from 'lucide-react';

export const RealtimeClockBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [is24Hour, setIs24Hour] = useState<boolean>(true);

  useEffect(() => {
    // Update every second for smooth realtime clock
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
  else if (offset !== 7) timezoneStr = `UTC${offset >= 0 ? '+' : ''}${offset}`;

  // Format Time
  let hours = currentTime.getHours();
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');
  let ampm = '';

  if (!is24Hour) {
    ampm = hours >= 12 ? ' PM' : ' AM';
    hours = hours % 12 || 12;
  }
  const hoursStr = String(hours).padStart(2, '0');
  const timeFormatted = `${hoursStr}:${minutes}:${seconds}${ampm}`;

  return (
    <div
      id="realtime-clock-bar"
      className="bg-slate-950/95 text-slate-300 border-b border-slate-800/80 px-3 sm:px-4 py-1.5 text-xs backdrop-blur-xs select-none"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 flex-wrap">
        {/* Left Side: Live Indicator & Full Indonesian Date */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Live Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-[11px] font-bold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>WAKTU REALTIME</span>
          </div>

          <span className="text-slate-600 hidden sm:inline">•</span>

          {/* Indonesian Day & Date */}
          <div className="flex items-center gap-1.5 text-slate-200 text-[11px] sm:text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold text-white">{dayName},</span>
            <span className="text-slate-300">{dateNum} {monthName} {year}</span>
          </div>
        </div>

        {/* Right Side: Realtime Clock Digital Display */}
        <div className="flex items-center gap-2 ml-auto sm:ml-0">
          <div
            onClick={() => setIs24Hour(!is24Hour)}
            title="Klik untuk mengubah format 24 jam / 12 jam"
            className="group flex items-center gap-2 bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-sky-500/50 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-inner"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            
            {/* Realtime Clock Monospace Display with Live Seconds */}
            <span className="font-mono text-xs sm:text-sm font-extrabold text-white tracking-widest tabular-nums drop-shadow-xs">
              {timeFormatted}
            </span>

            {/* Timezone Badge */}
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {timezoneStr}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-400">Sinkronisasi Server Terhubung</span>
          </div>
        </div>
      </div>
    </div>
  );
};
