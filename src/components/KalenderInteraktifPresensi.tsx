import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock4,
  AlertCircle,
  HeartPulse,
  FileText,
  User,
  Building2,
  Eye,
  ExternalLink,
  MapPin,
  Sparkles,
  Info,
  CalendarCheck,
  TrendingUp,
} from 'lucide-react';
import { Siswa, Presensi } from '../types';

interface KalenderInteraktifPresensiProps {
  siswa: Siswa;
  presensiList: Presensi[];
  onOpenLightbox?: (url: string, caption: string, subCaption: string) => void;
  className?: string;
}

const NAMA_BULAN = [
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

const NAMA_HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const KalenderInteraktifPresensi: React.FC<KalenderInteraktifPresensiProps> = ({
  siswa,
  presensiList,
  onOpenLightbox,
  className = '',
}) => {
  // Filter attendance belonging to this student
  const studentRecords = useMemo(() => {
    return presensiList.filter((p) => p.id_siswa === siswa.id_siswa);
  }, [presensiList, siswa.id_siswa]);

  // Determine initial month/year based on records or current date
  const initialDate = useMemo(() => {
    if (studentRecords.length > 0) {
      // Pick latest record date
      const sorted = [...studentRecords].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      const parts = sorted[0].tanggal.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date();
  }, [studentRecords]);

  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Map of records by date YYYY-MM-DD
  const recordMap = useMemo(() => {
    const map = new Map<string, Presensi>();
    studentRecords.forEach((r) => {
      map.set(r.tanggal, r);
    });
    return map;
  }, [studentRecords]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDateStr(null);
  };

  const handleResetToCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setSelectedDateStr(null);
  };

  // Calendar matrix calculation for current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday, 1 = Monday
    // We want Monday as index 0, so: Sunday (0) becomes 6, Monday (1) becomes 0
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isWeekend: boolean;
      record?: Presensi;
    }> = [];

    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const mStr = String(prevM + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${prevY}-${mStr}-${dStr}`;
      const dayOfWeek = new Date(prevY, prevM, dayNum).getDay();
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        record: recordMap.get(dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay();
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        record: recordMap.get(dateStr),
      });
    }

    // Next month filler days to complete grid (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let nextD = 1; nextD <= remaining; nextD++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const mStr = String(nextM + 1).padStart(2, '0');
      const dStr = String(nextD).padStart(2, '0');
      const dateStr = `${nextY}-${mStr}-${dStr}`;
      const dayOfWeek = new Date(nextY, nextM, nextD).getDay();
      days.push({
        dayNumber: nextD,
        dateStr,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        record: recordMap.get(dateStr),
      });
    }

    return days;
  }, [currentYear, currentMonth, recordMap]);

  // Statistics for the selected month only
  const monthStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthlyRecords = studentRecords.filter((p) => p.tanggal.startsWith(prefix));

    const total = monthlyRecords.length;
    const hadir = monthlyRecords.filter((p) => p.status === 'Hadir').length;
    const tepatWaktu = monthlyRecords.filter(
      (p) => p.status === 'Hadir' && p.status_ketepatan === 'Tepat Waktu'
    ).length;
    const terlambat = monthlyRecords.filter(
      (p) => p.status === 'Hadir' && p.status_ketepatan === 'Terlambat'
    ).length;
    const izin = monthlyRecords.filter((p) => p.status === 'Izin').length;
    const sakit = monthlyRecords.filter((p) => p.status === 'Sakit').length;
    const alpa = monthlyRecords.filter((p) => p.status === 'Alpa').length;

    const rateHadir = total > 0 ? Math.round((hadir / total) * 100) : 100;

    return {
      total,
      hadir,
      tepatWaktu,
      terlambat,
      izin,
      sakit,
      alpa,
      rateHadir,
    };
  }, [studentRecords, currentMonth, currentYear]);

  // Currently inspected record
  const activeRecord = useMemo(() => {
    if (!selectedDateStr) return null;
    return recordMap.get(selectedDateStr) || null;
  }, [selectedDateStr, recordMap]);

  // Helper for today's date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <div
      id="kalender-interaktif-presensi-siswa"
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4 transition-colors ${className}`}
    >
      {/* Calendar Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Kalender Presensi Bulanan</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Visual 1 Bulan
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Riwayat absensi harian dengan penanda warna status kehadiran
            </p>
          </div>
        </div>

        {/* Month / Year Navigator Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer active:scale-95"
            title="Bulan Sebelumnya"
            aria-label="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 min-w-[130px] text-center select-none">
            {NAMA_BULAN[currentMonth]} {currentYear}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer active:scale-95"
            title="Bulan Berikutnya"
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetToCurrentMonth}
            className="ml-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition shadow-xs cursor-pointer active:scale-95"
            title="Lompat ke Bulan Ini"
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Rekap {NAMA_BULAN[currentMonth]} {currentYear}:
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              Kehadiran {monthStats.rateHadir}%
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <strong>{monthStats.hadir}</strong> Hadir ({monthStats.tepatWaktu} tepat, {monthStats.terlambat} telat)
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-300">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <strong>{monthStats.izin}</strong> Izin
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
              <strong>{monthStats.sakit}</strong> Sakit
            </span>
            {monthStats.alpa > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  <strong>{monthStats.alpa}</strong> Alpha
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mini progress bar for current month */}
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
          {monthStats.total > 0 ? (
            <>
              <div
                style={{ width: `${(monthStats.tepatWaktu / monthStats.total) * 100}%` }}
                className="h-full bg-emerald-500"
                title={`Tepat Waktu: ${monthStats.tepatWaktu}`}
              />
              <div
                style={{ width: `${(monthStats.terlambat / monthStats.total) * 100}%` }}
                className="h-full bg-amber-400"
                title={`Terlambat: ${monthStats.terlambat}`}
              />
              <div
                style={{ width: `${(monthStats.izin / monthStats.total) * 100}%` }}
                className="h-full bg-sky-400"
                title={`Izin: ${monthStats.izin}`}
              />
              <div
                style={{ width: `${(monthStats.sakit / monthStats.total) * 100}%` }}
                className="h-full bg-purple-400"
                title={`Sakit: ${monthStats.sakit}`}
              />
              <div
                style={{ width: `${(monthStats.alpa / monthStats.total) * 100}%` }}
                className="h-full bg-rose-500"
                title={`Alpha: ${monthStats.alpa}`}
              />
            </>
          ) : (
            <div className="w-full h-full bg-slate-300 dark:bg-slate-600 text-[9px] text-center text-slate-500">
              Belum ada data di bulan ini
            </div>
          )}
        </div>
      </div>

      {/* Calendar Table Grid */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {/* Day Name Headers */}
        <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800/90 text-center py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          {NAMA_HARI.map((h, idx) => (
            <div
              key={h}
              className={idx >= 5 ? 'text-rose-600 dark:text-rose-400' : ''}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20">
          {calendarDays.map((item, index) => {
            const hasRecord = !!item.record;
            const rec = item.record;
            const isToday = item.dateStr === todayStr;
            const isSelected = item.dateStr === selectedDateStr;

            // Compute cell styles based on attendance status
            let cellBg = 'bg-white dark:bg-slate-900/60';
            let badgeBg = '';
            let statusText = '';
            let statusBadgeClass = '';

            if (!item.isCurrentMonth) {
              cellBg = 'bg-slate-50/70 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 opacity-60';
            } else if (hasRecord && rec) {
              if (rec.status === 'Hadir') {
                if (rec.status_ketepatan === 'Terlambat') {
                  cellBg =
                    'bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 border-amber-200/80 dark:border-amber-800/40';
                  badgeBg = 'bg-amber-500';
                  statusText = 'Terlambat';
                  statusBadgeClass =
                    'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700';
                } else {
                  cellBg =
                    'bg-emerald-50/80 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 border-emerald-200/80 dark:border-emerald-800/40';
                  badgeBg = 'bg-emerald-500';
                  statusText = 'Hadir';
                  statusBadgeClass =
                    'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
                }
              } else if (rec.status === 'Izin') {
                cellBg =
                  'bg-sky-50/80 dark:bg-sky-950/30 hover:bg-sky-100/70 dark:hover:bg-sky-900/40 border-sky-200/80 dark:border-sky-800/40';
                badgeBg = 'bg-sky-400';
                statusText = 'Izin';
                statusBadgeClass =
                  'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700';
              } else if (rec.status === 'Sakit') {
                cellBg =
                  'bg-purple-50/80 dark:bg-purple-950/30 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 border-purple-200/80 dark:border-purple-800/40';
                badgeBg = 'bg-purple-400';
                statusText = 'Sakit';
                statusBadgeClass =
                  'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
              } else if (rec.status === 'Alpa') {
                cellBg =
                  'bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 border-rose-200/80 dark:border-rose-800/40';
                badgeBg = 'bg-rose-500';
                statusText = 'Alpha';
                statusBadgeClass =
                  'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700';
              }
            } else if (item.isWeekend) {
              cellBg = 'bg-slate-50/40 dark:bg-slate-900/20 text-slate-400';
            }

            return (
              <button
                type="button"
                key={`${item.dateStr}-${index}`}
                onClick={() => setSelectedDateStr(item.dateStr)}
                className={`min-h-[70px] sm:min-h-[85px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-all cursor-pointer relative group ${cellBg} ${
                  isSelected
                    ? 'ring-2 ring-sky-500 ring-offset-1 z-10 dark:ring-offset-slate-900 shadow-md'
                    : 'hover:opacity-95'
                }`}
              >
                {/* Date Header: Day Number + Today Tag */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-sky-600 text-white shadow-xs'
                        : item.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {item.dayNumber}
                  </span>

                  {/* Visual Status Indicator Dot */}
                  {hasRecord && (
                    <span
                      className={`w-2 h-2 rounded-full ${badgeBg} ring-2 ring-white dark:ring-slate-900 shadow-xs`}
                      title={`Status: ${statusText}`}
                    />
                  )}
                </div>

                {/* Body Content / Badges */}
                <div className="mt-1 space-y-0.5">
                  {hasRecord && rec ? (
                    <>
                      <span
                        className={`inline-block px-1 sm:px-1.5 py-0.5 rounded-[4px] text-[9px] sm:text-[10px] font-bold border truncate max-w-full ${statusBadgeClass}`}
                      >
                        {statusText}
                      </span>
                      {rec.status === 'Hadir' && rec.jam_masuk && (
                        <span className="block text-[8px] sm:text-[9px] font-mono text-slate-600 dark:text-slate-300 truncate">
                          {rec.jam_masuk.slice(0, 5)}
                        </span>
                      )}
                    </>
                  ) : item.isWeekend && item.isCurrentMonth ? (
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium italic block">
                      Libur
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Detail Drawer / Inspection Card */}
      {selectedDateStr && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Detail Presensi: {selectedDateStr}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDateStr(null)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Tutup Detail ✕
            </button>
          </div>

          {activeRecord ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              {/* Kolom 1: Status & Jam */}
              <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status Kehadiran
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeRecord.status === 'Hadir'
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                        : activeRecord.status === 'Izin'
                        ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300'
                        : activeRecord.status === 'Sakit'
                        ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300'
                        : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {activeRecord.status}{' '}
                    {activeRecord.status_ketepatan ? `(${activeRecord.status_ketepatan})` : ''}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 pt-1">
                  <strong>Jam Masuk:</strong> {activeRecord.jam_masuk || '-'}{' '}
                  <br />
                  <strong>Jam Pulang:</strong> {activeRecord.jam_pulang || 'Belum presensi pulang'}
                </p>
                {activeRecord.nama_shift && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Shift: {activeRecord.nama_shift}
                  </p>
                )}
              </div>

              {/* Kolom 2: Lokasi & Validasi DUDI */}
              <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Verifikasi & Lokasi
                </span>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-sky-500" />
                  <span>
                    Radius DUDI: <strong>{activeRecord.koordinat_absen?.jarak_meter || 0} meter</strong>
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Status DUDI:{' '}
                  <strong
                    className={
                      activeRecord.status_persetujuan_dudi === 'Disetujui'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }
                  >
                    {activeRecord.status_persetujuan_dudi || 'Menunggu'}
                  </strong>
                </div>
                {activeRecord.catatan_dudi && (
                  <p className="text-[11px] italic text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-md">
                    "{activeRecord.catatan_dudi}"
                  </p>
                )}
              </div>

              {/* Kolom 3: Foto Selfie Bukti */}
              <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Foto Selfie Kehadiran
                </span>
                {activeRecord.foto_selfie ? (
                  <div className="flex items-center gap-2">
                    <div
                      onClick={() =>
                        onOpenLightbox &&
                        onOpenLightbox(
                          activeRecord.foto_selfie,
                          `Presensi ${activeRecord.tanggal} (${activeRecord.status})`,
                          `Masuk: ${activeRecord.jam_masuk} • ${activeRecord.koordinat_absen?.jarak_meter || 0}m dari DUDI`
                        )
                      }
                      className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 hover:ring-2 hover:ring-sky-500 transition"
                      title="Klik untuk memperbesar foto"
                    >
                      <img
                        src={activeRecord.foto_selfie}
                        alt="Selfie Presensi"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenLightbox &&
                          onOpenLightbox(
                            activeRecord.foto_selfie,
                            `Presensi ${activeRecord.tanggal} (${activeRecord.status})`,
                            `Masuk: ${activeRecord.jam_masuk} • ${activeRecord.koordinat_absen?.jarak_meter || 0}m dari DUDI`
                          )
                        }
                        className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Perbesar</span>
                      </button>
                      {activeRecord.drive_view_url && (
                        <a
                          href={activeRecord.drive_view_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Drive</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {activeRecord.status === 'Izin' || activeRecord.status === 'Sakit'
                      ? 'Tidak memerlukan foto selfie (Izin/Sakit)'
                      : 'Foto tidak tersedia'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-2 text-xs text-slate-500 dark:text-slate-400">
              Tidak ada catatan presensi pada tanggal ini (hari libur kerja atau belum terisi).
            </div>
          )}
        </div>
      )}

      {/* Legend Indicators */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Penanda Warna:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Hadir Tepat Waktu</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span>Hadir Terlambat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
            <span>Izin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
            <span>Sakit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span>Alpha (Tanpa Keterangan)</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">
          *Klik kotak tanggal untuk melihat detail absensi harian
        </div>
      </div>
    </div>
  );
};
