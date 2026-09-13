import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Clock4,
  Calendar,
  Building2,
  FileText,
  Filter,
  Search,
  Camera,
  Download,
  ArrowRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { Siswa, DUDI, Presensi, User } from '../types';
import { StatistikKehadiranWidget } from './StatistikKehadiranWidget';
import { getNamaHari } from '../utils/shiftHelper';

interface StatistikSiswaProps {
  currentUser: User;
  siswaList: Siswa[];
  dudiList: DUDI[];
  presensiList: Presensi[];
  onNavigateToPresensi: () => void;
  onNavigateToLaporan: () => void;
}

export const StatistikSiswa: React.FC<StatistikSiswaProps> = ({
  currentUser,
  siswaList,
  dudiList,
  presensiList,
  onNavigateToPresensi,
  onNavigateToLaporan,
}) => {
  // Identify current student record
  const currentSiswa =
    siswaList.find((s) => s.id_user === currentUser.id_user) ||
    siswaList.find(
      (s) =>
        s.id_siswa === currentUser.id_user ||
        s.nama_lengkap.toLowerCase() === currentUser.nama_lengkap.toLowerCase()
    ) ||
    siswaList[0];

  const assignedDUDI =
    dudiList.find((d) => d.id_dudi === currentSiswa?.id_dudi) || dudiList[0];

  // Records for this student
  const studentRecords = useMemo(() => {
    if (!currentSiswa) return [];
    return presensiList.filter((p) => p.id_siswa === currentSiswa.id_siswa);
  }, [presensiList, currentSiswa]);

  // Filter states
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Hadir' | 'Tepat Waktu' | 'Terlambat' | 'Izin' | 'Sakit'>('Semua');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Filtered records
  const filteredRecords = useMemo(() => {
    return studentRecords.filter((p) => {
      if (filterStatus === 'Hadir' && p.status !== 'Hadir') return false;
      if (filterStatus === 'Tepat Waktu' && (p.status !== 'Hadir' || p.status_ketepatan !== 'Tepat Waktu')) return false;
      if (filterStatus === 'Terlambat' && (p.status !== 'Hadir' || p.status_ketepatan !== 'Terlambat')) return false;
      if (filterStatus === 'Izin' && p.status !== 'Izin') return false;
      if (filterStatus === 'Sakit' && p.status !== 'Sakit') return false;

      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const dateMatch = p.tanggal.toLowerCase().includes(q);
        const dayMatch = (p.hari || '').toLowerCase().includes(q);
        const shiftMatch = (p.nama_shift || '').toLowerCase().includes(q);
        const ketMatch = (p.keterangan || '').toLowerCase().includes(q);
        return dateMatch || dayMatch || shiftMatch || ketMatch;
      }
      return true;
    });
  }, [studentRecords, filterStatus, searchKeyword]);

  // Today attendance status
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = studentRecords.find((p) => p.tanggal === todayStr);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 uppercase tracking-wider">
              Statistik & Progres Siswa
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {currentSiswa?.kelas}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Dashboard Kehadiran & Kedisiplinan PKL</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitoring rekapitulasi kehadiran, persentase kedisiplinan shift, dan performa magang Anda di {assignedDUDI?.nama_instansi}.
          </p>
        </div>

        {/* Quick CTA to Attendance Form */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onNavigateToPresensi}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Presensi Hari Ini</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToLaporan}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* Today Status Quick Notification */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Status Presensi Hari Ini ({todayStr})
            </span>
            {todayAttendance ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sudah Presensi: {todayAttendance.status} ({todayAttendance.jam_masuk} WIB)
                </span>
                {todayAttendance.jam_pulang && (
                  <span className="text-[11px] text-slate-300 font-mono">
                    • Pulang: {todayAttendance.jam_pulang} WIB
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                Belum melakukan presensi hari ini
              </span>
            )}
          </div>
        </div>

        {!todayAttendance && (
          <button
            type="button"
            onClick={onNavigateToPresensi}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
          >
            <span>Buka Form Presensi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Interactive Visual StatistikKehadiranWidget */}
      {currentSiswa && (
        <StatistikKehadiranWidget
          siswa={currentSiswa}
          presensiList={presensiList}
        />
      )}

      {/* Filterable Attendance History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Daftar Riwayat Kehadiran Mandiri ({filteredRecords.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Catatan jam masuk, pulang, shift kerja, dan status ketepatan waktu
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari tanggal, shift..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {(['Semua', 'Hadir', 'Tepat Waktu', 'Terlambat', 'Izin', 'Sakit'] as const).map((st) => {
            const isSelected = filterStatus === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-sky-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Attendance Records List */}
        {filteredRecords.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1">
            <p className="text-xs font-semibold">Tidak ada riwayat presensi yang sesuai filter.</p>
            <p className="text-[11px]">Silakan ubah filter atau lakukan presensi baru.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.map((p) => {
              const statusBg =
                p.status === 'Hadir'
                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                  : p.status === 'Izin'
                  ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300'
                  : 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300';

              return (
                <div
                  key={p.id_presensi}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {p.hari ? `${p.hari}, ` : ''}{p.tanggal}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBg}`}>
                        {p.status}
                      </span>
                      {p.nama_shift && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.nama_shift}
                        </span>
                      )}
                      {p.status_ketepatan && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                            p.status_ketepatan === 'Tepat Waktu'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {p.status_ketepatan}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>Masuk: <strong className="text-slate-700 dark:text-slate-300 font-mono">{p.jam_masuk} WIB</strong></span>
                      <span>•</span>
                      <span>Pulang: <strong className="text-slate-700 dark:text-slate-300 font-mono">{p.jam_pulang || 'Belum Absen Pulang'}</strong></span>
                      {p.keterangan && (
                        <>
                          <span>•</span>
                          <span className="italic text-slate-600 dark:text-slate-300">"{p.keterangan}"</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-right shrink-0">
                    {p.koordinat_absen?.jarak_meter !== undefined && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Jarak: {p.koordinat_absen.jarak_meter} m
                      </span>
                    )}
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Terverifikasi
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
