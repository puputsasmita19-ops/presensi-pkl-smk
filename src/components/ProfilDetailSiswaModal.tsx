import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  Building2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Mail,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock4,
  Download,
  ExternalLink,
  Search,
  Filter,
  Eye,
  Sparkles,
  ChevronRight,
  Layers,
  MapPinned,
  Check,
  RotateCcw,
  CalendarDays,
} from 'lucide-react';
import { Siswa, DUDI, GuruPembimbing, Presensi } from '../types';
import { exportPresensiToPDF } from '../utils/pdfExport';
import { KalenderInteraktifPresensi } from './KalenderInteraktifPresensi';

interface ProfilDetailSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswa: Siswa | null;
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  presensiList: Presensi[];
  onOpenWhatsAppModal?: () => void;
}

export const ProfilDetailSiswaModal: React.FC<ProfilDetailSiswaModalProps> = ({
  isOpen,
  onClose,
  siswa,
  dudiList,
  guruList,
  presensiList,
  onOpenWhatsAppModal,
}) => {
  // Active Tab inside modal
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'kalender' | 'presensi' | 'dudi'>('ringkasan');
  const [presensiViewMode, setPresensiViewMode] = useState<'kalender' | 'tabel'>('kalender');

  // Filter state for individual attendance history
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchDate, setSearchDate] = useState<string>('');

  // Photo Lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    caption: string;
    subCaption?: string;
  } | null>(null);

  // Find assigned DUDI and Guru
  const assignedDUDI = useMemo(() => {
    if (!siswa) return null;
    return dudiList.find((d) => d.id_dudi === siswa.id_dudi) || null;
  }, [siswa, dudiList]);

  const assignedGuru = useMemo(() => {
    if (!siswa) return null;
    return guruList.find((g) => g.id_guru === siswa.id_guru_pembimbing) || null;
  }, [siswa, guruList]);

  // Student specific attendance records
  const studentPresensiList = useMemo(() => {
    if (!siswa) return [];
    return presensiList
      .filter((p) => p.id_siswa === siswa.id_siswa)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.jam_masuk.localeCompare(a.jam_masuk));
  }, [siswa, presensiList]);

  // Attendance metrics
  const metrics = useMemo(() => {
    const total = studentPresensiList.length;
    const hadir = studentPresensiList.filter((p) => p.status === 'Hadir').length;
    const izin = studentPresensiList.filter((p) => p.status === 'Izin').length;
    const sakit = studentPresensiList.filter((p) => p.status === 'Sakit').length;
    const alpa = studentPresensiList.filter((p) => p.status === 'Alpa').length;
    const tepatWaktu = studentPresensiList.filter(
      (p) => p.status === 'Hadir' && p.status_ketepatan === 'Tepat Waktu'
    ).length;
    const terlambat = studentPresensiList.filter(
      (p) => p.status === 'Hadir' && p.status_ketepatan === 'Terlambat'
    ).length;

    const rateHadir = total > 0 ? Math.round((hadir / total) * 100) : 0;

    return { total, hadir, izin, sakit, alpa, tepatWaktu, terlambat, rateHadir };
  }, [studentPresensiList]);

  // Filtered attendance records in the list
  const filteredRecords = useMemo(() => {
    return studentPresensiList.filter((p) => {
      if (filterStatus !== 'ALL' && p.status !== filterStatus) {
        return false;
      }
      if (searchDate && !p.tanggal.includes(searchDate)) {
        return false;
      }
      return true;
    });
  }, [studentPresensiList, filterStatus, searchDate]);

  // Latest selfie photo from student's attendance history
  const latestSelfie = useMemo(() => {
    const recordWithPhoto = studentPresensiList.find((p) => p.foto_selfie && p.foto_selfie.trim() !== '');
    return recordWithPhoto?.foto_selfie || null;
  }, [studentPresensiList]);

  // Student display photo (profile photo or latest selfie)
  const displayPhoto = siswa?.foto_profil || latestSelfie;

  if (!isOpen || !siswa) return null;

  // Handler to export PDF for this student
  const handleExportPDF = () => {
    exportPresensiToPDF({
      siswaList: [siswa],
      presensiList: studentPresensiList,
      dudiList,
      guruList,
      selectedSiswaId: siswa.id_siswa,
      schoolName: 'SMK NEGERI 1 INFORMATIKA & TEKNOLOGI',
    });
  };

  // Quick WhatsApp helpers
  const handleWhatsAppChat = (phoneNumber: string, message: string) => {
    let cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleWhatsAppOrtu = () => {
    const msg = `Yth. Orang Tua/Wali dari ${siswa.nama_lengkap} (Kelas ${siswa.kelas}),\n\nKami menginformasikan rekap kehadiran Praktik Kerja Lapangan (PKL) di ${assignedDUDI?.nama_instansi || 'DUDI'}:\n- Total Hari Tercatat: ${metrics.total}\n- Kehadiran: ${metrics.hadir} hari (${metrics.rateHadir}%)\n- Izin: ${metrics.izin} hari\n- Sakit: ${metrics.sakit} hari\n- Alpa: ${metrics.alpa} hari\n\nTerima kasih atas perhatian dan kerja samanya.\nSMK PKL Monitoring System`;
    handleWhatsAppChat(siswa.nomor_wa_ortu, msg);
  };

  const handleWhatsAppSiswa = () => {
    const msg = `Halo ${siswa.nama_lengkap},\n\nPengingat terkait kehadiran dan jurnal kegiatan PKL Anda di ${assignedDUDI?.nama_instansi || 'DUDI'}. Pastikan selalu melakukan presensi tepat waktu dan mengisi jurnal kegiatan harian.`;
    handleWhatsAppChat(siswa.nomor_wa, msg);
  };

  return (
    <div
      id="modal-profil-detail-siswa"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 lg:p-8 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transition-all">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold shadow-xs shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Detail Profil &amp; Rekap Siswa PKL
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  NIS: {siswa.nis}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Siswa Aktif PKL
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {siswa.nama_lengkap} &bull; {siswa.kelas} ({siswa.jurusan})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportPDF}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition cursor-pointer"
              title="Unduh Rekap Presensi Siswa format PDF"
            >
              <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Unduh PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HERO / IDENTITY BANNER - LEGA & LUAS */}
        <div className="px-6 py-6 bg-gradient-to-r from-slate-900 via-slate-850 to-sky-950 text-white relative overflow-hidden border-b border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            {/* Left: Avatar & Info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4.5 flex-1 min-w-0">
              {/* Student Photo */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/20 shadow-xl flex items-center justify-center">
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={siswa.nama_lengkap}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl">
                      {siswa.nama_lengkap.charAt(0)}
                    </div>
                  )}
                </div>
                {displayPhoto && (
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxPhoto({
                        url: displayPhoto,
                        caption: `Foto Profil: ${siswa.nama_lengkap}`,
                        subCaption: `${siswa.nis} • ${siswa.kelas}`,
                      })
                    }
                    className="absolute bottom-1 right-1 p-1.5 bg-slate-900/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1 shadow-md cursor-pointer"
                    title="Perbesar Foto"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Student Bio Info */}
              <div className="space-y-2.5 min-w-0 flex-1">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate">
                    {siswa.nama_lengkap}
                  </h2>
                </div>

                {/* Badges Info (Kelas, Jurusan, Email) */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-sky-200 border border-white/15 font-medium">
                    <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
                    <span>{siswa.kelas}</span>
                  </span>

                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/10 text-slate-200 border border-white/15 font-medium">
                    {siswa.jurusan}
                  </span>

                  {siswa.email && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 text-slate-300 border border-white/10 font-mono text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <span>{siswa.email}</span>
                    </span>
                  )}
                </div>

                {/* DUDI & Guru Pembimbing */}
                <div className="flex items-center gap-2.5 flex-wrap text-xs pt-0.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-200 border border-sky-400/30">
                    <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>DUDI: <strong>{assignedDUDI?.nama_instansi || 'Belum Ditempatkan'}</strong></span>
                  </span>
                  {assignedGuru && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 border border-white/10">
                      <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Pembimbing: <strong>{assignedGuru.nama_guru}</strong></span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Action Contacts */}
            <div className="flex sm:flex-row md:flex-col gap-2.5 shrink-0 w-full md:w-44 pt-2 md:pt-0">
              <button
                type="button"
                onClick={handleWhatsAppOrtu}
                className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm cursor-pointer active:scale-95"
                title="Kirim Pesan Notifikasi Rekap ke Orang Tua"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WA Ortu</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppSiswa}
                className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center justify-center gap-2 transition border border-slate-700 cursor-pointer active:scale-95"
                title="Kirim Pesan Langsung ke WhatsApp Siswa"
              >
                <Phone className="w-4 h-4" />
                <span>WA Siswa</span>
              </button>
            </div>
          </div>
        </div>

        {/* SPACIOUS NAVIGATION TABS */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 flex items-center gap-2 sm:gap-3 overflow-x-auto shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('ringkasan')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'ringkasan'
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <Clock className={`w-4 h-4 ${activeTab === 'ringkasan' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
            <span>Ringkasan Kehadiran &amp; Profil</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kalender')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'kalender'
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <CalendarDays className={`w-4 h-4 ${activeTab === 'kalender' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
            <span>Kalender Presensi Bulanan</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
              Visual
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presensi')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'presensi'
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <Calendar className={`w-4 h-4 ${activeTab === 'presensi' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
            <span>Histori Presensi</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'presensi' ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300'}`}>
              {studentPresensiList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dudi')}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === 'dudi'
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70 border border-transparent'
            }`}
          >
            <Building2 className={`w-4 h-4 ${activeTab === 'dudi' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
            <span>Tempat PKL &amp; Geofence</span>
          </button>
        </div>

        {/* TAB CONTENTS - SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/70 dark:bg-slate-950/50">
          {/* 1. TAB: RINGKASAN */}
          {activeTab === 'ringkasan' && (
            <div className="space-y-4">
              {/* STATS METRIC CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total Hari */}
                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Tercatat
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <strong className="text-2xl font-black text-slate-800 dark:text-slate-100">
                      {metrics.total}
                    </strong>
                    <span className="text-xs text-slate-500">hari</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Presensi harian</span>
                </div>

                {/* Hadir */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    Tingkat Kehadiran
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <strong className="text-2xl font-black text-emerald-900 dark:text-emerald-200">
                      {metrics.rateHadir}%
                    </strong>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                      ({metrics.hadir} hari)
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                    <span>Tepat: {metrics.tepatWaktu}</span>
                    <span>•</span>
                    <span>Telat: {metrics.terlambat}</span>
                  </div>
                </div>

                {/* Izin & Sakit */}
                <div className="bg-sky-50 dark:bg-sky-950/40 p-3.5 rounded-xl border border-sky-200/80 dark:border-sky-800/60 shadow-xs">
                  <span className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider block">
                    Izin & Sakit
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <div>
                      <strong className="text-2xl font-black text-sky-900 dark:text-sky-200">
                        {metrics.izin}
                      </strong>
                      <span className="text-[10px] text-sky-700 dark:text-sky-400 ml-1 font-semibold">Izin</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <div>
                      <strong className="text-2xl font-black text-purple-900 dark:text-purple-200">
                        {metrics.sakit}
                      </strong>
                      <span className="text-[10px] text-purple-700 dark:text-purple-400 ml-1 font-semibold">Sakit</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 mt-1 block">Dengan pemberitahuan</span>
                </div>

                {/* Alpa / Tanpa Keterangan */}
                <div className="bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-800/60 shadow-xs">
                  <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">
                    Alpa / Bolos
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <strong className="text-2xl font-black text-rose-900 dark:text-rose-200">
                      {metrics.alpa}
                    </strong>
                    <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold">hari</span>
                  </div>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 block">Tanpa konfirmasi</span>
                </div>
              </div>

              {/* TWO COLUMN SUMMARY: DATA PRIBADI & DATA PEMBIMBING */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Personal Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Informasi Data Diri Siswa</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Nama Lengkap</span>
                      <strong className="text-slate-800 dark:text-slate-200 text-right">{siswa.nama_lengkap}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Nomor Induk Siswa (NIS)</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{siswa.nis}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Kelas & Jurusan</span>
                      <strong className="text-slate-800 dark:text-slate-200">{siswa.kelas} - {siswa.jurusan}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">WhatsApp Siswa</span>
                      <button
                        type="button"
                        onClick={handleWhatsAppSiswa}
                        className="font-mono font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{siswa.nomor_wa}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">WhatsApp Orang Tua/Wali</span>
                      <button
                        type="button"
                        onClick={handleWhatsAppOrtu}
                        className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{siswa.nomor_wa_ortu}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                    {siswa.alamat && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400 shrink-0">Alamat Rumah</span>
                        <span className="text-slate-700 dark:text-slate-300 text-right line-clamp-2 max-w-[220px]">
                          {siswa.alamat}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Data Penempatan & Guru Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Data Penempatan & Pembimbing</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Tempat DUDI</span>
                      <strong className="text-slate-800 dark:text-slate-200 text-right">
                        {assignedDUDI?.nama_instansi || siswa.id_dudi}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Bidang Usaha</span>
                      <span className="text-slate-700 dark:text-slate-300 text-right">{assignedDUDI?.bidang || '-'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Sistem Shift Kerja</span>
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {assignedDUDI?.tipe_jadwal || 'Reguler'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Guru Pembimbing</span>
                      <strong className="text-slate-800 dark:text-slate-200 text-right">
                        {assignedGuru?.nama_guru || siswa.id_guru_pembimbing}
                      </strong>
                    </div>
                    {assignedGuru?.jadwal_kunjungan && (
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Jadwal Monitoring Guru</span>
                        <span className="text-slate-700 dark:text-slate-300 text-right font-medium">
                          {assignedGuru.jadwal_kunjungan}
                        </span>
                      </div>
                    )}
                    {assignedGuru?.nomor_wa && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Kontak WA Guru</span>
                        <button
                          type="button"
                          onClick={() => handleWhatsAppChat(assignedGuru.nomor_wa, `Halo Bapak/Ibu Guru ${assignedGuru.nama_guru}, saya ingin berkonsultasi mengenai progres PKL siswa ${siswa.nama_lengkap}.`)}
                          className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{assignedGuru.nomor_wa}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RECENT ATTENDANCE PREVIEW */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock4 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span>Riwayat Presensi Terakhir</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('kalender')}
                      className="px-2.5 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/60 flex items-center gap-1 cursor-pointer border border-sky-200 dark:border-sky-800 transition"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>Kalender Visual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('presensi')}
                      className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Semua ({studentPresensiList.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {studentPresensiList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Belum ada rekaman presensi untuk siswa ini.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {studentPresensiList.slice(0, 3).map((p) => (
                      <div key={p.id_presensi} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <strong className="text-slate-800 dark:text-slate-200">
                              {p.hari ? `${p.hari}, ` : ''}{p.tanggal}
                            </strong>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'Hadir'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                                  : p.status === 'Izin'
                                  ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300'
                                  : 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300'
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.nama_shift && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {p.nama_shift}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Masuk: <strong>{p.jam_masuk}</strong> | Pulang: <strong>{p.jam_pulang || '-'}</strong>
                            {p.koordinat_absen?.jarak_meter && ` • Radius: ${p.koordinat_absen.jarak_meter}m`}
                          </p>
                        </div>

                        {p.foto_selfie && (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxPhoto({
                                url: p.foto_selfie,
                                caption: `Presensi ${p.hari || ''} ${p.tanggal} - ${p.status}`,
                                subCaption: `Masuk: ${p.jam_masuk} • ${p.koordinat_absen?.jarak_meter || 0}m dari DUDI`,
                              })
                            }
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 hover:ring-2 hover:ring-sky-500 transition cursor-pointer"
                            title="Klik untuk melihat foto presensi"
                          >
                            <img
                              src={p.foto_selfie}
                              alt="Selfie"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: KALENDER INTERAKTIF PRESENSI BULANAN */}
          {activeTab === 'kalender' && (
            <div className="space-y-4">
              <KalenderInteraktifPresensi
                siswa={siswa}
                presensiList={studentPresensiList}
                onOpenLightbox={(url, caption, subCaption) =>
                  setLightboxPhoto({ url, caption, subCaption })
                }
              />
            </div>
          )}

          {/* 2. TAB: HISTORI PRESENSI LENGKAP */}
          {activeTab === 'presensi' && (
            <div className="space-y-3">
              {/* View Mode Switcher */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPresensiViewMode('kalender')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      presensiViewMode === 'kalender'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Tampilan Kalender 1 Bulan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresensiViewMode('tabel')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      presensiViewMode === 'tabel'
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tampilan Rekap Tabel ({studentPresensiList.length})</span>
                  </button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {presensiViewMode === 'kalender'
                    ? 'Menampilkan kalender bulanan interaktif'
                    : `Total: ${studentPresensiList.length} log presensi`}
                </div>
              </div>

              {presensiViewMode === 'kalender' ? (
                <KalenderInteraktifPresensi
                  siswa={siswa}
                  presensiList={studentPresensiList}
                  onOpenLightbox={(url, caption, subCaption) =>
                    setLightboxPhoto({ url, caption, subCaption })
                  }
                />
              ) : (
                <>
                  {/* Filter controls */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 shadow-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari tanggal (YYYY-MM)..."
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 w-44"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Alpa">Alpa</option>
                  </select>

                  {(filterStatus !== 'ALL' || searchDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterStatus('ALL');
                        setSearchDate('');
                      }}
                      className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Menampilkan <strong>{filteredRecords.length}</strong> dari {studentPresensiList.length} hari
                  </span>
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Hari & Tanggal</th>
                        <th className="p-3">Shift & Jadwal</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Jam Masuk / Pulang</th>
                        <th className="p-3">Radius GPS</th>
                        <th className="p-3">Foto Selfie</th>
                        <th className="p-3">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            Tidak ada data presensi yang sesuai kriteria filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((item) => (
                          <tr
                            key={item.id_presensi}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="p-3">
                              <strong className="text-slate-800 dark:text-slate-200 block">
                                {item.hari ? `${item.hari}, ` : ''}
                              </strong>
                              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                {item.tanggal}
                              </span>
                            </td>

                            <td className="p-3">
                              {item.nama_shift ? (
                                <div>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                                    {item.nama_shift}
                                  </span>
                                  {item.jadwal_masuk && (
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {item.jadwal_masuk} - {item.jadwal_pulang || '-'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">Reguler</span>
                              )}
                            </td>

                            <td className="p-3 space-y-0.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.status === 'Hadir'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : item.status === 'Izin'
                                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                    : 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                }`}
                              >
                                {item.status}
                              </span>
                              {item.status_ketepatan && (
                                <span
                                  className={`block text-[9px] font-bold ${
                                    item.status_ketepatan === 'Tepat Waktu'
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {item.status_ketepatan}
                                </span>
                              )}
                            </td>

                            <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                              <div>
                                <span className="text-slate-400 text-[10px]">In: </span>
                                <strong>{item.jam_masuk}</strong>
                              </div>
                              {item.jam_pulang && (
                                <div>
                                  <span className="text-slate-400 text-[10px]">Out: </span>
                                  <strong>{item.jam_pulang}</strong>
                                </div>
                              )}
                            </td>

                            <td className="p-3">
                              {item.koordinat_absen ? (
                                <div>
                                  <span
                                    className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      item.koordinat_absen.dalam_radius
                                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                                    }`}
                                  >
                                    {item.koordinat_absen.jarak_meter} m
                                  </span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    {item.koordinat_absen.dalam_radius ? 'Valid' : 'Luar Area'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>

                            <td className="p-3">
                              {item.foto_selfie ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxPhoto({
                                      url: item.foto_selfie,
                                      caption: `Foto Presensi ${item.tanggal} (${item.status})`,
                                      subCaption: `Masuk: ${item.jam_masuk} • Jarak: ${item.koordinat_absen?.jarak_meter || 0}m`,
                                    })
                                  }
                                  className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-sky-500 transition cursor-pointer"
                                  title="Lihat foto selfie"
                                >
                                  <img
                                    src={item.foto_selfie}
                                    alt="Foto"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </td>

                            <td className="p-3 max-w-[180px]">
                              <p className="text-slate-600 dark:text-slate-400 text-[11px] truncate">
                                {item.keterangan || '-'}
                              </p>
                              {item.notifikasi_wa_terkirim && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                                  ✓ WA Notif Sent
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

          {/* 3. TAB: DATA DUDI & GEOFENCE */}
          {activeTab === 'dudi' && assignedDUDI && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                      Industri Mitra Penempatan
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      {assignedDUDI.nama_instansi}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{assignedDUDI.bidang}</p>
                  </div>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${assignedDUDI.koordinat_lokasi.latitude},${assignedDUDI.koordinat_lokasi.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-sky-400 dark:bg-sky-600 dark:text-white hover:bg-slate-800 text-xs font-bold transition shadow-xs"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Lihat di Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex items-start gap-2">
                  <MapPinned className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 block">Alamat Kantor / Pabrik:</strong>
                    <p className="text-slate-600 dark:text-slate-400">{assignedDUDI.alamat}</p>
                  </div>
                </div>

                {/* Geofence Parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Koordinat Latitude</span>
                    <strong className="font-mono text-xs text-slate-800 dark:text-slate-200">
                      {assignedDUDI.koordinat_lokasi.latitude}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Koordinat Longitude</span>
                    <strong className="font-mono text-xs text-slate-800 dark:text-slate-200">
                      {assignedDUDI.koordinat_lokasi.longitude}
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block font-semibold">
                      Radius Toleransi Presensi
                    </span>
                    <strong className="font-mono text-sm text-emerald-900 dark:text-emerald-200">
                      {assignedDUDI.radius_meter} meter
                    </strong>
                  </div>
                </div>

                {/* Shifts and Schedule System */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      <span>Daftar Shift & Jam Kerja Aktif DUDI</span>
                    </h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      Sistem: {assignedDUDI.tipe_jadwal}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {assignedDUDI.daftar_shift && assignedDUDI.daftar_shift.length > 0 ? (
                      assignedDUDI.daftar_shift.map((s) => (
                        <div
                          key={s.id_shift}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                              {s.nama_shift}
                            </strong>
                            <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/80 px-2 py-0.5 rounded-md">
                              {s.jam_masuk} - {s.jam_pulang} WIB
                            </span>
                          </div>
                          {s.toleransi_keterlambatan_menit && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Toleransi Keterlambatan: <strong>{s.toleransi_keterlambatan_menit} menit</strong>
                            </p>
                          )}
                          {s.hari_khusus && s.hari_khusus.length > 0 && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300">
                              Khusus Hari: {s.hari_khusus.join(', ')}
                            </span>
                          )}
                          {s.keterangan && (
                            <p className="text-[10px] text-slate-400 italic">{s.keterangan}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                        Jam standar: {assignedDUDI.jam_masuk_standar} - {assignedDUDI.jam_pulang_standar} WIB
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span>ID Siswa: <strong className="font-mono text-slate-700 dark:text-slate-300">{siswa.id_siswa}</strong></span>
            <span>•</span>
            <span>ID User: <strong className="font-mono text-slate-700 dark:text-slate-300">{siswa.id_user}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Rekap PDF Siswa</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* PHOTO LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl p-3 space-y-2.5 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold">{lightboxPhoto.caption}</h4>
                {lightboxPhoto.subCaption && (
                  <p className="text-[10px] text-slate-400">{lightboxPhoto.subCaption}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-square w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption}
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Bukti Verifikasi Presensi Siswa</span>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="text-xs font-bold text-sky-400 hover:underline cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
