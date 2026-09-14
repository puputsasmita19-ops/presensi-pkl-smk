import React, { useMemo, useState, useRef } from 'react';
import {
  User,
  Siswa,
  DUDI,
  GuruPembimbing,
  Presensi,
  StatusPresensi,
} from '../types';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  Building2,
  GraduationCap,
  ShieldCheck,
  Camera,
  BookOpen,
  Eye,
  ChevronRight,
  TrendingUp,
  Award,
  Filter,
  UserCheck,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';

interface StatistikKehadiranSiswaProps {
  currentUser: User;
  siswaList: Siswa[];
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  presensiList: Presensi[];
  onNavigateTab?: (tab: string) => void;
  onSelectSiswaDetail?: (siswa: Siswa) => void;
  onSaveSiswa?: (siswa: Siswa) => void;
}

export const StatistikKehadiranSiswa: React.FC<StatistikKehadiranSiswaProps> = ({
  currentUser,
  siswaList,
  dudiList,
  guruList,
  presensiList,
  onNavigateTab,
  onSelectSiswaDetail,
  onSaveSiswa,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Photo upload handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSiswa || !onSaveSiswa) return;
    try {
      setIsUploadingPhoto(true);
      const res = await compressImageFile(file, undefined, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.82,
      });
      const updatedSiswa: Siswa = {
        ...currentSiswa,
        foto_profil: res.dataUrl,
      };
      onSaveSiswa(updatedSiswa);
    } catch (err) {
      console.error('Gagal mengganti foto profil siswa:', err);
      alert('Gagal memproses file foto. Pastikan format file gambar valid.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Identify current student profile
  const currentSiswa = useMemo(() => {
    return (
      siswaList.find(
        (s) =>
          s.id_siswa === currentUser.id_user ||
          s.nama_lengkap.toLowerCase() === currentUser.nama_lengkap.toLowerCase()
      ) || siswaList[0]
    );
  }, [siswaList, currentUser]);

  // Identify assigned DUDI
  const assignedDUDI = useMemo(() => {
    return dudiList.find((d) => d.id_dudi === currentSiswa?.id_dudi) || dudiList[0];
  }, [dudiList, currentSiswa?.id_dudi]);

  // Identify assigned Guru
  const assignedGuru = useMemo(() => {
    return (
      guruList.find((g) => g.id_guru === currentSiswa?.id_guru_pembimbing) ||
      guruList[0]
    );
  }, [guruList, currentSiswa?.id_guru_pembimbing]);

  // Student's personal attendance records
  const studentRecords = useMemo(() => {
    if (!currentSiswa) return [];
    return presensiList
      .filter((p) => p.id_siswa === currentSiswa.id_siswa)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  }, [presensiList, currentSiswa]);

  // Comprehensive statistics calculation
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

    const disetujuiDudi = studentRecords.filter(
      (p) => p.status_persetujuan_dudi === 'Disetujui'
    ).length;
    const menungguDudi = studentRecords.filter(
      (p) => !p.status_persetujuan_dudi || p.status_persetujuan_dudi === 'Menunggu'
    ).length;

    // Attendance rate
    const rateHadir = total > 0 ? Math.round((hadir / total) * 100) : 100;
    // Punctuality rate
    const rateTepatWaktu = hadir > 0 ? Math.round((tepatWaktu / hadir) * 100) : 100;

    // Percentages for bar
    const pctTepatWaktu = total > 0 ? (tepatWaktu / total) * 100 : 100;
    const pctTerlambat = total > 0 ? (terlambat / total) * 100 : 0;
    const pctIzin = total > 0 ? (izin / total) * 100 : 0;
    const pctSakit = total > 0 ? (sakit / total) * 100 : 0;
    const pctAlpa = total > 0 ? (alpa / total) * 100 : 0;

    // Target status
    const targetSekolah = 85; // 85% minimal kehadiran PKL
    const meetsTarget = rateHadir >= targetSekolah;

    let predikat = 'Sangat Baik';
    let predikatColor = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
    let ringColor = 'stroke-emerald-500';

    if (rateHadir >= 90) {
      predikat = 'Sangat Disiplin';
      predikatColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
      ringColor = 'stroke-emerald-500';
    } else if (rateHadir >= 80) {
      predikat = 'Disiplin Baik';
      predikatColor = 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800';
      ringColor = 'stroke-sky-500';
    } else if (rateHadir >= 70) {
      predikat = 'Cukup / Perlu Perhatian';
      predikatColor = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';
      ringColor = 'stroke-amber-500';
    } else {
      predikat = 'Peringatan Kedisiplinan';
      predikatColor = 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800';
      ringColor = 'stroke-rose-500';
    }

    return {
      total,
      hadir,
      izin,
      sakit,
      alpa,
      tepatWaktu,
      terlambat,
      disetujuiDudi,
      menungguDudi,
      rateHadir,
      rateTepatWaktu,
      pctTepatWaktu,
      pctTerlambat,
      pctIzin,
      pctSakit,
      pctAlpa,
      targetSekolah,
      meetsTarget,
      predikat,
      predikatColor,
      ringColor,
    };
  }, [studentRecords]);

  // Filtered attendance records
  const filteredRecords = useMemo(() => {
    if (filterStatus === 'semua') return studentRecords;
    if (filterStatus === 'tepat') return studentRecords.filter((r) => r.status_ketepatan === 'Tepat Waktu');
    if (filterStatus === 'terlambat') return studentRecords.filter((r) => r.status_ketepatan === 'Terlambat');
    return studentRecords.filter((r) => r.status.toLowerCase() === filterStatus.toLowerCase());
  }, [studentRecords, filterStatus]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12">
      {/* Header Banner Ringkasan Statistik */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0 shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ringkasan Statistik Kehadiran Siswa
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Data Real-time
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Akumulasi persentase kehadiran, ketepatan waktu shift kerja, dan rekam jejak kedisiplinan PKL Anda.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigateTab && (
            <>
              <button
                type="button"
                onClick={() => onNavigateTab('presensi')}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 transition active:scale-95 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Presensi Hari Ini</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('jurnal')}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-500" />
                <span>Jurnal PKL</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profil Siswa & Penempatan DUDI Card */}
      {currentSiswa && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative group shrink-0">
                <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold flex items-center justify-center text-base overflow-hidden relative shadow-2xs">
                  {currentSiswa.foto_profil ? (
                    <img
                      src={currentSiswa.foto_profil}
                      alt={currentSiswa.nama_lengkap}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    currentSiswa.nama_lengkap.charAt(0)
                  )}

                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center text-white">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {onSaveSiswa && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="input-upload-foto-siswa-dash"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md shadow-xs transition cursor-pointer"
                      title="Ganti Foto Profil"
                      aria-label="Ganti Foto Profil"
                    >
                      <Camera className="w-2.5 h-2.5" />
                    </button>
                  </>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{currentSiswa.nama_lengkap}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    NIS: {currentSiswa.nis}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentSiswa.kelas} • Kompetensi Keahlian: <strong>{currentSiswa.jurusan}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${stats.predikatColor}`}>
                <Award className="w-3.5 h-3.5" />
                <span>{stats.predikat}</span>
              </span>
              {onSelectSiswaDetail && (
                <button
                  type="button"
                  onClick={() => onSelectSiswaDetail(currentSiswa)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-500" />
                  <span>Detail Profil</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
                Mitra Industri / DUDI PKL:
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="truncate">{assignedDUDI?.nama_instansi || '-'}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {assignedDUDI?.bidang || 'Industri PKL'}
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
                Jam Kerja Standar Shift:
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {assignedDUDI?.jam_masuk_standar || '08:00'} - {assignedDUDI?.jam_pulang_standar || '16:30'} WIB
                </span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Radius Geofencing: {assignedDUDI?.radius_meter || 100} meter
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80 sm:col-span-2 lg:col-span-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-0.5">
                Guru Pembimbing Lapangan:
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">{assignedGuru?.nama_guru || 'Guru Pembimbing'}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Jadwal Supervisi: {assignedGuru?.jadwal_kunjungan || 'Rutin Berkala'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Kartu KPI Ringkasan Statistik Kehadiran */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Persentase Kehadiran */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tingkat Hadir
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {stats.rateHadir}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              ({stats.hadir}/{stats.total} hari)
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Target Sekolah: 85%</span>
            <span
              className={`font-bold ${
                stats.meetsTarget
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {stats.meetsTarget ? '✓ Lolos Target' : '⚠ Di Bawah Target'}
            </span>
          </div>
        </div>

        {/* KPI 2: Ketepatan Waktu */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tepat Waktu
            </span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {stats.rateTepatWaktu}%
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              ({stats.tepatWaktu} shift)
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Terlambat:</span>
            <span className={`font-bold ${stats.terlambat > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
              {stats.terlambat} Kali
            </span>
          </div>
        </div>

        {/* KPI 3: Izin & Sakit */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Izin & Sakit
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {stats.izin + stats.sakit}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Hari</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Izin: {stats.izin}</span>
            <span className="text-slate-500">Sakit: {stats.sakit}</span>
            <span className={`font-bold ${stats.alpa > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              Alpa: {stats.alpa}
            </span>
          </div>
        </div>

        {/* KPI 4: Persetujuan Pembimbing DUDI */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Persetujuan DUDI
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {stats.disetujuiDudi}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Tervalidasi</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Menunggu Review:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {stats.menungguDudi} data
            </span>
          </div>
        </div>
      </div>

      {/* Bar Progres Akumulasi Kehadiran & Status Kelulusan PKL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>Komposisi Kedisiplinan & Rasio Kehadiran</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribusi status kehadiran Anda selama masa Praktik Kerja Lapangan.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {stats.total} Total Rekor Presensi
            </span>
          </div>
        </div>

        {/* Stacked Visual Bar */}
        <div className="space-y-1.5">
          <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            {stats.total === 0 ? (
              <div className="w-full h-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-[9px] text-slate-500">
                Belum ada data presensi
              </div>
            ) : (
              <>
                {stats.pctTepatWaktu > 0 && (
                  <div
                    style={{ width: `${stats.pctTepatWaktu}%` }}
                    className="bg-emerald-500 hover:bg-emerald-600 transition-all"
                    title={`Tepat Waktu: ${stats.tepatWaktu} hari (${Math.round(stats.pctTepatWaktu)}%)`}
                  />
                )}
                {stats.pctTerlambat > 0 && (
                  <div
                    style={{ width: `${stats.pctTerlambat}%` }}
                    className="bg-amber-400 hover:bg-amber-500 transition-all"
                    title={`Terlambat: ${stats.terlambat} hari (${Math.round(stats.pctTerlambat)}%)`}
                  />
                )}
                {stats.pctIzin > 0 && (
                  <div
                    style={{ width: `${stats.pctIzin}%` }}
                    className="bg-sky-500 hover:bg-sky-600 transition-all"
                    title={`Izin: ${stats.izin} hari (${Math.round(stats.pctIzin)}%)`}
                  />
                )}
                {stats.pctSakit > 0 && (
                  <div
                    style={{ width: `${stats.pctSakit}%` }}
                    className="bg-purple-500 hover:bg-purple-600 transition-all"
                    title={`Sakit: ${stats.sakit} hari (${Math.round(stats.pctSakit)}%)`}
                  />
                )}
                {stats.pctAlpa > 0 && (
                  <div
                    style={{ width: `${stats.pctAlpa}%` }}
                    className="bg-rose-500 hover:bg-rose-600 transition-all"
                    title={`Alpa: ${stats.alpa} hari (${Math.round(stats.pctAlpa)}%)`}
                  />
                )}
              </>
            )}
          </div>

          {/* Legenda Detail */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Tepat Waktu:</span>
              <span className="font-mono text-slate-500">{stats.tepatWaktu} ({Math.round(stats.pctTepatWaktu)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Terlambat:</span>
              <span className="font-mono text-slate-500">{stats.terlambat} ({Math.round(stats.pctTerlambat)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Izin:</span>
              <span className="font-mono text-slate-500">{stats.izin} ({Math.round(stats.pctIzin)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Sakit:</span>
              <span className="font-mono text-slate-500">{stats.sakit} ({Math.round(stats.pctSakit)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-700 dark:text-slate-300 font-semibold">Alpa:</span>
              <span className="font-mono text-slate-500">{stats.alpa} ({Math.round(stats.pctAlpa)}%)</span>
            </span>
          </div>
        </div>

        {/* Syarat Kelulusan Evaluasi PKL */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/70 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-500" />
              <span>Kriteria Kelulusan Nilai Disiplin PKL</span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Siswa dinyatakan memenuhi syarat presensi jika kehadiran minimal 85% dan tidak memiliki akumulasi Alpa tanpa keterangan.
            </p>
          </div>
          <div className="shrink-0">
            {stats.meetsTarget && stats.alpa === 0 ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Memenuhi Syarat PKL</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-300 dark:border-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Perlu Ditingkatkan</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Catatan Presensi Siswa (Tabel & Log) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-500" />
              <span>Daftar Riwayat Presensi Saya ({filteredRecords.length})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rincian jam kedatangan, kepulangan, verifikasi geotagging, dan persetujuan DUDI.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'semua', label: 'Semua' },
              { id: 'tepat', label: 'Tepat Waktu' },
              { id: 'terlambat', label: 'Terlambat' },
              { id: 'izin', label: 'Izin' },
              { id: 'sakit', label: 'Sakit' },
            ].map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filterStatus === f.id
                    ? 'bg-slate-900 dark:bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Attendance Records List */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tidak ada data presensi dengan filter ini
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Lakukan presensi mandiri saat tiba di lokasi DUDI untuk mengisi logbook.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRecords.map((item) => {
              const isHadir = item.status === 'Hadir';
              const isTepatWaktu = isHadir && item.status_ketepatan === 'Tepat Waktu';

              return (
                <div
                  key={item.id_presensi}
                  className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/70 dark:border-slate-800/80 hover:border-sky-300 dark:hover:border-sky-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  {/* Left: Date & Status */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.status === 'Hadir'
                          ? isTepatWaktu
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : item.status === 'Izin'
                          ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                          : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      {item.status === 'Hadir' ? (
                        isTepatWaktu ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )
                      ) : (
                        item.status.charAt(0)
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.hari || 'Hari'}, {item.tanggal}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                            item.status === 'Hadir'
                              ? isTepatWaktu
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                          }`}
                        >
                          {item.status} {item.status_ketepatan ? `• ${item.status_ketepatan}` : ''}
                        </span>
                        {item.nama_shift && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                            {item.nama_shift}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>
                          Masuk: <strong>{item.jam_masuk || '-'} WIB</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Pulang: <strong>{item.jam_pulang || 'Belum Pulang'} {item.jam_pulang ? 'WIB' : ''}</strong>
                        </span>
                        {item.koordinat_absen && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">
                              Radius: {item.koordinat_absen.jarak_meter}m {item.koordinat_absen.dalam_radius ? '(Valid)' : '(Luar)'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: DUDI approval status & Photo */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border flex items-center gap-1 ${
                        item.status_persetujuan_dudi === 'Disetujui'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : item.status_persetujuan_dudi === 'Ditolak'
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {item.status_persetujuan_dudi === 'Disetujui' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>DUDI: {item.status_persetujuan_dudi || 'Menunggu'}</span>
                    </span>

                    {item.foto_selfie && (
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoPreview(item.foto_selfie)}
                        className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 hover:border-sky-500 cursor-pointer transition shrink-0"
                        title="Klik untuk melihat foto selfie presensi"
                      >
                        <img
                          src={item.foto_selfie}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Preview Foto Selfie */}
      {selectedPhotoPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-sky-500" />
                <span>Foto Selfie Bukti Kehadiran</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhotoPreview(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-950">
              <img
                src={selectedPhotoPreview}
                alt="Foto Selfie Bukti"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => setSelectedPhotoPreview(null)}
              className="w-full py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-sky-600 text-white"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
