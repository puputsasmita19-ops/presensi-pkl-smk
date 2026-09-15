import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Role } from '../types';
import {
  Camera,
  BookOpen,
  MapPin,
  CheckCircle2,
  WifiOff,
  Cloud,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Building2,
  GraduationCap,
  Bell,
  Clock,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Award,
  BarChart3,
  Database,
  FileText,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';

interface RoleWalkthroughGuideProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onNavigateTab?: (tab: string) => void;
}

interface StepItem {
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  description: string;
  highlights: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    text: string;
  }[];
  actionHint?: string;
  targetTab?: string;
}

export const RoleWalkthroughGuide: React.FC<RoleWalkthroughGuideProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigateTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Reset step index when opened or role changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen, currentUser.role]);

  const getStepsForRole = (role: Role): StepItem[] => {
    switch (role) {
      case 'Siswa':
        return [
          {
            title: 'Selamat Datang di Portal Presensi & Jurnal PKL',
            badge: 'Langkah 1: Pengenalan Siswa',
            icon: GraduationCap,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
            description:
              'Aplikasi ini dirancang khusus untuk mempermudah kegiatan Praktik Kerja Lapangan (PKL) Anda, mulai dari pencatatan kehadiran mandiri, pengisian jurnal harian, hingga laporan ke orang tua.',
            highlights: [
              {
                icon: Building2,
                title: 'Informasi Penempatan & Shift Kerja',
                text: 'Ketahui lokasi instansi DUDI, jam masuk, jam pulang, serta batas waktu toleransi shift Anda.',
              },
              {
                icon: Bell,
                title: 'Notifikasi & Pengingat Cerdas',
                text: 'Dapatkan hitungan mundur dan nada pengingat agar selalu presensi tepat waktu sebelum jam masuk berakhir.',
              },
            ],
            actionHint: 'Klik Lanjut untuk melihat cara melakukan presensi mandiri.',
          },
          {
            title: 'Presensi Mandiri Cerdas (Kamera & GPS)',
            badge: 'Langkah 2: Presensi Kehadiran',
            icon: Camera,
            iconColor: 'text-sky-500',
            iconBg: 'bg-sky-100 dark:bg-sky-950/60',
            description:
              'Lakukan absensi masuk dan pulang langsung dari perangkat Anda dengan verifikasi titik lokasi GPS dan foto selfie realtime.',
            highlights: [
              {
                icon: MapPin,
                title: 'Geofencing Radius Kantor',
                text: 'GPS otomatis mendeteksi jarak Anda dari kantor DUDI. Pastikan Anda berada dalam radius yang ditentukan.',
              },
              {
                icon: Camera,
                title: 'Selfie Realtime & Watermark',
                text: 'Ambil foto selfie di lokasi kerja. Sistem akan menyematkan watermark waktu, koordinat, dan status.',
              },
              {
                icon: MessageSquare,
                title: 'Laporan Otomatis ke Orang Tua',
                text: 'Presensi yang Anda submit otomatis diteruskan melalui WhatsApp Gateway ke nomor orang tua/wali.',
              },
            ],
            actionHint: 'Buka menu Presensi Mandiri untuk melakukan absensi harian.',
            targetTab: 'presensi',
          },
          {
            title: 'Mode Offline & Sinkronisasi Cloud Otomatis',
            badge: 'Langkah 3: Keandalan Tanpa Internet',
            icon: WifiOff,
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-100 dark:bg-amber-950/60',
            description:
              'Tidak perlu khawatir jika sinyal internet di lokasi industri sedang tidak stabil atau padam.',
            highlights: [
              {
                icon: Database,
                title: 'Penyimpanan Aman di Perangkat',
                text: 'Presensi offline tetap tersimpan rapi di memori lokal terenkripsi (IndexedDB).',
              },
              {
                icon: Cloud,
                title: 'Auto-Sync saat Online',
                text: 'Begitu internet kembali tersambung, sistem otomatis mengunggah data presensi & foto ke Firebase Firestore dan Google Drive.',
              },
            ],
            actionHint: 'Indikator offline/online selalu tampil di pojok kanan atas aplikasi.',
          },
          {
            title: 'Pengisian Jurnal Harian & Bukti Pekerjaan',
            badge: 'Langkah 4: Laporan Aktivitas',
            icon: BookOpen,
            iconColor: 'text-purple-500',
            iconBg: 'bg-purple-100 dark:bg-purple-950/60',
            description:
              'Catat seluruh aktivitas, tugas, dan kompetensi yang Anda pelajari setiap hari selama masa magang.',
            highlights: [
              {
                icon: FileText,
                title: 'Deskripsi Tugas Harian',
                text: 'Tuliskan ringkasan tugas dan kendala yang Anda hadapi secara jelas dan terstruktur.',
              },
              {
                icon: Camera,
                title: 'Upload Foto Dokumentasi',
                text: 'Sertakan foto bukti kegiatan untuk memperkuat laporan jurnal Anda.',
              },
              {
                icon: CheckCircle2,
                title: 'Persetujuan Guru & DUDI',
                text: 'Pantau status verifikasi dan masukan dari Guru Pembimbing serta Pembina DUDI secara realtime.',
              },
            ],
            actionHint: 'Buka tab Jurnal Harian untuk mencatat kegiatan hari ini.',
            targetTab: 'jurnal',
          },
          {
            title: 'Riwayat, Statistik & Rekap Kehadiran',
            badge: 'Langkah 5: Pantau Disiplin Anda',
            icon: BarChart3,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
            description:
              'Pantau persentase kehadiran Anda secara mandiri untuk memastikan memenuhi standar kelulusan PKL.',
            highlights: [
              {
                icon: Award,
                title: 'Target Minimal Kehadiran 85%',
                text: 'Pastikan rasio kehadiran Anda selalu berada di atas ambang batas standar sekolah.',
              },
              {
                icon: SlidersHorizontal,
                title: 'Filter Pencarian Riwayat',
                text: 'Gunakan fitur filter tanggal, status hadir, dan shift pada riwayat presensi.',
              },
            ],
            actionHint: 'Selamat beraktivitas! Semoga pelaksanaan PKL berjalan sukses dan lancar.',
          },
        ];

      case 'Guru Pembimbing':
        return [
          {
            title: 'Selamat Datang Bapak/Ibu Guru Pembimbing',
            badge: 'Langkah 1: Portal Supervisi Guru',
            icon: UserCheck,
            iconColor: 'text-sky-500',
            iconBg: 'bg-sky-100 dark:bg-sky-950/60',
            description:
              'Portal ini dirancang untuk memudahkan Anda memantau kedisiplinan, mengevaluasi jurnal harian, dan mencatat kunjungan monitoring ke industri mitra.',
            highlights: [
              {
                icon: GraduationCap,
                title: 'Daftar Siswa Bimbingan',
                text: 'Pantau seluruh siswa asuhan Anda di berbagai tempat industri dalam satu layar terpusat.',
              },
              {
                icon: BarChart3,
                title: 'Monitoring Kehadiran Realtime',
                text: 'Lihat jam masuk, foto selfie, status ketepatan waktu, dan deteksi dini siswa yang membutuhkan perhatian.',
              },
            ],
            actionHint: 'Klik Lanjut untuk melihat fitur verifikasi jurnal siswa.',
          },
          {
            title: 'Verifikasi & Masukan Jurnal Siswa',
            badge: 'Langkah 2: Evaluasi Aktivitas',
            icon: BookOpen,
            iconColor: 'text-purple-500',
            iconBg: 'bg-purple-100 dark:bg-purple-950/60',
            description:
              'Periksa laporan tugas harian siswa secara berkala dan berikan catatan bimbingan yang membangun.',
            highlights: [
              {
                icon: FileText,
                title: 'Tinjau Rincian Tugas & Dokumentasi',
                text: 'Periksa kesesuaian kompetensi dan foto dokumentasi kegiatan yang diunggah siswa.',
              },
              {
                icon: CheckCircle2,
                title: 'Persetujuan Satu Klik & Komentar',
                text: 'Klik tombol Setujui dan berikan catatan evaluasi atau instruksi perbaikan kepada siswa.',
              },
            ],
            actionHint: 'Buka menu Persetujuan Jurnal Siswa untuk mulai memverifikasi.',
            targetTab: 'jurnal',
          },
          {
            title: 'Presensi Kunjungan Supervisi ke DUDI',
            badge: 'Langkah 3: Monitoring Lapangan',
            icon: MapPin,
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-100 dark:bg-amber-950/60',
            description:
              'Catat agenda supervisi monitoring Anda saat berkunjung langsung ke kantor/workshop mitra industri.',
            highlights: [
              {
                icon: MapPin,
                title: 'Geotagging Lokasi Kunjungan',
                text: 'Sistem mencatat koordinat GPS dan memvalidasi jarak ke titik lokasi DUDI.',
              },
              {
                icon: Camera,
                title: 'Foto Monitoring Bersama DUDI',
                text: 'Unggah foto kunjungan bersama perwakilan industri dan siswa bimbingan sebagai bukti supervisi resmi.',
              },
            ],
            actionHint: 'Buka menu Presensi Kunjungan DUDI saat melakukan kunjungan monitoring.',
            targetTab: 'presensi',
          },
          {
            title: 'Monitoring Bimbingan & Rekap Laporan',
            badge: 'Langkah 4: Rekapitulasi & Nilai',
            icon: FileText,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
            description:
              'Akses rekapitulasi data kehadiran dan jurnal bimbingan untuk kebutuhan pelaporan sekolah dan pencetakan nilai akhir PKL.',
            highlights: [
              {
                icon: FileText,
                title: 'Cetak Laporan Rekap',
                text: 'Filter rekap kehadiran per siswa atau per periode dan unduh lembar penilaian resmi.',
              },
              {
                icon: ShieldCheck,
                title: 'Log Aktivitas Supervisi',
                text: 'Semua riwayat persetujuan jurnal dan presensi kunjungan Anda tercatat aman dalam log sistem.',
              },
            ],
            actionHint: 'Selamat menjalankan tugas bimbingan dan supervisi siswa PKL!',
            targetTab: 'laporan',
          },
        ];

      case 'DUDI':
        return [
          {
            title: 'Selamat Datang Bapak/Ibu Pembina Industri (DUDI)',
            badge: 'Langkah 1: Portal Mitra Industri',
            icon: Building2,
            iconColor: 'text-indigo-500',
            iconBg: 'bg-indigo-100 dark:bg-indigo-950/60',
            description:
              'Portal ini mempermudah pihak Dunia Usaha / Dunia Industri (DUDI) dalam mengawasi kedisiplinan dan capaian kerja siswa PKL yang magang di tempat Anda.',
            highlights: [
              {
                icon: Clock,
                title: 'Pengaturan Jam Shift Kerja',
                text: 'Informasi shift masuk, toleransi keterlambatan, dan hari operasional industri Anda telah tersinkronisasi.',
              },
              {
                icon: UserCheck,
                title: 'Persetujuan Presensi Siswa',
                text: 'Konfirmasi dan tinjau bukti foto selfie presensi masuk & pulang siswa magang Anda.',
              },
            ],
            actionHint: 'Klik Lanjut untuk melihat cara persetujuan presensi siswa.',
          },
          {
            title: 'Persetujuan & Verifikasi Presensi Siswa',
            badge: 'Langkah 2: Verifikasi Kehadiran',
            icon: UserCheck,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
            description:
              'Tinjau presensi harian siswa yang ditempatkan di industri Anda dengan transparansi foto dan koordinat.',
            highlights: [
              {
                icon: Camera,
                title: 'Foto Selfie & Jarak GPS',
                text: 'Lihat foto selfie siswa saat tiba di kantor dan pastikan absensi dilakukan dalam radius industri.',
              },
              {
                icon: CheckCircle2,
                title: 'Status Hadir, Izin, atau Sakit',
                text: 'Berikan konfirmasi persetujuan kehadiran atau beri catatan jika terdapat ketidaksesuaian.',
              },
            ],
            actionHint: 'Buka menu Persetujuan Presensi Siswa untuk memvalidasi.',
            targetTab: 'presensi',
          },
          {
            title: 'Validasi & Penilaian Jurnal Pekerjaan',
            badge: 'Langkah 3: Pengawasan Kinerja',
            icon: BookOpen,
            iconColor: 'text-purple-500',
            iconBg: 'bg-purple-100 dark:bg-purple-950/60',
            description:
              'Evaluasi catatan tugas dan hasil pekerjaan harian yang telah diselesaikan oleh siswa magang.',
            highlights: [
              {
                icon: FileText,
                title: 'Tinjau Hasil Pekerjaan',
                text: 'Periksa deskripsi tugas dan foto bukti hasil pekerjaan siswa selama jam kerja.',
              },
              {
                icon: CheckCircle2,
                title: 'Validasi Instruktur',
                text: 'Klik Setujui untuk memvalidasi bahwa tugas tersebut benar-benar telah diselesaikan dengan baik di industri Anda.',
              },
            ],
            actionHint: 'Buka menu Persetujuan Jurnal Siswa untuk meninjau laporan kerja.',
            targetTab: 'jurnal',
          },
          {
            title: 'Profil Industri & Laporan Kehadiran',
            badge: 'Langkah 4: Rekap & Shift',
            icon: Building2,
            iconColor: 'text-sky-500',
            iconBg: 'bg-sky-100 dark:bg-sky-950/60',
            description:
              'Akses profil industri, jadwal shift, serta laporan presensi siswa untuk arsip dan komunikasi dengan pihak sekolah.',
            highlights: [
              {
                icon: FileText,
                title: 'Laporan Presensi DUDI',
                text: 'Lihat rekapitulasi kehadiran seluruh siswa magang di instansi Anda per bulan.',
              },
              {
                icon: Building2,
                title: 'Info Shift & Jam Kerja',
                text: 'Tinjau konfigurasi jam operasional dan kontak pembina industri.',
              },
            ],
            actionHint: 'Terima kasih atas kerja sama dan kontribusi industri Anda dalam membina siswa PKL!',
            targetTab: 'info-dudi',
          },
        ];

      case 'Admin':
      default:
        return [
          {
            title: 'Selamat Datang di Portal Administrator PKL',
            badge: 'Langkah 1: Pusat Kontrol Admin',
            icon: ShieldCheck,
            iconColor: 'text-amber-500',
            iconBg: 'bg-amber-100 dark:bg-amber-950/60',
            description:
              'Sebagai Administrator, Anda memiliki akses penuh untuk mengelola master data, memantau analitik kehadiran, mengelola database cloud, dan mengonfigurasi integrasi.',
            highlights: [
              {
                icon: BarChart3,
                title: 'Dashboard Analitik Recharts 7 Hari',
                text: 'Pantau kurva tren kehadiran seluruh siswa selama satu minggu terakhir dengan grafik visual interaktif.',
              },
              {
                icon: Database,
                title: 'Master Data Siswa, DUDI & Guru',
                text: 'Kelola penempatan magang, impor/ekspor data Excel, dan manajemen akun pengguna.',
              },
            ],
            actionHint: 'Klik Lanjut untuk melihat fitur analitik dan manajemen sistem.',
          },
          {
            title: 'Grafik Tren Kehadiran Recharts & Statistik',
            badge: 'Langkah 2: Analitik Kehadiran',
            icon: BarChart3,
            iconColor: 'text-sky-500',
            iconBg: 'bg-sky-100 dark:bg-sky-950/60',
            description:
              'Analisis performa kedisiplinan siswa secara menyeluruh menggunakan chart visual Recharts.',
            highlights: [
              {
                icon: BarChart3,
                title: 'Grafik Batang & Area Tren 7 Hari',
                text: 'Lihat distribusi Hadir Tepat Waktu, Terlambat, Izin, Sakit, dan Alpa per hari secara mendetail.',
              },
              {
                icon: Award,
                title: 'Benchmark Target Sekolah 85%',
                text: 'Garis batas target minimal memudahkan identifikasi tren penurunan kedisiplinan lebih dini.',
              },
            ],
            actionHint: 'Grafik tren mingguan dapat dilihat langsung di halaman Dashboard Admin.',
            targetTab: 'presensi',
          },
          {
            title: 'Integrasi Cloud (Firebase, Drive & WhatsApp)',
            badge: 'Langkah 3: Infrastruktur & Notifikasi',
            icon: Cloud,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
            description:
              'Sistem terintegrasi secara otomatis dengan Firebase Firestore, Google Drive API, dan WhatsApp Gateway Fonnte.',
            highlights: [
              {
                icon: Database,
                title: 'Firebase Firestore Realtime',
                text: 'Database cloud menyimpan seluruh riwayat presensi, jurnal, master data, dan log aktivitas.',
              },
              {
                icon: MessageSquare,
                title: 'Fonnte WhatsApp Broadcast',
                text: 'Pengiriman pesan WhatsApp otomatis ke orang tua saat siswa melakukan presensi.',
              },
            ],
            actionHint: 'Konfigurasi integrasi tersedia melalui tombol di Navbar atas.',
          },
        ];
    }
  };

  const steps = getStepsForRole(currentUser.role);
  const currentStep = steps[currentStepIndex] || steps[0];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    try {
      const storageKey = `pkl_walkthrough_completed_${currentUser.role}_${currentUser.id_user || currentUser.username}`;
      if (dontShowAgain) {
        localStorage.setItem(storageKey, 'true');
        localStorage.setItem(`pkl_walkthrough_completed_role_${currentUser.role}`, 'true');
      }
    } catch (e) {
      console.error(e);
    }

    if (currentStep.targetTab && onNavigateTab) {
      onNavigateTab(currentStep.targetTab);
    }
    onClose();
  };

  if (!isOpen) return null;

  const IconComponent = currentStep.icon;

  return (
    <div
      id="modal-role-walkthrough-guide"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Role Pill & Close Button */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Panduan Peran: {currentUser.role}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {currentStepIndex + 1} / {steps.length}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                Panduan Singkat Sistem PKL
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="Tutup Panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Step Header */}
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl ${currentStep.iconBg} ${currentStep.iconColor} flex items-center justify-center shrink-0 shadow-xs`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    {currentStep.badge}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {currentStep.title}
                  </h2>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
                {currentStep.description}
              </p>

              {/* Feature Highlights Grid */}
              <div className="space-y-2.5 pt-1">
                {currentStep.highlights.map((h, idx) => {
                  const HIcon = h.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3 transition"
                    >
                      <div className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700/80 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200/50 dark:border-slate-750">
                        <HIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {h.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          {h.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Hint Box */}
              {currentStep.actionHint && (
                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-[11px] flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>{currentStep.actionHint}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer & Navigation Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Don't show again toggle */}
            <label className="inline-flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded-md text-sky-600 border-slate-300 dark:border-slate-700 focus:ring-sky-500 cursor-pointer"
              />
              <span>Jangan tampilkan otomatis lagi</span>
            </label>

            {/* Step Indicators Dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-6 bg-sky-600 dark:bg-sky-400'
                      : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                  }`}
                  aria-label={`Lompat ke langkah ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
              >
                Lewati
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-sky-600 dark:hover:bg-sky-500 hover:bg-slate-800 transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <span>
                  {currentStepIndex === steps.length - 1 ? 'Selesai & Mulai' : 'Lanjut'}
                </span>
                {currentStepIndex === steps.length - 1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
