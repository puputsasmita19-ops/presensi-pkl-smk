import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock4,
  ChevronRight,
  Info,
  CalendarCheck,
  Percent,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Siswa, Presensi } from '../types';

interface StatistikKehadiranWidgetProps {
  siswa: Siswa;
  presensiList: Presensi[];
  onOpenDetail?: () => void;
  className?: string;
}

export const StatistikKehadiranWidget: React.FC<StatistikKehadiranWidgetProps> = ({
  siswa,
  presensiList,
  onOpenDetail,
  className = '',
}) => {
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  // Filter records belonging to this student
  const studentRecords = useMemo(() => {
    return presensiList.filter((p) => p.id_siswa === siswa.id_siswa);
  }, [presensiList, siswa.id_siswa]);

  // Compute detailed statistics
  const stats = useMemo(() => {
    const total = studentRecords.length;
    const hadir = studentRecords.filter((p) => p.status === 'Hadir').length;
    const izin = studentRecords.filter((p) => p.status === 'Izin').length;
    const sakit = studentRecords.filter((p) => p.status === 'Sakit').length;
    const alpa = studentRecords.filter((p) => p.status === 'Alpa').length;

    const tepatWaktu = studentRecords.filter(
      (p) => p.status === 'Hadir' && p.status_ketepatan === 'Tepat Waktu'
    ).length;
    const terlambat = studentRecords.filter(
      (p) => p.status === 'Hadir' && p.status_ketepatan === 'Terlambat'
    ).length;

    // Attendance percentage: (Hadir / total) * 100%
    const rateHadir = total > 0 ? Math.round((hadir / total) * 100) : 100;
    // Punctuality percentage: (Tepat Waktu / Hadir) * 100%
    const rateTepatWaktu = hadir > 0 ? Math.round((tepatWaktu / hadir) * 100) : 100;

    // Segment widths for proportional stacked progress bar (percentage of total records)
    const pctTepatWaktu = total > 0 ? (tepatWaktu / total) * 100 : 100;
    const pctTerlambat = total > 0 ? (terlambat / total) * 100 : 0;
    const pctIzin = total > 0 ? (izin / total) * 100 : 0;
    const pctSakit = total > 0 ? (sakit / total) * 100 : 0;
    const pctAlpa = total > 0 ? (alpa / total) * 100 : 0;

    // Evaluation & discipline rating
    let gradeLabel = 'Sangat Disiplin';
    let gradeBadgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    let progressBarGradient = 'from-emerald-500 to-teal-400';
    let feedbackNote =
      'Kedisiplinan Anda istimewa! Pertahankan tingkat kehadiran prima ini untuk meraih nilai PKL sempurna.';
    let isTargetAchieved = true;

    if (total === 0) {
      gradeLabel = 'Baru Memulai';
      gradeBadgeBg = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      progressBarGradient = 'from-sky-500 to-emerald-400';
      feedbackNote = 'Belum ada catatan presensi tersimpan. Lakukan presensi masuk hari ini untuk memulai rekor kehadiran Anda!';
      isTargetAchieved = true;
    } else if (rateHadir >= 90) {
      gradeLabel = 'Sangat Disiplin (≥90%)';
      gradeBadgeBg = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      progressBarGradient = 'from-emerald-500 to-teal-400';
      feedbackNote =
        'Tingkat kehadiran Anda melampaui target sekolah (85%). Disiplin dan etos kerja Anda sangat diapresiasi pihak DUDI.';
      isTargetAchieved = true;
    } else if (rateHadir >= 80) {
      gradeLabel = 'Disiplin Baik (80-89%)';
      gradeBadgeBg = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30';
      progressBarGradient = 'from-sky-500 to-blue-500';
      feedbackNote =
        'Tingkat kehadiran Anda baik dan memenuhi target minimal PKL. Tingkatkan ketepatan waktu sebelum jam shift dimulai.';
      isTargetAchieved = true;
    } else if (rateHadir >= 70) {
      gradeLabel = 'Perlu Perhatian (70-79%)';
      gradeBadgeBg = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
      progressBarGradient = 'from-amber-500 to-orange-400';
      feedbackNote =
        'Tingkat kehadiran Anda berada di bawah batas target sekolah (85%). Usahakan selalu hadir tepat waktu agar evaluasi akhir PKL tidak terkendala.';
      isTargetAchieved = false;
    } else {
      gradeLabel = 'Kritis (<70%)';
      gradeBadgeBg = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
      progressBarGradient = 'from-rose-500 to-red-500';
      feedbackNote =
        'Peringatan kedisiplinan! Kehadiran Anda rendah. Harap segera berkoordinasi dengan Guru Pembimbing dan Pembina DUDI.';
      isTargetAchieved = false;
    }

    return {
      total,
      hadir,
      izin,
      sakit,
      alpa,
      tepatWaktu,
      terlambat,
      rateHadir,
      rateTepatWaktu,
      pctTepatWaktu,
      pctTerlambat,
      pctIzin,
      pctSakit,
      pctAlpa,
      gradeLabel,
      gradeBadgeBg,
      progressBarGradient,
      feedbackNote,
      isTargetAchieved,
    };
  }, [studentRecords]);

  // Target standard percentage for vocational internship
  const TARGET_MINIMAL_SEKOLAH = 85;

  return (
    <div
      id="widget-statistik-kehadiran-siswa"
      className={`bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors space-y-4 ${className}`}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Statistik Kedisiplinan Kehadiran
              </h3>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border inline-flex items-center gap-1 ${stats.gradeBadgeBg}`}
              >
                <Award className="w-3 h-3" />
                <span>{stats.gradeLabel}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pantau persentase kehadiran & konsistensi jam kerja PKL Anda
            </p>
          </div>
        </div>

        {onOpenDetail && (
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition cursor-pointer shrink-0 active:scale-95"
            title="Buka Profil Lengkap & Rekap Riwayat Presensi"
          >
            <span className="hidden xs:inline">Lihat Riwayat</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Progress Bar & Percentage Card */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
              Persentase Kehadiran
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {stats.rateHadir}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                dari {stats.total} hari tercatat
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              <span>Target Sekolah:</span>
              <strong className="font-bold text-slate-900 dark:text-white">{TARGET_MINIMAL_SEKOLAH}%</strong>
            </div>
            <div className="mt-0.5">
              {stats.isTargetAchieved ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/80">
                  <CheckCircle2 className="w-3 h-3" /> Memenuhi Target
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/80">
                  <AlertTriangle className="w-3 h-3" /> Di Bawah Target
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Visual Progress Bar with Target Benchmark Line */}
        <div className="relative pt-1">
          {/* Progress Track */}
          <div className="h-3.5 sm:h-4 w-full bg-slate-200 dark:bg-slate-700/80 rounded-full overflow-hidden flex shadow-inner relative">
            {stats.total === 0 ? (
              <div className="w-full h-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                  Belum ada presensi
                </span>
              </div>
            ) : (
              <>
                {/* Hadir Tepat Waktu (Emerald) */}
                {stats.pctTepatWaktu > 0 && (
                  <div
                    style={{ width: `${stats.pctTepatWaktu}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 relative group"
                    title={`Hadir Tepat Waktu: ${stats.tepatWaktu} hari (${Math.round(stats.pctTepatWaktu)}%)`}
                  />
                )}
                {/* Hadir Terlambat (Amber) */}
                {stats.pctTerlambat > 0 && (
                  <div
                    style={{ width: `${stats.pctTerlambat}%` }}
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 relative group"
                    title={`Hadir Terlambat: ${stats.terlambat} hari (${Math.round(stats.pctTerlambat)}%)`}
                  />
                )}
                {/* Izin (Sky) */}
                {stats.pctIzin > 0 && (
                  <div
                    style={{ width: `${stats.pctIzin}%` }}
                    className="h-full bg-sky-400 transition-all duration-500 relative group"
                    title={`Izin: ${stats.izin} hari (${Math.round(stats.pctIzin)}%)`}
                  />
                )}
                {/* Sakit (Purple) */}
                {stats.pctSakit > 0 && (
                  <div
                    style={{ width: `${stats.pctSakit}%` }}
                    className="h-full bg-purple-400 transition-all duration-500 relative group"
                    title={`Sakit: ${stats.sakit} hari (${Math.round(stats.pctSakit)}%)`}
                  />
                )}
                {/* Alpa (Rose) */}
                {stats.pctAlpa > 0 && (
                  <div
                    style={{ width: `${stats.pctAlpa}%` }}
                    className="h-full bg-rose-500 transition-all duration-500 relative group"
                    title={`Alpa: ${stats.alpa} hari (${Math.round(stats.pctAlpa)}%)`}
                  />
                )}
              </>
            )}
          </div>

          {/* School Target Minimal Marker (85%) */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center z-10"
            style={{ left: `${TARGET_MINIMAL_SEKOLAH}%` }}
            title="Target Batas Minimal Kelulusan (85%)"
          >
            <div className="w-0.5 h-full bg-slate-900/70 dark:bg-white/80 shadow-xs" />
          </div>
        </div>

        {/* Legend Indicators Under the Progress Bar */}
        <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Tepat: <strong className="text-slate-800 dark:text-slate-200">{stats.tepatWaktu}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
            <span>Terlambat: <strong className="text-slate-800 dark:text-slate-200">{stats.terlambat}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0" />
            <span>Izin: <strong className="text-slate-800 dark:text-slate-200">{stats.izin}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
            <span>Sakit: <strong className="text-slate-800 dark:text-slate-200">{stats.sakit}</strong></span>
          </div>

          {stats.alpa > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span>Alpa: <strong className="text-rose-600 dark:text-rose-400">{stats.alpa}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
            <span className="w-1.5 h-3 bg-slate-700 dark:bg-white inline-block rounded-xs" />
            <span>Garis Target 85%</span>
          </div>
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Total Hadir */}
        <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Total Hadir
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100 mt-1">
            {stats.hadir} <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">hari</span>
          </div>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
            {stats.tepatWaktu} tepat • {stats.terlambat} telat
          </p>
        </div>

        {/* Ketepatan Waktu */}
        <div className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
              Ketepatan Shift
            </span>
            <Clock4 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-lg font-bold text-sky-900 dark:text-sky-100 mt-1">
            {stats.rateTepatWaktu}%
          </div>
          <p className="text-[10px] text-sky-700/80 dark:text-sky-400/80 mt-0.5">
            Rasio on-time saat hadir
          </p>
        </div>

        {/* Izin & Sakit */}
        <div className="p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/40">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
              Izin & Sakit
            </span>
            <CalendarCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-900 dark:text-purple-100 mt-1">
            {stats.izin + stats.sakit} <span className="text-xs font-normal text-purple-700 dark:text-purple-400">hari</span>
          </div>
          <p className="text-[10px] text-purple-700/80 dark:text-purple-400/80 mt-0.5">
            {stats.izin} Izin • {stats.sakit} Sakit
          </p>
        </div>

        {/* Alpa / Tanpa Keterangan */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tanpa Keterangan
            </span>
            <AlertTriangle className={`w-3.5 h-3.5 ${stats.alpa > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
          </div>
          <div className={`text-lg font-bold mt-1 ${stats.alpa > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
            {stats.alpa} <span className="text-xs font-normal text-slate-500">hari</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.alpa === 0 ? 'Disiplin nihil alpa' : 'Perlu tindak lanjut'}
          </p>
        </div>
      </div>

      {/* Motivational / Evaluative Feedback Note */}
      <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/70 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-sky-900 dark:text-sky-200">Catatan Kedisiplinan: </span>
          {stats.feedbackNote}
        </div>
      </div>
    </div>
  );
};
