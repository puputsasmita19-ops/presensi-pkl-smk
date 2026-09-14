import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Building2,
  BookOpen,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Calendar,
  Eye,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  ChevronRight,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import { User, Siswa, DUDI, GuruPembimbing, Presensi, JurnalHarian, KunjunganGuru } from '../types';

interface StatistikDataAdminProps {
  currentUser: User;
  siswaList: Siswa[];
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  presensiList: Presensi[];
  jurnalList: JurnalHarian[];
  kunjunganList: KunjunganGuru[];
  onSelectSiswaDetail: (siswa: Siswa) => void;
  onOpenWhatsAppModal: () => void;
  onNavigateTab: (tab: 'presensi' | 'jurnal' | 'master' | 'laporan' | 'log-aktivitas') => void;
}

export const StatistikDataAdmin: React.FC<StatistikDataAdminProps> = ({
  currentUser,
  siswaList,
  dudiList,
  guruList,
  presensiList,
  jurnalList,
  kunjunganList,
  onSelectSiswaDetail,
  onOpenWhatsAppModal,
  onNavigateTab,
}) => {
  const [selectedDudiFilter, setSelectedDudiFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Overall Attendance Metrics across all students
  const overallMetrics = useMemo(() => {
    const total = presensiList.length;
    const hadir = presensiList.filter((p) => p.status === 'Hadir').length;
    const tepatWaktu = presensiList.filter(
      (p) => p.status === 'Hadir' && p.status_ketepatan === 'Tepat Waktu'
    ).length;
    const terlambat = presensiList.filter(
      (p) => p.status === 'Hadir' && p.status_ketepatan === 'Terlambat'
    ).length;
    const izin = presensiList.filter((p) => p.status === 'Izin').length;
    const sakit = presensiList.filter((p) => p.status === 'Sakit').length;
    const alpa = presensiList.filter((p) => p.status === 'Alpa').length;

    const rateHadir = total > 0 ? Math.round((hadir / total) * 100) : 100;
    const rateTepat = hadir > 0 ? Math.round((tepatWaktu / hadir) * 100) : 100;

    // Percentages for stacked progress bar
    const pctTepat = total > 0 ? (tepatWaktu / total) * 100 : 100;
    const pctTelat = total > 0 ? (terlambat / total) * 100 : 0;
    const pctIzin = total > 0 ? (izin / total) * 100 : 0;
    const pctSakit = total > 0 ? (sakit / total) * 100 : 0;
    const pctAlpa = total > 0 ? (alpa / total) * 100 : 0;

    return {
      total,
      hadir,
      tepatWaktu,
      terlambat,
      izin,
      sakit,
      alpa,
      rateHadir,
      rateTepat,
      pctTepat,
      pctTelat,
      pctIzin,
      pctSakit,
      pctAlpa,
    };
  }, [presensiList]);

  // Per-student attendance calculation
  const studentAttendanceStats = useMemo(() => {
    return siswaList.map((siswa) => {
      const records = presensiList.filter((p) => p.id_siswa === siswa.id_siswa);
      const total = records.length;
      const hadir = records.filter((p) => p.status === 'Hadir').length;
      const tepatWaktu = records.filter(
        (p) => p.status === 'Hadir' && p.status_ketepatan === 'Tepat Waktu'
      ).length;
      const terlambat = records.filter(
        (p) => p.status === 'Hadir' && p.status_ketepatan === 'Terlambat'
      ).length;
      const izin = records.filter((p) => p.status === 'Izin').length;
      const sakit = records.filter((p) => p.status === 'Sakit').length;
      const alpa = records.filter((p) => p.status === 'Alpa').length;
      const rate = total > 0 ? Math.round((hadir / total) * 100) : 100;

      const dudi = dudiList.find((d) => d.id_dudi === siswa.id_dudi);
      const guru = guruList.find((g) => g.id_guru === siswa.id_guru_pembimbing);

      return {
        siswa,
        dudi,
        guru,
        total,
        hadir,
        tepatWaktu,
        terlambat,
        izin,
        sakit,
        alpa,
        rate,
        isWarning: total > 0 && (rate < 85 || alpa > 0 || terlambat >= 2),
      };
    });
  }, [siswaList, presensiList, dudiList, guruList]);

  // Statistics per DUDI
  const dudiStats = useMemo(() => {
    return dudiList.map((dudi) => {
      const assignedStudents = siswaList.filter((s) => s.id_dudi === dudi.id_dudi);
      const studentIds = new Set(assignedStudents.map((s) => s.id_siswa));
      const records = presensiList.filter((p) => studentIds.has(p.id_siswa));

      const total = records.length;
      const hadir = records.filter((p) => p.status === 'Hadir').length;
      const terlambat = records.filter(
        (p) => p.status === 'Hadir' && p.status_ketepatan === 'Terlambat'
      ).length;
      const rate = total > 0 ? Math.round((hadir / total) * 100) : 100;

      return {
        dudi,
        studentCount: assignedStudents.length,
        totalRecords: total,
        hadirCount: hadir,
        terlambatCount: terlambat,
        rate,
      };
    });
  }, [dudiList, siswaList, presensiList]);

  // Students requiring early warning attention
  const warningStudents = useMemo(() => {
    return studentAttendanceStats.filter((s) => s.isWarning);
  }, [studentAttendanceStats]);

  // Filtered live attendance log
  const filteredPresensi = useMemo(() => {
    return presensiList.filter((p) => {
      const s = siswaList.find((sis) => sis.id_siswa === p.id_siswa);
      const matchesSearch =
        !searchQuery ||
        (s && s.nama_lengkap.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.tanggal.includes(searchQuery);

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      const matchesDudi =
        selectedDudiFilter === 'ALL' || (s && s.id_dudi === selectedDudiFilter);

      return matchesSearch && matchesStatus && matchesDudi;
    });
  }, [presensiList, siswaList, searchQuery, statusFilter, selectedDudiFilter]);

  // Jurnal verification stats
  const jurnalStats = useMemo(() => {
    const total = jurnalList.length;
    const verified = jurnalList.filter(
      (j) => j.status_validasi_guru === 'Disetujui' && j.status_validasi_dudi === 'Disetujui'
    ).length;
    const pending = total - verified;
    return { total, verified, pending };
  }, [jurnalList]);

  const TARGET_MINIMAL_SEKOLAH = 85;

  return (
    <div
      id="halaman-statistik-data-admin"
      className="space-y-5 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200"
    >
      {/* 1. Header Banner: STATISTIK DATA & MONITORING PKL */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-2xl p-5 text-white border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-200 border border-sky-400/30 text-[11px] font-bold">
              <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
              <span>Portal Administrator</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Statistik Data & Monitoring PKL
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pusat analitik dan pemantauan data kehadiran siswa, kemitraan DUDI, jurnal kegiatan,
              dan log aktivitas secara realtime tanpa beban presensi mandiri.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('laporan')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10 cursor-pointer active:scale-95"
              title="Buka Rekap Laporan & Unduh PDF"
            >
              <Download className="w-3.5 h-3.5 text-sky-300" />
              <span>Rekap Laporan</span>
            </button>

            <button
              type="button"
              onClick={onOpenWhatsAppModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              title="Buka WhatsApp Gateway & Broadcast"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Gateway</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Rata-Rata Kehadiran Global */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kehadiran Global
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {overallMetrics.rateHadir}%
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Target: {TARGET_MINIMAL_SEKOLAH}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {overallMetrics.hadir} hadir dari {overallMetrics.total} catatan presensi
          </p>
        </div>

        {/* Siswa & Penempatan DUDI */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Siswa & DUDI Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {siswaList.length}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              di {dudiList.length} Mitra DUDI
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {guruList.length} Guru pembimbing aktif supervisi
          </p>
        </div>

        {/* Jurnal Kegiatan Harian */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Jurnal PKL
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {jurnalStats.total}
            </span>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
              {jurnalStats.verified} Tervalidasi
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {jurnalStats.pending > 0
              ? `${jurnalStats.pending} jurnal menunggu verifikasi`
              : 'Semua jurnal telah disetujui'}
          </p>
        </div>

        {/* Kunjungan Supervisi Guru */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Supervisi Guru
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {kunjunganList.length}
            </span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Kunjungan
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Monitoring langsung ke lokasi mitra industri
          </p>
        </div>
      </div>

      {/* 3. Progress Bar Komposisi Kedisiplinan Keseluruhan */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Komposisi & Distribusi Kehadiran Seluruh Siswa</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Berdasarkan seluruh catatan presensi yang masuk ke sistem
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Rasio Ketepatan Shift:
            </span>
            <strong className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              {overallMetrics.rateTepat}% Tepat Waktu
            </strong>
          </div>
        </div>

        {/* Visual Stacked Bar */}
        <div className="relative pt-1">
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
            {overallMetrics.total > 0 ? (
              <>
                <div
                  style={{ width: `${overallMetrics.pctTepat}%` }}
                  className="h-full bg-emerald-500"
                  title={`Tepat Waktu: ${overallMetrics.tepatWaktu} (${Math.round(overallMetrics.pctTepat)}%)`}
                />
                <div
                  style={{ width: `${overallMetrics.pctTelat}%` }}
                  className="h-full bg-amber-400"
                  title={`Terlambat: ${overallMetrics.terlambat} (${Math.round(overallMetrics.pctTelat)}%)`}
                />
                <div
                  style={{ width: `${overallMetrics.pctIzin}%` }}
                  className="h-full bg-sky-400"
                  title={`Izin: ${overallMetrics.izin} (${Math.round(overallMetrics.pctIzin)}%)`}
                />
                <div
                  style={{ width: `${overallMetrics.pctSakit}%` }}
                  className="h-full bg-purple-400"
                  title={`Sakit: ${overallMetrics.sakit} (${Math.round(overallMetrics.pctSakit)}%)`}
                />
                <div
                  style={{ width: `${overallMetrics.pctAlpa}%` }}
                  className="h-full bg-rose-500"
                  title={`Alpha: ${overallMetrics.alpa} (${Math.round(overallMetrics.pctAlpa)}%)`}
                />
              </>
            ) : (
              <div className="w-full h-full bg-slate-300 dark:bg-slate-700 text-[10px] text-center text-slate-500">
                Belum ada data presensi
              </div>
            )}
          </div>

          {/* Benchmark line 85% */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center z-10"
            style={{ left: `${TARGET_MINIMAL_SEKOLAH}%` }}
            title="Standar Target Minimal Sekolah (85%)"
          >
            <div className="w-0.5 h-full bg-slate-900 dark:bg-white shadow-xs" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Tepat: <strong>{overallMetrics.tepatWaktu}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Terlambat: <strong>{overallMetrics.terlambat}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>Izin: <strong>{overallMetrics.izin}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span>Sakit: <strong>{overallMetrics.sakit}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Alpha: <strong className="text-rose-600 dark:text-rose-400">{overallMetrics.alpa}</strong></span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 ml-auto">
            <span className="w-1.5 h-3 bg-slate-800 dark:bg-white inline-block rounded-xs" />
            <span>Target Minimal 85%</span>
          </div>
        </div>
      </div>

      {/* 4. Two Columns: Statistik Per DUDI & Daftar Siswa Perlu Perhatian */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kolom Kiri: Statistik Kehadiran Per Tempat DUDI */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Performa Kehadiran Per DUDI</span>
            </h3>
            <span className="text-xs text-slate-500">{dudiList.length} Mitra</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {dudiStats.map((item) => (
              <div key={item.dudi.id_dudi} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 block">
                      {item.dudi.nama_instansi}
                    </strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.studentCount} Siswa magang • Pembina: {item.dudi.nama_pembimbing}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {item.rate}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.hadirCount}/{item.totalRecords} hari hadir
                    </span>
                  </div>
                </div>

                {/* Progress bar per DUDI */}
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.rate}%` }}
                    className={`h-full transition-all ${
                      item.rate >= 85
                        ? 'bg-emerald-500'
                        : item.rate >= 75
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kolom Kanan: Peringatan Dini Kedisiplinan Siswa (Early Warning) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Monitoring Siswa & Evaluasi</span>
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Total {siswaList.length} Siswa
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Klik siswa untuk membuka profil lengkap serta kalender kehadiran interaktif.
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[320px] overflow-y-auto">
            {studentAttendanceStats.map((item) => (
              <div
                key={item.siswa.id_siswa}
                className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 px-2 rounded-xl transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-xs text-slate-800 dark:text-slate-200 truncate">
                      {item.siswa.nama_lengkap}
                    </strong>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.siswa.nis}
                    </span>
                    {item.isWarning && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        Perlu Perhatian
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {item.dudi?.nama_instansi || 'DUDI'} • {item.total} hari ({item.rate}% hadir,{' '}
                    {item.terlambat} telat, {item.alpa} alpa)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectSiswaDetail(item.siswa)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition shrink-0 cursor-pointer active:scale-95"
                  title="Lihat Profil & Kalender Kehadiran Siswa"
                >
                  <span>Profil & Kalender</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Rekap Log Presensi Siswa Terbaru (Live Data Table) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Log Data Presensi Terbaru Siswa</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daftar rekam kehadiran yang tercatat dalam database sistem
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa/tanggal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 w-44"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Alpa">Alpha</option>
            </select>

            <select
              value={selectedDudiFilter}
              onChange={(e) => setSelectedDudiFilter(e.target.value)}
              className="p-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer max-w-[150px] truncate"
            >
              <option value="ALL">Semua DUDI</option>
              {dudiList.map((d) => (
                <option key={d.id_dudi} value={d.id_dudi}>
                  {d.nama_instansi}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Siswa & Kelas</th>
                  <th className="p-3">Tempat DUDI</th>
                  <th className="p-3">Hari & Tanggal</th>
                  <th className="p-3">Jam Masuk / Pulang</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Persetujuan DUDI</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredPresensi.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Tidak ada data presensi yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredPresensi.slice(0, 10).map((record) => {
                    const student = siswaList.find((s) => s.id_siswa === record.id_siswa);
                    const dudi = dudiList.find((d) => d.id_dudi === student?.id_dudi);

                    return (
                      <tr
                        key={record.id_presensi}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3">
                          <strong className="text-slate-900 dark:text-slate-100 block">
                            {student?.nama_lengkap || record.id_siswa}
                          </strong>
                          <span className="text-[11px] text-slate-500">
                            NIS: {student?.nis || '-'} • {student?.kelas || '-'}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="text-slate-700 dark:text-slate-300 font-medium block">
                            {dudi?.nama_instansi || '-'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {record.nama_shift || 'Shift Reguler'}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {record.hari ? `${record.hari}, ` : ''}
                            {record.tanggal}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            Masuk: <strong>{record.jam_masuk || '-'}</strong>
                            <br />
                            Pulang: <strong>{record.jam_pulang || '-'}</strong>
                          </div>
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              record.status === 'Hadir'
                                ? record.status_ketepatan === 'Terlambat'
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                                : record.status === 'Izin'
                                ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300'
                                : record.status === 'Sakit'
                                ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-300'
                                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300'
                            }`}
                          >
                            {record.status} {record.status_ketepatan ? `(${record.status_ketepatan})` : ''}
                          </span>
                        </td>

                        <td className="p-3">
                          <span
                            className={`text-xs font-semibold ${
                              record.status_persetujuan_dudi === 'Disetujui'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {record.status_persetujuan_dudi || 'Menunggu'}
                          </span>
                          {record.catatan_dudi && (
                            <p className="text-[10px] italic text-slate-400 truncate max-w-[150px]">
                              "{record.catatan_dudi}"
                            </p>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          {student && (
                            <button
                              type="button"
                              onClick={() => onSelectSiswaDetail(student)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                              title="Buka Profil & Kalender Siswa"
                            >
                              Detail
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Menampilkan {Math.min(filteredPresensi.length, 10)} dari {filteredPresensi.length} catatan presensi
          </span>
          <button
            type="button"
            onClick={() => onNavigateTab('laporan')}
            className="text-sky-600 dark:text-sky-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Buka Laporan Lengkap</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
