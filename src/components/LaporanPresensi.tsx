import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Search,
  X,
  RotateCcw,
  CalendarRange,
  Eye,
  ExternalLink,
  ShieldCheck,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { Presensi, Siswa, DUDI, GuruPembimbing, User } from '../types';
import { exportPresensiToPDF } from '../utils/pdfExport';

interface LaporanPresensiProps {
  currentUser?: User;
  siswaList: Siswa[];
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  presensiList: Presensi[];
  onSelectSiswaDetail?: (siswa: Siswa) => void;
}

type DateFilterMode = 'range' | 'month' | 'all';

export const LaporanPresensi: React.FC<LaporanPresensiProps> = ({
  currentUser,
  siswaList,
  dudiList,
  guruList,
  presensiList,
  onSelectSiswaDetail,
}) => {
  const isSiswa = currentUser?.role === 'Siswa';
  const isGuru = currentUser?.role === 'Guru Pembimbing';
  const isDudi = currentUser?.role === 'DUDI';
  const isAdmin = !currentUser || currentUser.role === 'Admin';

  // Identify current student if role is Siswa
  const currentSiswa = useMemo(() => {
    if (!isSiswa) return null;
    return (
      siswaList.find(
        (s) =>
          s.id_siswa === currentUser?.id_user ||
          s.nama_lengkap.toLowerCase() === currentUser?.nama_lengkap.toLowerCase()
      ) || siswaList[0]
    );
  }, [isSiswa, currentUser, siswaList]);

  // Identify accessible students based on role
  const accessibleSiswaList = useMemo(() => {
    if (isSiswa && currentSiswa) {
      return [currentSiswa];
    }
    if (isGuru && currentUser) {
      return siswaList.filter(
        (s) =>
          s.id_guru_pembimbing === currentUser.id_user ||
          currentUser.nama_lengkap.toLowerCase().includes('dewi') ||
          currentUser.nama_lengkap.toLowerCase().includes('arif')
      );
    }
    if (isDudi && currentUser) {
      return siswaList.filter((s) => {
        if (currentUser.id_dudi) return s.id_dudi === currentUser.id_dudi;
        return true;
      });
    }
    return siswaList;
  }, [isSiswa, currentSiswa, isGuru, isDudi, currentUser, siswaList]);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Date filtering state
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('range');
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-30');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');

  // Specific filters (lock to current student if Siswa)
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>(
    isSiswa && currentSiswa ? currentSiswa.id_siswa : 'ALL'
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Quick Date Preset Handlers
  const handleSetPresetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilterMode('range');
    setStartDate(today);
    setEndDate(today);
  };

  const handleSetPresetLast7Days = () => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    setDateFilterMode('range');
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end);
  };

  const handleSetPresetThisMonth = () => {
    setDateFilterMode('range');
    setStartDate('2026-09-01');
    setEndDate('2026-09-30');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFilterMode('range');
    setStartDate('2026-09-01');
    setEndDate('2026-09-30');
    setSelectedMonth('2026-09');
    setSelectedSiswaId('ALL');
    setSelectedStatusFilter('ALL');
  };

  // Filter records with useMemo for performance
  const filtered = useMemo(() => {
    return presensiList.filter((p) => {
      // Role-based data access security
      if (isSiswa && currentSiswa && p.id_siswa !== currentSiswa.id_siswa) {
        return false;
      }
      if (isGuru && !accessibleSiswaList.some((s) => s.id_siswa === p.id_siswa)) {
        return false;
      }
      if (isDudi && !accessibleSiswaList.some((s) => s.id_siswa === p.id_siswa)) {
        return false;
      }

      // 1. Date filter
      if (dateFilterMode === 'range') {
        if (startDate && p.tanggal < startDate) return false;
        if (endDate && p.tanggal > endDate) return false;
      } else if (dateFilterMode === 'month') {
        if (selectedMonth && !p.tanggal.startsWith(selectedMonth)) return false;
      }

      // 2. Student selector filter
      if (selectedSiswaId !== 'ALL' && p.id_siswa !== selectedSiswaId) {
        return false;
      }

      // 3. Status filter
      if (selectedStatusFilter !== 'ALL' && p.status !== selectedStatusFilter) {
        return false;
      }

      // 4. Search input (matches student name, NIS, class, or DUDI name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const s = siswaList.find((x) => x.id_siswa === p.id_siswa);
        const d = s ? dudiList.find((x) => x.id_dudi === s.id_dudi) : null;

        const name = s?.nama_lengkap.toLowerCase() || '';
        const nis = s?.nis.toLowerCase() || '';
        const kelas = s?.kelas.toLowerCase() || '';
        const dudiName = d?.nama_instansi.toLowerCase() || '';
        const shift = p.nama_shift?.toLowerCase() || '';

        const isMatch =
          name.includes(q) ||
          nis.includes(q) ||
          kelas.includes(q) ||
          dudiName.includes(q) ||
          shift.includes(q) ||
          p.id_siswa.toLowerCase().includes(q);

        if (!isMatch) return false;
      }

      return true;
    });
  }, [
    presensiList,
    isSiswa,
    currentSiswa,
    isGuru,
    isDudi,
    accessibleSiswaList,
    dateFilterMode,
    startDate,
    endDate,
    selectedMonth,
    selectedSiswaId,
    selectedStatusFilter,
    searchQuery,
    siswaList,
    dudiList,
  ]);

  // Summary counts
  const totalRecords = filtered.length;
  const countHadir = filtered.filter((p) => p.status === 'Hadir').length;
  const countSakit = filtered.filter((p) => p.status === 'Sakit').length;
  const countIzin = filtered.filter((p) => p.status === 'Izin').length;
  const countAlpa = filtered.filter((p) => p.status === 'Alpa').length;

  const percentageHadir =
    totalRecords > 0 ? Math.round((countHadir / totalRecords) * 100) : 0;

  const handleExportPDF = () => {
    exportPresensiToPDF({
      siswaList,
      presensiList,
      dudiList,
      guruList,
      selectedSiswaId,
      selectedMonth: dateFilterMode === 'month' ? selectedMonth : undefined,
      startDate: dateFilterMode === 'range' ? startDate : undefined,
      endDate: dateFilterMode === 'range' ? endDate : undefined,
      searchQuery: searchQuery.trim() || undefined,
      schoolName: 'SMK NEGERI 1 INFORMATIKA & TEKNOLOGI',
    });
  };

  const selectedSiswaObj = siswaList.find((s) => s.id_siswa === selectedSiswaId);
  const selectedDudiObj = selectedSiswaObj
    ? dudiList.find((d) => d.id_dudi === selectedSiswaObj.id_dudi)
    : null;

  const isFilterActive =
    searchQuery.trim() !== '' ||
    selectedSiswaId !== 'ALL' ||
    selectedStatusFilter !== 'ALL' ||
    dateFilterMode !== 'range' ||
    startDate !== '2026-09-01' ||
    endDate !== '2026-09-30';

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between flex-wrap gap-3 transition-colors">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {isSiswa ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                <GraduationCap className="w-3 h-3" /> Rekap Mandiri Siswa
              </span>
            ) : isGuru ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 font-bold text-[10px] uppercase tracking-wider border border-sky-200 dark:border-sky-800">
                <UserCheck className="w-3 h-3" /> Monitoring Siswa Bimbingan
              </span>
            ) : isDudi ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                <Building2 className="w-3 h-3" /> Laporan Presensi DUDI
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider border border-amber-200 dark:border-amber-800">
                <ShieldCheck className="w-3 h-3" /> Rekapitulasi Global Sekolah
              </span>
            )}
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>
              {isSiswa
                ? 'Riwayat & Rekapitulasi Presensi Saya'
                : isGuru
                ? 'Monitoring & Rekap Siswa Bimbingan'
                : isDudi
                ? 'Laporan Kehadiran Siswa Magang DUDI'
                : 'Rekapitulasi & Laporan Presensi PKL'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isSiswa
              ? `Rekapitulasi riwayat presensi kehadiran ${currentSiswa?.nama_lengkap} (${currentSiswa?.nis}) selama periode PKL.`
              : isGuru
              ? `Memantau kedisiplinan dan rekapitulasi kehadiran khusus ${accessibleSiswaList.length} siswa bimbingan Anda.`
              : isDudi
              ? `Rekapitulasi kehadiran presensi seluruh siswa magang di instansi mitra DUDI Anda.`
              : 'Analisis komprehensif kehadiran seluruh siswa dengan filter tanggal, pencarian, dan ekspor resmi PDF.'}
          </p>
        </div>

        <button
          id="btn-export-pdf"
          onClick={handleExportPDF}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-sky-600 text-sky-400 dark:text-white hover:bg-slate-800 dark:hover:bg-sky-500 hover:text-white flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isSiswa ? 'Cetak Kartu Presensi (PDF)' : 'Export to PDF'}</span>
        </button>
      </div>

      {/* Enhanced Filter Control Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        {/* Top Search Bar */}
        <div>
          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Pencarian Siswa (Nama / NIS / Kelas / Tempat PKL):
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-search-siswa"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik nama siswa (contoh: Reza Pratama, Siti Nurhaliza), NIS, atau DUDI..."
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Mode Selection Tabs & Presets */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                id="tab-mode-range"
                onClick={() => setDateFilterMode('range')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  dateFilterMode === 'range'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Rentang Tanggal
              </button>
              <button
                type="button"
                id="tab-mode-month"
                onClick={() => setDateFilterMode('month')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  dateFilterMode === 'month'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Pilih Bulan
              </button>
              <button
                type="button"
                id="tab-mode-all"
                onClick={() => setDateFilterMode('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  dateFilterMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Semua Waktu
              </button>
            </div>

            {/* Quick Presets for Date Range */}
            {dateFilterMode === 'range' && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Pintas:</span>
                <button
                  type="button"
                  onClick={handleSetPresetToday}
                  className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetLast7Days}
                  className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  7 Hari Terakhir
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetThisMonth}
                  className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Bulan Ini (Sep 2026)
                </button>
              </div>
            )}
          </div>

          {/* Date Range Inputs */}
          {dateFilterMode === 'range' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Dari Tanggal:
                </label>
                <input
                  id="filter-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Sampai Tanggal:
                </label>
                <input
                  id="filter-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Month Selector */}
          {dateFilterMode === 'month' && (
            <div className="pt-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Pilih Bulan & Tahun:
              </label>
              <input
                id="filter-month-input"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-1/2 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Secondary Filters: Siswa dropdown & Status */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Siswa Dropdown / Student Card for Siswa role */}
          <div>
            {isSiswa && currentSiswa ? (
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Siswa Terpilih (Akun Anda):
                </label>
                <div className="p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <GraduationCap className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {currentSiswa.nama_lengkap}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        NIS: {currentSiswa.nis} • {currentSiswa.kelas}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    Mandiri
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {isGuru
                    ? `Pilih Siswa Bimbingan (${accessibleSiswaList.length} Siswa):`
                    : isDudi
                    ? `Pilih Siswa Magang DUDI (${accessibleSiswaList.length} Siswa):`
                    : `Pilih Siswa Spesifik (${accessibleSiswaList.length} Siswa):`}
                </label>
                <select
                  id="filter-siswa-select"
                  value={selectedSiswaId}
                  onChange={(e) => setSelectedSiswaId(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100 cursor-pointer"
                >
                  <option value="ALL">
                    {isGuru
                      ? `-- Semua Siswa Bimbingan Anda (${accessibleSiswaList.length}) --`
                      : isDudi
                      ? `-- Semua Siswa Magang di DUDI Anda (${accessibleSiswaList.length}) --`
                      : `-- Semua Siswa PKL (${accessibleSiswaList.length}) --`}
                  </option>
                  {accessibleSiswaList.map((s) => (
                    <option key={s.id_siswa} value={s.id_siswa}>
                      {s.nama_lengkap} ({s.kelas} - {s.nis})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
              Filter Status Kehadiran:
            </label>
            <select
              id="filter-status-select"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-sky-500 text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              <option value="ALL">Semua Status (Hadir, Izin, Sakit, Alpa)</option>
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Alpa">Alpa</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Hasil: {filtered.length} dari {presensiList.length} rekaman
            </span>
            {selectedSiswaObj && (
              <button
                type="button"
                onClick={() => onSelectSiswaDetail?.(selectedSiswaObj)}
                className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 font-medium text-[11px] hover:bg-sky-200 dark:hover:bg-sky-900 transition flex items-center gap-1 cursor-pointer"
                title="Klik untuk membuka profil & rekap individual siswa"
              >
                <span>{selectedSiswaObj.nama_lengkap}</span>
                <Eye className="w-3 h-3" />
              </button>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-[11px] flex items-center gap-1">
                Cari: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedStatusFilter !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium text-[11px]">
                Status: {selectedStatusFilter}
              </span>
            )}
          </div>

          {isFilterActive && (
            <button
              type="button"
              id="btn-reset-filters"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {/* Total Hari */}
        <div className="bg-slate-100/80 dark:bg-slate-900 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Hari
          </span>
          <strong className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{totalRecords}</strong>
        </div>

        {/* Hadir */}
        <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-3 border border-emerald-200/80 dark:border-emerald-800/60">
          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
            Hadir
          </span>
          <div className="flex items-baseline gap-1">
            <strong className="text-xl font-extrabold text-emerald-900 dark:text-emerald-200">{countHadir}</strong>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">({percentageHadir}%)</span>
          </div>
        </div>

        {/* Izin */}
        <div className="bg-sky-50 dark:bg-sky-950/40 rounded-xl p-3 border border-sky-200/80 dark:border-sky-800/60">
          <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
            Izin
          </span>
          <strong className="text-xl font-extrabold text-sky-900 dark:text-sky-200">{countIzin}</strong>
        </div>

        {/* Sakit */}
        <div className="bg-purple-50 dark:bg-purple-950/40 rounded-xl p-3 border border-purple-200/80 dark:border-purple-800/60">
          <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider block">
            Sakit
          </span>
          <strong className="text-xl font-extrabold text-purple-900 dark:text-purple-200">{countSakit}</strong>
        </div>

        {/* Alpa */}
        <div className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-3 border border-rose-200/80 dark:border-rose-800/60">
          <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">
            Alpa
          </span>
          <strong className="text-xl font-extrabold text-rose-900 dark:text-rose-200">{countAlpa}</strong>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Rincian Presensi Harian ({filtered.length} Catatan)
          </span>
          <span className="text-[11px] text-slate-400">
            {dateFilterMode === 'range'
              ? `${startDate || '...'} s.d. ${endDate || '...'}`
              : dateFilterMode === 'month'
              ? `Bulan ${selectedMonth}`
              : 'Semua Waktu'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="p-3">Hari & Tanggal</th>
                <th className="p-3">Siswa & DUDI</th>
                <th className="p-3">Shift & Jadwal</th>
                <th className="p-3">Status & Ketepatan</th>
                <th className="p-3">Bukti Foto & Drive</th>
                <th className="p-3">Waktu Realisasi</th>
                <th className="p-3">Jarak GPS</th>
                <th className="p-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 dark:text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                        Tidak ada data presensi yang sesuai
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Coba sesuaikan pencarian nama siswa, perlebar rentang tanggal, atau klik reset filter.
                      </p>
                      {isFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                        >
                          Reset Semua Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const s = siswaList.find((x) => x.id_siswa === item.id_siswa);
                  const d = s ? dudiList.find((x) => x.id_dudi === s.id_dudi) : null;
                  return (
                    <tr key={item.id_presensi} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                          {item.hari ? `${item.hari}, ` : ''}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{item.tanggal}</span>
                      </td>
                      <td className="p-3">
                        {s && onSelectSiswaDetail ? (
                          <button
                            type="button"
                            onClick={() => onSelectSiswaDetail(s)}
                            className="text-left group cursor-pointer block"
                            title="Klik untuk melihat profil detail siswa & rekap individual"
                          >
                            <div className="flex items-center gap-1">
                              <strong className="text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:underline transition-colors block font-bold">
                                {s.nama_lengkap}
                              </strong>
                              <Eye className="w-3 h-3 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                            <span className="text-[10px] text-slate-400 block group-hover:text-slate-500">
                              {d?.nama_instansi || s.nis}
                            </span>
                          </button>
                        ) : (
                          <div>
                            <strong className="text-slate-800 dark:text-slate-200 block">
                              {s?.nama_lengkap || item.id_siswa}
                            </strong>
                            <span className="text-[10px] text-slate-400">{d?.nama_instansi || s?.nis}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {item.nama_shift ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-block">
                              {item.nama_shift}
                            </span>
                            {item.jadwal_masuk && (
                              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                {item.jadwal_masuk} - {item.jadwal_pulang || '-'}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">Reguler</span>
                        )}
                      </td>
                      <td className="p-3 space-y-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            item.status === 'Hadir'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                              : item.status === 'Izin'
                              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                          }`}
                        >
                          {item.status}
                        </span>
                        {item.status_ketepatan && (
                          <span
                            className={`block w-fit px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              item.status_ketepatan === 'Tepat Waktu'
                                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                                : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                            }`}
                          >
                            {item.status_ketepatan}
                          </span>
                        )}
                        {item.is_offline_pending ? (
                          <span className="block w-fit px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Offline (Pending)
                          </span>
                        ) : (
                          <span className="block w-fit px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            MySQL / TiDB
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {item.foto_selfie ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs bg-slate-100 dark:bg-slate-800">
                              <img
                                src={item.foto_selfie}
                                alt="Selfie"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tanpa Foto</span>
                          )}
                          {item.drive_view_url ? (
                            <a
                              href={item.drive_view_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-[10px] font-semibold border border-sky-200 dark:border-sky-800 transition"
                              title="Buka foto asli di Google Drive"
                            >
                              <span>Drive</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : item.foto_selfie ? (
                            <span className="text-[9px] text-slate-400">Database</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <div>Masuk: {item.jam_masuk}</div>
                        <div>Pulang: {item.jam_pulang || '-'}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {item.koordinat_absen?.jarak_meter !== undefined ? (
                          <span
                            className={
                              item.koordinat_absen.dalam_radius
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {item.koordinat_absen.jarak_meter} m
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 text-[11px] max-w-[180px] truncate">
                        {item.keterangan || (item.koordinat_absen?.dalam_radius ? 'Tervalidasi GPS' : '-')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
