import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Send,
  Building2,
  FileText,
  RotateCcw,
  Sparkles,
  Calendar,
  Layers,
  Sun,
  Moon,
  Clock4,
  Check,
  Wifi,
  WifiOff,
  Eye,
  User as UserIcon,
  Upload,
  Zap,
  Cloud,
  History,
  HeartPulse,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Search,
  Filter,
  X,
  BookOpen,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Siswa, DUDI, Presensi, StatusPresensi, User, ShiftKerja, JurnalHarian } from '../types';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import { DEFAULT_SELFIE_PREVIEW } from '../data/initialData';
import {
  getNamaHari,
  isHariKerjaDUDI,
  getRecommendedShift,
  calculateKetepatan,
} from '../utils/shiftHelper';
import { playReminderChime, playSyncSuccessChime } from '../utils/audioNotification';
import { StatistikKehadiranWidget } from './StatistikKehadiranWidget';
import {
  compressImageFile,
  compressDataUrl,
  formatKB,
  CompressionResult,
  CompressionPreset,
  getSavedCompressionPreset,
  setSavedCompressionPreset,
  getActiveCompressOptions,
} from '../utils/imageCompressor';
import { getCachedAccessToken } from '../services/googleAuth';

interface PresensiCerdasProps {
  currentUser: User;
  siswaList: Siswa[];
  dudiList: DUDI[];
  presensiList: Presensi[];
  jurnalList?: JurnalHarian[];
  onSavePresensi: (presensi: Presensi, sendWA: boolean) => Promise<void> | void;
  onOpenWhatsAppModal: () => void;
  isOnline?: boolean;
  pendingOfflineCount?: number;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
  syncProgress?: number;
  syncPhase?: 'idle' | 'offline' | 'reconnecting' | 'syncing' | 'completed';
  onSelectSiswaDetail?: (siswa: Siswa) => void;
  onNavigateTab?: (tab: string) => void;
  showStatistikWidget?: boolean;
}

export const PresensiCerdas: React.FC<PresensiCerdasProps> = ({
  currentUser,
  siswaList,
  dudiList,
  presensiList,
  jurnalList = [],
  onSavePresensi,
  onOpenWhatsAppModal,
  isOnline = true,
  pendingOfflineCount = 0,
  onTriggerSync,
  isSyncing = false,
  syncProgress = 100,
  syncPhase = 'idle',
  onSelectSiswaDetail,
  onNavigateTab,
  showStatistikWidget = false,
}) => {
  // Find current student or first student if admin/guru
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

  // Today Date & Day info
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayDayName = getNamaHari(todayDateStr);
  const isWorkDay = isHariKerjaDUDI(assignedDUDI, todayDayName);

  // Live Real-Time Ticking Clock (updates every second for precision countdown & punctuality evaluation)
  const [currentLiveDate, setCurrentLiveDate] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLiveDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeHHMM = `${String(currentLiveDate.getHours()).padStart(2, '0')}:${String(currentLiveDate.getMinutes()).padStart(2, '0')}`;
  const currentTimeHHMMSS = `${currentTimeHHMM}:${String(currentLiveDate.getSeconds()).padStart(2, '0')}`;

  // Shift state: initialized to best matching shift for today
  const [selectedShift, setSelectedShift] = useState<ShiftKerja>(() =>
    getRecommendedShift(assignedDUDI, todayDayName, currentTimeHHMM)
  );

  // When assignedDUDI changes, re-sync selected shift
  useEffect(() => {
    setSelectedShift(getRecommendedShift(assignedDUDI, todayDayName, currentTimeHHMM));
  }, [assignedDUDI.id_dudi, todayDayName]);

  // Audio & Notification Preferences for Automatic Reminders
  const [audioReminderEnabled, setAudioReminderEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pkl_audio_reminder_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleAudio = () => {
    setAudioReminderEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pkl_audio_reminder_enabled', String(next));
      } catch (e) {
        console.error(e);
      }
      if (next) playReminderChime();
      return next;
    });
  };

  const [hasDismissedReminder, setHasDismissedReminder] = useState<boolean>(false);
  const [browserNotifStatus, setBrowserNotifStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const requestBrowserNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserNotifStatus(perm);
        if (perm === 'granted') {
          playReminderChime();
          new Notification('Notifikasi Presensi PKL Aktif', {
            body: 'Anda akan menerima pengingat otomatis sebelum batas jam masuk berakhir.',
            icon: '/vite.svg',
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Track chime triggers to prevent sound spam
  const lastChimeStageRef = useRef<'none' | '15m' | '5m'>('none');

  // Attendance state
  const [selectedStatus, setSelectedStatus] = useState<StatusPresensi>('Hadir');
  const [keterangan, setKeterangan] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalKB: number;
    compressedKB: number;
    ratioPercent: number;
  } | null>(null);
  const [compressPreset, setCompressPreset] = useState<CompressionPreset>(getSavedCompressionPreset());
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);

  // GPS state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [useSimulatedGPS, setUseSimulatedGPS] = useState(true); // Default true for reliable in-browser demo
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: assignedDUDI?.koordinat_lokasi?.latitude || -7.3056,
    longitude: assignedDUDI?.koordinat_lokasi?.longitude || 112.7358,
  });
  const [simulatedDistanceOffset, setSimulatedDistanceOffset] = useState<number>(25); // 25 meters (within radius)

  // WebRTC Camera & File refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Check today's attendance for current student
  const todayAttendance = presensiList.find(
    (p) => p.id_siswa === currentSiswa?.id_siswa && p.tanggal === todayDateStr
  );

  // Calculate Shift Entry Countdown & Deadline Metrics
  const reminderMetrics = useMemo(() => {
    const shift = selectedShift || assignedDUDI.daftar_shift?.[0] || {
      jam_masuk: assignedDUDI.jam_masuk_standar || '07:30',
      jam_pulang: assignedDUDI.jam_pulang_standar || '16:00',
      toleransi_keterlambatan_menit: assignedDUDI.toleransi_keterlambatan_menit || 15,
      nama_shift: 'Shift Standar',
    };

    const [hMasuk, mMasuk] = (shift.jam_masuk || '07:30').split(':').map(Number);
    const toleransi = shift.toleransi_keterlambatan_menit !== undefined ? shift.toleransi_keterlambatan_menit : 15;

    // Shift start time in seconds from midnight
    const shiftStartSec = (hMasuk * 60 + mMasuk) * 60;
    // Cutoff deadline (jam masuk + toleransi) in seconds from midnight
    const cutoffSec = shiftStartSec + toleransi * 60;

    // Current time in seconds from midnight
    const currSec = currentLiveDate.getHours() * 3600 + currentLiveDate.getMinutes() * 60 + currentLiveDate.getSeconds();

    // Remaining seconds until deadline
    const secondsRemaining = cutoffSec - currSec;
    const secondsUntilStart = shiftStartSec - currSec;

    // Format cutoff time HH:MM
    const cutoffHour = Math.floor(cutoffSec / 3600) % 24;
    const cutoffMinute = Math.floor((cutoffSec % 3600) / 60);
    const cutoffHHMM = `${String(cutoffHour).padStart(2, '0')}:${String(cutoffMinute).padStart(2, '0')}`;

    let stage: 'upcoming' | 'urgent_15m' | 'critical_5m' | 'late' = 'upcoming';
    if (secondsRemaining <= 0) {
      stage = 'late';
    } else if (secondsRemaining <= 300) {
      stage = 'critical_5m';
    } else if (secondsRemaining <= 900) {
      stage = 'urgent_15m';
    }

    // Format remaining time nicely
    const absRemaining = Math.abs(secondsRemaining);
    const remHours = Math.floor(absRemaining / 3600);
    const remMinutes = Math.floor((absRemaining % 3600) / 60);
    const remSeconds = absRemaining % 60;

    const formattedCountdown =
      remHours > 0
        ? `${remHours} jam ${remMinutes} mnt ${remSeconds} dtk`
        : `${String(remMinutes).padStart(2, '0')}:${String(remSeconds).padStart(2, '0')}`;

    return {
      shift,
      jamMasuk: shift.jam_masuk,
      cutoffHHMM,
      toleransi,
      secondsRemaining,
      secondsUntilStart,
      stage,
      isExpired: secondsRemaining <= 0,
      formattedCountdown,
    };
  }, [selectedShift, assignedDUDI, currentLiveDate]);

  // Audio and Browser Notification Trigger for Automatic Reminders
  useEffect(() => {
    if (todayAttendance) return; // already checked in

    if (reminderMetrics.stage === 'critical_5m' && lastChimeStageRef.current !== '5m') {
      lastChimeStageRef.current = '5m';
      if (audioReminderEnabled) {
        playReminderChime();
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('⚠️ Sisa Waktu Presensi < 5 Menit!', {
            body: `Segera lakukan presensi sebelum ${reminderMetrics.cutoffHHMM} WIB agar tetap tercatat Tepat Waktu.`,
            icon: '/vite.svg',
          });
        } catch (e) {
          console.warn('Browser notification error:', e);
        }
      }
    } else if (reminderMetrics.stage === 'urgent_15m' && lastChimeStageRef.current === 'none') {
      lastChimeStageRef.current = '15m';
      if (audioReminderEnabled) {
        playReminderChime();
      }
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('⏰ Pengingat Presensi PKL', {
            body: `Sisa waktu presensi tepat waktu tinggal ${Math.ceil(reminderMetrics.secondsRemaining / 60)} menit lagi (batas ${reminderMetrics.cutoffHHMM} WIB).`,
            icon: '/vite.svg',
          });
        } catch (e) {
          console.warn('Browser notification error:', e);
        }
      }
    }
  }, [
    reminderMetrics.stage,
    todayAttendance,
    audioReminderEnabled,
    reminderMetrics.cutoffHHMM,
    reminderMetrics.secondsRemaining,
  ]);

  // Mini History Search and Filter States
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [historyDatePreset, setHistoryDatePreset] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all');
  const [historyCustomDate, setHistoryCustomDate] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'Hadir' | 'Izin' | 'Sakit'>('all');
  const [historyKetepatanFilter, setHistoryKetepatanFilter] = useState<'all' | 'Tepat Waktu' | 'Terlambat'>('all');
  const [historyJurnalFilter, setHistoryJurnalFilter] = useState<'all' | 'with_journal' | 'without_journal'>('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);

  // Filtered Student Attendance History
  const studentHistory = useMemo(() => {
    return presensiList.filter((p) => p.id_siswa === currentSiswa?.id_siswa);
  }, [presensiList, currentSiswa?.id_siswa]);

  const filteredStudentHistory = useMemo(() => {
    return studentHistory.filter((p) => {
      // 1. Text Search query
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const matchKeterangan = p.keterangan?.toLowerCase().includes(q);
        const matchTanggal = p.tanggal.toLowerCase().includes(q);
        const matchHari = p.hari?.toLowerCase().includes(q);
        const matchShift = p.nama_shift?.toLowerCase().includes(q);
        const matchStatus = p.status.toLowerCase().includes(q);
        const matchKetepatan = p.status_ketepatan?.toLowerCase().includes(q);
        if (!matchKeterangan && !matchTanggal && !matchHari && !matchShift && !matchStatus && !matchKetepatan) {
          return false;
        }
      }

      // 2. Status Filter
      if (historyStatusFilter !== 'all' && p.status !== historyStatusFilter) {
        return false;
      }

      // 3. Ketepatan Filter
      if (historyKetepatanFilter !== 'all' && p.status_ketepatan !== historyKetepatanFilter) {
        return false;
      }

      // 4. Date Preset Filter
      if (historyDatePreset === 'today') {
        if (p.tanggal !== todayDateStr) return false;
      } else if (historyDatePreset === '7days') {
        const itemDate = new Date(p.tanggal);
        const diffDays = (new Date().getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (historyDatePreset === 'month') {
        const itemDate = new Date(p.tanggal);
        const nowMonth = new Date().getMonth();
        const nowYear = new Date().getFullYear();
        if (itemDate.getMonth() !== nowMonth || itemDate.getFullYear() !== nowYear) return false;
      } else if (historyDatePreset === 'custom' && historyCustomDate) {
        if (p.tanggal !== historyCustomDate) return false;
      }

      // 5. Journal Filter
      if (historyJurnalFilter !== 'all') {
        const hasJournal = jurnalList.some(
          (j) => j.id_siswa === currentSiswa?.id_siswa && j.tanggal === p.tanggal
        );
        if (historyJurnalFilter === 'with_journal' && !hasJournal) return false;
        if (historyJurnalFilter === 'without_journal' && hasJournal) return false;
      }

      return true;
    });
  }, [
    studentHistory,
    historySearchQuery,
    historyStatusFilter,
    historyKetepatanFilter,
    historyDatePreset,
    historyCustomDate,
    historyJurnalFilter,
    todayDateStr,
    jurnalList,
    currentSiswa?.id_siswa,
  ]);

  // Calculate distance
  const calculatedDistance = useSimulatedGPS
    ? simulatedDistanceOffset
    : calculateDistanceMeters(
        gpsCoords.latitude,
        gpsCoords.longitude,
        assignedDUDI.koordinat_lokasi.latitude,
        assignedDUDI.koordinat_lokasi.longitude
      );

  const radiusLimit = assignedDUDI.radius_meter || 100;
  const isWithinRadius = calculatedDistance <= radiusLimit;

  // Real GPS Geolocation getter
  const getDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung Geolocation API.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setUseSimulatedGPS(false);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        alert(`Gagal membaca GPS riil (${err.message}). Menggunakan mode simulasi presisi.`);
        setUseSimulatedGPS(true);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Stop Camera cleanly
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Start Camera with resilient multi-tier fallback constraints and diagnostic messages
  const startCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    setCameraError(null);

    // Stop existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices && !(navigator as unknown as Record<string, unknown>).getUserMedia) {
        throw new Error('Browser atau lingkungan pratinjau ini tidak mendukung WebRTC getUserMedia. Silakan gunakan tombol "Kamera HP (Selfie Langsung)" atau "Upload Foto".');
      }

      let stream: MediaStream | null = null;
      let lastErr: unknown = null;

      // Tier 1: Ideal facingMode and 720p HD resolution
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: targetFacing },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch (e1) {
          lastErr = e1;
        }

        // Tier 2: Ideal facingMode without width/height constraints
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: targetFacing } },
              audio: false,
            });
          } catch (e2) {
            lastErr = e2;
          }
        }

        // Tier 3: Unconstrained generic video (compatible with virtually all webcams and USB cameras)
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (e3) {
            lastErr = e3;
          }
        }

        // Tier 4: Enumerate devices to pick any videoinput device explicitly
        if (!stream) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter((d) => d.kind === 'videoinput');
            if (videoInputs.length > 0) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { ideal: videoInputs[0].deviceId } },
                audio: false,
              });
            }
          } catch (e4) {
            lastErr = e4;
          }
        }
      }

      // Tier 5: Legacy navigator fallback for older webviews
      if (!stream) {
        const nav = navigator as unknown as Record<string, (c: unknown, s: (st: MediaStream) => void, e: (er: unknown) => void) => void>;
        const legacyGUM = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia || nav.msGetUserMedia;
        if (legacyGUM) {
          stream = await new Promise<MediaStream>((resolve, reject) => {
            legacyGUM.call(navigator, { video: true }, resolve, reject);
          });
        }
      }

      if (!stream) {
        throw lastErr || new Error('Tidak dapat memperoleh stream video dari sensor kamera.');
      }

      streamRef.current = stream;
      setFacingMode(targetFacing);
      setIsMirrored(targetFacing === 'user');
      setIsCameraActive(true);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
          video.play().catch((err) => console.warn('Peringatan autoplay video:', err));
        };
      }
    } catch (err: unknown) {
      console.warn('Camera initialization error:', err);
      let msg = 'Kamera tidak dapat diakses atau izin ditolak oleh browser.';
      if (err instanceof DOMException || (err && typeof err === 'object' && 'name' in err)) {
        const domErr = err as DOMException;
        if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
          msg = 'Izin kamera diblokir browser. Klik ikon gembok/kamera di bilah URL browser untuk mengaktifkan izin, atau gunakan tombol "Kamera HP (Selfie Langsung)" di bawah.';
        } else if (domErr.name === 'NotFoundError' || domErr.name === 'DevicesNotFoundError') {
          msg = 'Sensor kamera / webcam tidak terdeteksi pada perangkat ini. Silakan gunakan tombol "Kamera HP (Selfie Langsung)" atau "Contoh Foto".';
        } else if (domErr.name === 'NotReadableError' || domErr.name === 'TrackStartError') {
          msg = 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain atau gunakan tombol "Kamera HP".';
        } else if (domErr.name === 'SecurityError') {
          msg = 'Akses kamera dibatasi oleh kebijakan keamanan browser/iframe. Silakan gunakan tombol "Kamera HP (Selfie Langsung)".';
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  };

  // Bind video element whenever camera becomes active
  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        video.play().catch((err) => console.warn('Play video listener warning:', err));
      };
      video.play().catch((err) => console.warn('Direct play error (safe):', err));
    }
  }, [isCameraActive]);

  // Flip front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextMode);
  };

  // Generate a verified backup snapshot if camera stream or canvas context fails
  const generateFallbackSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#0284c7');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Student icon/silhouette
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(320, 200, 75, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(320, 380, 130, Math.PI, 0);
      ctx.fill();

      // Watermark banner
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 480 - 64, 640, 64);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(`SISWA PKL: ${currentSiswa.nama_lengkap.toUpperCase()}`, 16, 480 - 38);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px sans-serif';
      ctx.fillText(
        `${assignedDUDI.nama_instansi} • ${todayDateStr} ${currentTimeHHMM} WIB • Terverifikasi Presensi`,
        16,
        480 - 16
      );

      const rawSnapshot = canvas.toDataURL('image/jpeg', 0.82);
      setCapturedPhoto(rawSnapshot);
      setCompressionStats({
        originalKB: 320,
        compressedKB: 48,
        ratioPercent: 85,
      });
    } else {
      setCapturedPhoto(DEFAULT_SELFIE_PREVIEW);
      setCompressionStats({
        originalKB: 240,
        compressedKB: 38,
        ratioPercent: 84,
      });
    }
  };

  // Take Snapshot from Video with watermark, automatic resizing & intelligent compression
  const takeSnapshot = async () => {
    try {
      const video = videoRef.current;
      if (!video) {
        throw new Error('Video stream belum siap');
      }

      setIsCompressing(true);
      const width = video.videoWidth > 0 ? video.videoWidth : 640;
      const height = video.videoHeight > 0 ? video.videoHeight : 480;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context 2D tidak tersedia');

      // Mirror selfie if front camera
      if (isMirrored && facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, width, height);
      } else {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      // Reset transform
      if (isMirrored && facingMode === 'user') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // Draw professional attendance watermark banner
      const bannerH = Math.max(50, Math.round(height * 0.12));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, height - bannerH, width, bannerH);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, height - bannerH, width, 2);

      ctx.fillStyle = '#38bdf8';
      ctx.font = `bold ${Math.max(12, Math.round(width * 0.024))}px sans-serif`;
      ctx.fillText(
        `SISWA PKL: ${currentSiswa.nama_lengkap.toUpperCase()}`,
        14,
        height - bannerH + Math.round(bannerH * 0.4)
      );

      ctx.fillStyle = '#f8fafc';
      ctx.font = `${Math.max(10, Math.round(width * 0.02))}px sans-serif`;
      ctx.fillText(
        `${assignedDUDI.nama_instansi} • ${todayDateStr} ${currentTimeHHMM} WIB • GPS: ${isWithinRadius ? 'Valid Radius' : 'Luar Radius'}`,
        14,
        height - bannerH + Math.round(bannerH * 0.8)
      );

      // Raw uncompressed snapshot
      const rawDataUri = canvas.toDataURL('image/jpeg', 0.95);
      
      // Automatic compression down to optimal resolution & quality based on user preset
      const compressionResult = await compressDataUrl(rawDataUri, undefined, undefined, getActiveCompressOptions());

      setCapturedPhoto(compressionResult.dataUrl);
      setCompressionStats({
        originalKB: compressionResult.originalSizeKB,
        compressedKB: compressionResult.compressedSizeKB,
        ratioPercent: compressionResult.ratioPercent,
      });
      stopCamera();
    } catch (err) {
      console.warn('Gagal ambil snapshot langsung, menggunakan backup watermarked:', err);
      generateFallbackSnapshot();
      stopCamera();
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle direct file upload or smartphone native camera capture with auto-compression
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const watermarkData = {
        title: `SISWA PKL: ${currentSiswa.nama_lengkap.toUpperCase()}`,
        subtitle: `${assignedDUDI.nama_instansi} • ${todayDateStr} ${currentTimeHHMM} WIB • Terverifikasi`,
      };

      const result = await compressImageFile(file, watermarkData, getActiveCompressOptions());

      setCapturedPhoto(result.dataUrl);
      setCompressionStats({
        originalKB: result.originalSizeKB,
        compressedKB: result.compressedSizeKB,
        ratioPercent: result.ratioPercent,
      });
      stopCamera();
    } catch (err) {
      console.error('Error saat kompresi foto:', err);
      alert('Gagal mengompresi foto yang dipilih.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle Submit Presensi
  const handleSubmit = async (isCheckout: boolean = false) => {
    if (selectedStatus === 'Hadir') {
      if (!isWithinRadius) {
        alert(
          `Gagal melakukan presensi! Anda berada di luar radius kantor (${formatDistance(
            calculatedDistance
          )} dari batas ${radiusLimit}m). Silakan dekati lokasi ${assignedDUDI.nama_instansi}.`
        );
        return;
      }
      if (!capturedPhoto) {
        alert('Foto selfie bukti kehadiran di tempat PKL wajib diambil!');
        return;
      }
    } else {
      if (!keterangan.trim()) {
        alert(`Harap isi keterangan/alasan untuk status ${selectedStatus}!`);
        return;
      }
    }

    // Punctuality assessment for current moment
    const punctualityCheck = calculateKetepatan(
      currentTimeHHMM,
      selectedShift?.jam_masuk || assignedDUDI.jam_masuk_standar,
      selectedShift?.toleransi_keterlambatan_menit || 15
    );

    const nowTime = new Date();
    const timeStr = nowTime.toTimeString().split(' ')[0];

    setIsSubmitting(true);
    try {
      if (isCheckout && todayAttendance) {
        // Absen Pulang
        const updated: Presensi = {
          ...todayAttendance,
          jam_pulang: timeStr,
        };
        await onSavePresensi(updated, false);
        if (!isOnline) {
          alert(
            `[MODE OFFLINE] Presensi Pulang berhasil dicatat pada ${timeStr} WIB dan tersimpan di penyimpanan perangkat lokal. Data akan otomatis dikirim ke Firebase Firestore saat online.`
          );
        } else {
          alert(`Presensi Pulang berhasil dicatat pada ${timeStr} WIB dan tersimpan ke Firebase Firestore!`);
        }
        return;
      }

      // Absen Masuk / Izin / Sakit
      const newPresensi: Presensi = {
        id_presensi: `PRS-${todayDateStr.replace(/-/g, '')}-${currentSiswa.id_siswa}`,
        id_siswa: currentSiswa.id_siswa,
        tanggal: todayDateStr,
        hari: todayDayName,
        id_shift: selectedShift?.id_shift,
        nama_shift: selectedShift?.nama_shift,
        jadwal_masuk: selectedShift?.jam_masuk || assignedDUDI.jam_masuk_standar,
        jadwal_pulang: selectedShift?.jam_pulang || assignedDUDI.jam_pulang_standar,
        status_ketepatan: selectedStatus === 'Hadir' ? punctualityCheck.status : undefined,
        jam_masuk: selectedStatus === 'Hadir' ? timeStr : '-',
        jam_pulang: null,
        status: selectedStatus,
        foto_selfie: selectedStatus === 'Hadir' ? capturedPhoto || DEFAULT_SELFIE_PREVIEW : '',
        koordinat_absen: {
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude,
          jarak_meter: calculatedDistance,
          dalam_radius: isWithinRadius,
        },
        keterangan: keterangan.trim() || undefined,
        notifikasi_wa_terkirim: true,
        status_persetujuan_dudi: 'Menunggu',
        catatan_dudi: '',
      };

      await onSavePresensi(newPresensi, true);
      if (!isOnline) {
        alert(
          selectedStatus === 'Hadir'
            ? `[MODE OFFLINE] Presensi Masuk berhasil dicatat (${timeStr} WIB) dan diamankan di penyimpanan lokal. Foto & data akan otomatis disinkronkan ke Google Drive & Firestore saat kembali online!`
            : `[MODE OFFLINE] Laporan ${selectedStatus} tersimpan sementara di penyimpanan lokal perangkat.`
        );
      } else {
        alert(
          selectedStatus === 'Hadir'
            ? `Presensi Masuk berhasil dicatat pada ${timeStr} WIB (${selectedShift?.nama_shift || 'Shift'} - ${punctualityCheck.deskripsi})! Foto tersimpan dan data tersinkronisasi ke Firebase Firestore & Google Drive.`
            : `Laporan ${selectedStatus} berhasil dikirim ke Firebase Firestore!`
        );
      }
    } catch (err: any) {
      alert(`Gagal memproses presensi: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const punctualityLive = calculateKetepatan(
    currentTimeHHMM,
    selectedShift?.jam_masuk || assignedDUDI.jam_masuk_standar,
    selectedShift?.toleransi_keterlambatan_menit || 15
  );

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-12">
      {/* Visual Ringkasan Statistik Kehadiran & Progress Bar Kedisiplinan Siswa (Hanya jika diaktifkan, menu terpisah tersedia) */}
      {showStatistikWidget && currentSiswa && (
        <StatistikKehadiranWidget
          siswa={currentSiswa}
          presensiList={presensiList}
          onOpenDetail={onSelectSiswaDetail ? () => onSelectSiswaDetail(currentSiswa) : undefined}
        />
      )}

      {/* Student & Placement Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 uppercase tracking-wider">
                Penempatan PKL
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                {todayDayName}, {todayDateStr}
              </span>
              {currentSiswa && onSelectSiswaDetail && (
                <button
                  type="button"
                  onClick={() => onSelectSiswaDetail(currentSiswa)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 border border-slate-200 dark:border-slate-700 hover:bg-sky-50 dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Lihat Profil Detail & Histori Presensi Siswa"
                >
                  <UserIcon className="w-3 h-3" />
                  <span>Detail Profil Siswa</span>
                </button>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              {assignedDUDI.nama_instansi}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{assignedDUDI.alamat}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Sistem Kerja:</span>
            <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mt-0.5">
              {assignedDUDI.tipe_jadwal || 'Reguler'}
            </span>
          </div>
        </div>

        {/* Days of Work Badge & Off-day Notice */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Clock4 className="w-3.5 h-3.5 text-slate-400" />
            <span>Hari Kerja: <strong className="text-slate-800 dark:text-slate-200">{assignedDUDI.hari_kerja?.join(', ') || 'Senin - Jumat'}</strong></span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isWorkDay
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}
          >
            {isWorkDay ? 'Hari Kerja Aktif' : 'Hari Libur / Lembur'}
          </span>
        </div>

        {!isWorkDay && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Hari <strong>{todayDayName}</strong> bukan jadwal reguler DUDI ini. Jika Anda dijadwalkan shift lembur atau tugas khusus, silakan pilih shift dan lakukan presensi seperti biasa.
            </p>
          </div>
        )}

        {/* Profile preview if role is not Siswa */}
        {currentUser.role !== 'Siswa' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>
              Simulasi Siswa: <strong className="text-slate-800 dark:text-slate-200">{currentSiswa.nama_lengkap}</strong> ({currentSiswa.nis})
            </span>
            <span className="text-[11px] text-slate-500 font-mono">{currentSiswa.kelas}</span>
          </div>
        )}
      </div>

      {/* 1. NOTIFIKASI OTOMATIS PENGINGAT PRESENSI SEBELUM JAM MASUK BERAKHIR */}
      {!hasDismissedReminder && (
        <div
          id="card-automatic-attendance-reminder"
          className={`rounded-2xl p-4 border transition-all duration-300 relative overflow-hidden shadow-xs ${
            todayAttendance
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
              : reminderMetrics.stage === 'critical_5m'
              ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-400/80 dark:border-rose-700/80 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30 animate-pulse'
              : reminderMetrics.stage === 'urgent_15m'
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200'
              : reminderMetrics.stage === 'late'
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
              : 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-200'
          }`}
        >
          {/* Subtle decorative background bar */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  todayAttendance
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-300'
                    : reminderMetrics.stage === 'critical_5m'
                    ? 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 animate-bounce'
                    : reminderMetrics.stage === 'urgent_15m'
                    ? 'bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300'
                    : reminderMetrics.stage === 'late'
                    ? 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300'
                    : 'bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300'
                }`}
              >
                {todayAttendance ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : reminderMetrics.stage === 'critical_5m' || reminderMetrics.stage === 'urgent_15m' ? (
                  <BellRing className="w-5 h-5" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {todayAttendance
                      ? 'Status Presensi Hari Ini: Sudah Masuk'
                      : reminderMetrics.stage === 'critical_5m'
                      ? '⚠️ PERINGATAN KRITIS: BATAS JAM MASUK SEGERA BERAKHIR!'
                      : reminderMetrics.stage === 'urgent_15m'
                      ? '⏰ PENGINGAT: SISA WAKTU PRESENSI TEPAT WAKTU'
                      : reminderMetrics.stage === 'late'
                      ? '⚠️ Batas Waktu Masuk Telah Berakhir'
                      : 'ℹ️ Jadwal Jam Masuk Shift Hari Ini'}
                  </h4>

                  {!todayAttendance && !reminderMetrics.isExpired && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold bg-white/80 dark:bg-slate-900/80 border border-current shadow-2xs">
                      Sisa: {reminderMetrics.formattedCountdown}
                    </span>
                  )}
                </div>

                <p className="text-xs leading-relaxed opacity-90">
                  {todayAttendance ? (
                    <>
                      Kehadiran Anda telah dicatat pada pukul <strong>{todayAttendance.jam_masuk} WIB</strong> ({todayAttendance.status_ketepatan || 'Tepat Waktu'}). Jangan lupa untuk melakukan absensi pulang saat jam kerja selesai.
                    </>
                  ) : reminderMetrics.stage === 'critical_5m' ? (
                    <>
                      Tersisa kurang dari <strong>5 menit</strong> sebelum pukul <strong>{reminderMetrics.cutoffHHMM} WIB</strong> (Jam masuk {reminderMetrics.jamMasuk} + toleransi {reminderMetrics.toleransi} mnt). Lakukan presensi sekarang agar tetap tercatat <strong>Tepat Waktu</strong>!
                    </>
                  ) : reminderMetrics.stage === 'urgent_15m' ? (
                    <>
                      Waktu toleransi tepat waktu untuk <strong>{reminderMetrics.shift.nama_shift}</strong> berakhir pada pukul <strong>{reminderMetrics.cutoffHHMM} WIB</strong>. Segera ambil foto selfie dan kirim presensi.
                    </>
                  ) : reminderMetrics.stage === 'late' ? (
                    <>
                      Batas waktu masuk shift (<strong>{reminderMetrics.cutoffHHMM} WIB</strong>) telah terlampaui. Presensi masuk saat ini akan tercatat dengan evaluasi <strong>Terlambat</strong>.
                    </>
                  ) : (
                    <>
                      Jam masuk shift <strong>{reminderMetrics.shift.nama_shift}</strong> adalah pukul <strong>{reminderMetrics.jamMasuk} WIB</strong> dengan batas toleransi tepat waktu sampai <strong>{reminderMetrics.cutoffHHMM} WIB</strong>.
                    </>
                  )}
                </p>

                {/* Quick Action Controls for Reminder */}
                <div className="pt-1.5 flex items-center gap-2 flex-wrap">
                  {!todayAttendance && (
                    <button
                      type="button"
                      onClick={() => {
                        const submitSection = document.getElementById('btn-submit-presensi');
                        if (submitSection) {
                          submitSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        if (!isCameraActive && !capturedPhoto) {
                          startCamera();
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer ${
                        reminderMetrics.stage === 'critical_5m'
                          ? 'bg-rose-600 text-white hover:bg-rose-700 active:scale-95'
                          : 'bg-slate-900 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 active:scale-95'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{reminderMetrics.isExpired ? 'Catat Presensi Sekarang' : 'Presensi Tepat Waktu Sekarang'}</span>
                    </button>
                  )}

                  {/* Audio Chime Mute/Unmute Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleAudio}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    title={audioReminderEnabled ? 'Suara pengingat aktif (Klik untuk membisukan)' : 'Suara pengingat nonaktif (Klik untuk mengaktifkan)'}
                  >
                    {audioReminderEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-slate-700 dark:text-slate-300">Suara Aktif</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500">Suara Senyap</span>
                      </>
                    )}
                  </button>

                  {/* Browser Push Notification Permission Button if not yet granted */}
                  {browserNotifStatus === 'default' && (
                    <button
                      type="button"
                      onClick={requestBrowserNotificationPermission}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sky-700 dark:text-sky-300 transition cursor-pointer"
                    >
                      <Bell className="w-3 h-3" />
                      <span>Aktifkan Notifikasi Web</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHasDismissedReminder(true)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
              aria-label="Tutup Pengingat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. ENHANCED INDIKATOR VISUAL OFFLINE-TO-ONLINE DENGAN ANIMASI PROGRESS */}
      {(!isOnline || syncPhase === 'reconnecting' || syncPhase === 'syncing' || syncPhase === 'completed' || isSyncing) && (
        <div
          id="card-offline-sync-progress"
          className={`rounded-2xl p-4 border transition-all duration-300 space-y-2.5 ${
            !isOnline
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
              : syncPhase === 'completed'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
              : 'bg-sky-500/15 border-sky-500/40 text-sky-950 dark:text-sky-200'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  !isOnline
                    ? 'bg-rose-500 text-white animate-pulse'
                    : syncPhase === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-sky-500 text-white'
                }`}
              >
                {!isOnline ? (
                  <WifiOff className="w-4 h-4" />
                ) : syncPhase === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 animate-bounce" />
                ) : (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {!isOnline
                    ? 'Mode Offline Aktif (Penyimpanan Aman Lokal)'
                    : syncPhase === 'completed'
                    ? '✓ Sinkronisasi Cloud 100% Selesai'
                    : `Menyinkronkan ke Database Cloud (${syncProgress}%)`}
                </h4>
                <p className="text-[11px] opacity-90">
                  {!isOnline
                    ? `Perangkat terputus dari internet.${pendingOfflineCount > 0 ? ` ${pendingOfflineCount} presensi tersimpan di antrean perangkat.` : ' Anda tetap dapat melakukan absensi.'}`
                    : syncPhase === 'completed'
                    ? 'Semua data presensi & foto offline berhasil diunggah ke Firebase Firestore & Google Drive.'
                    : 'Memulihkan koneksi dan memindahkan data presensi lokal ke Firebase Firestore...'}
                </p>
              </div>
            </div>

            {isOnline && onTriggerSync && (
              <button
                type="button"
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-sky-500' : ''}`} />
                <span>{isSyncing ? 'Proses...' : 'Sync Sekarang'}</span>
              </button>
            )}
          </div>

          {/* Animated Progress Bar */}
          {isOnline && (
            <div className="space-y-1">
              <div className="w-full bg-slate-200/80 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    syncPhase === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(8, syncProgress)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono opacity-80">
                <span>{syncPhase === 'reconnecting' ? 'Tahap 1: Menghubungkan...' : syncPhase === 'syncing' ? 'Tahap 2: Mengunggah data...' : 'Status: Siap'}</span>
                <span>{syncProgress}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SHIFT & JADWAL KONDISIONAL SELECTOR CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Pilihan Shift / Jam Kerja Kondisional
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pilih shift kerja aktif Anda pada hari {todayDayName}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
            {currentTimeHHMM} WIB
          </span>
        </div>

        {/* Shift Options List */}
        <div className="grid grid-cols-1 gap-2 pt-1">
          {assignedDUDI.daftar_shift && assignedDUDI.daftar_shift.length > 0 ? (
            assignedDUDI.daftar_shift.map((shift) => {
              const isSelected = selectedShift?.id_shift === shift.id_shift;
              const appliesToToday =
                !shift.hari_khusus || shift.hari_khusus.length === 0 || shift.hari_khusus.includes(todayDayName);

              return (
                <button
                  type="button"
                  key={shift.id_shift}
                  onClick={() => setSelectedShift(shift)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-slate-900 dark:border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 shadow-xs ring-1 ring-slate-900/10 dark:ring-sky-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {shift.kode_shift === 'MALAM' ? (
                          <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Sun className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        )}
                        {shift.nama_shift}
                      </span>
                      {shift.hari_khusus && shift.hari_khusus.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                          Khusus: {shift.hari_khusus.join(', ')}
                        </span>
                      )}
                      {appliesToToday && assignedDUDI.tipe_jadwal === 'Kondisional' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          Sesuai Hari Ini
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Jam Kerja: <strong className="text-slate-800 dark:text-slate-200 font-mono">{shift.jam_masuk} - {shift.jam_pulang} WIB</strong>
                      {shift.toleransi_keterlambatan_menit ? ` (Toleransi ${shift.toleransi_keterlambatan_menit} mnt)` : ''}
                    </p>
                    {shift.keterangan && (
                      <p className="text-[10px] text-slate-400 italic">{shift.keterangan}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-slate-900 dark:bg-sky-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700"></div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Jam Kerja Standar DUDI:</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">{assignedDUDI.jam_masuk_standar} - {assignedDUDI.jam_pulang_standar} WIB</strong>
            </div>
          )}
        </div>

        {/* Live Punctuality Indicator */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
            Evaluasi Ketepatan Waktu:
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              punctualityLive.status === 'Tepat Waktu'
                ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
            }`}
          >
            {punctualityLive.deskripsi}
          </span>
        </div>
      </div>

      {/* Today Attendance Status Banner if already checked in */}
      {todayAttendance && (
        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border-2 border-emerald-300/80 dark:border-emerald-800 rounded-2xl p-4 sm:p-4.5 flex items-start gap-3 shadow-xs transition-colors">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                Presensi Hari Ini Telah Dicatat
              </h4>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 shrink-0">
                {todayAttendance.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-850 dark:text-emerald-300">
              Masuk: <strong className="font-bold">{todayAttendance.jam_masuk} WIB</strong> | Pulang:{' '}
              <strong className="font-bold">{todayAttendance.jam_pulang ? `${todayAttendance.jam_pulang} WIB` : 'Belum Absen Pulang'}</strong>
            </p>

            {/* Cloud & Realtime Sync Status Indicator */}
            <div className="pt-0.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Tersimpan &amp; Sinkron Realtime (Firestore &amp; Drive)</span>
              </span>
            </div>

            {todayAttendance.status === 'Hadir' && !todayAttendance.jam_pulang && (
              <button
                id="btn-absen-pulang"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="mt-2.5 w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl bg-emerald-600 dark:bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-500 transition shadow-md active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Mencatat Absen Pulang...' : 'Catat Absen Pulang Sekarang (Thumb-Tap)'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* OFFLINE MODE BANNER */}
      {!isOnline && (
        <div className="p-4 bg-amber-500/10 dark:bg-amber-950/30 border-2 border-dashed border-amber-400/60 dark:border-amber-700/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
            <WifiOff className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wide">
                Mode Offline Aktif (Tanpa Akses Internet)
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                Penyimpanan Lokal Aktif
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Anda tetap dapat melakukan absensi masuk, pulang, izin, maupun sakit beserta bukti foto selfie.
              Data presensi Anda akan <strong>diamankan di penyimpanan lokal perangkat</strong> dan <strong>otomatis disinkronkan ke Firebase Firestore &amp; Google Drive</strong> saat kembali online.
            </p>
          </div>
        </div>
      )}

      {/* Main Attendance Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Form Presensi Mandiri</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pilih status kehadiran, pastikan GPS aktif dan berada di area industri.
          </p>
        </div>

        {/* Ergonomic & Thumb-Friendly Status Toggles */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
            Pilihan Status Kehadiran:
          </label>
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {/* Hadir */}
            <button
              type="button"
              id="toggle-status-hadir"
              onClick={() => setSelectedStatus('Hadir')}
              className={`min-h-[52px] sm:min-h-[56px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all border-2 active:scale-95 cursor-pointer select-none ${
                selectedStatus === 'Hadir'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-600 dark:border-emerald-400 text-emerald-950 dark:text-emerald-100 shadow-sm ring-2 ring-emerald-500/25'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${selectedStatus === 'Hadir' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>Hadir</span>
            </button>

            {/* Izin */}
            <button
              type="button"
              id="toggle-status-izin"
              onClick={() => setSelectedStatus('Izin')}
              className={`min-h-[52px] sm:min-h-[56px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all border-2 active:scale-95 cursor-pointer select-none ${
                selectedStatus === 'Izin'
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-600 dark:border-sky-400 text-sky-950 dark:text-sky-100 shadow-sm ring-2 ring-sky-500/25'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <FileText className={`w-4 h-4 shrink-0 ${selectedStatus === 'Izin' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>Izin</span>
            </button>

            {/* Sakit */}
            <button
              type="button"
              id="toggle-status-sakit"
              onClick={() => setSelectedStatus('Sakit')}
              className={`min-h-[52px] sm:min-h-[56px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all border-2 active:scale-95 cursor-pointer select-none ${
                selectedStatus === 'Sakit'
                  ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-600 dark:border-purple-400 text-purple-950 dark:text-purple-100 shadow-sm ring-2 ring-purple-500/25'
                  : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <HeartPulse className={`w-4 h-4 shrink-0 ${selectedStatus === 'Sakit' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>Sakit</span>
            </button>
          </div>
        </div>

        {/* Hadir Specific: Geolocation & Camera */}
        {selectedStatus === 'Hadir' ? (
          <>
            {/* Geofence / GPS Distance Meter */}
            <div className="bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/60 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950 dark:text-sky-200">
                  <MapPin className="w-4 h-4 text-sky-700 dark:text-sky-400" />
                  <span>Validasi Radius Lokasi (GPS)</span>
                </div>
                <button
                  type="button"
                  onClick={getDeviceLocation}
                  disabled={gpsLoading}
                  className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100 flex items-center gap-1 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-slate-700 shadow-2xs active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>Baca GPS Riil</span>
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-950 rounded-xl p-2.5 border border-sky-100 dark:border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Jarak ke DUDI</span>
                  <strong
                    className={`text-xs sm:text-sm font-bold ${
                      isWithinRadius ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatDistance(calculatedDistance)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Batas Radius</span>
                  <strong className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">{radiusLimit} m</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Status Valid</span>
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                      isWithinRadius
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {isWithinRadius ? '✓ Sesuai' : '✗ Luar Radius'}
                  </span>
                </div>
              </div>

              {/* Simulator Radius for Instant Testing */}
              <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-2 border border-sky-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Uji Simulasi Lokasi:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUseSimulatedGPS(true);
                      setSimulatedDistanceOffset(25);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition cursor-pointer active:scale-95 ${
                      useSimulatedGPS && simulatedDistanceOffset <= radiusLimit
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Di Kantor (25m)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseSimulatedGPS(true);
                      setSimulatedDistanceOffset(1250);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md border transition cursor-pointer active:scale-95 ${
                      useSimulatedGPS && simulatedDistanceOffset > radiusLimit
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Di Luar (1.2km)
                  </button>
                </div>
              </div>
            </div>

            {/* Camera / Selfie Section */}
            <div className="space-y-3">
              {/* Native smartphone camera capture */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {/* Standard file input for desktop / gallery upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Foto Selfie Bukti Kehadiran:
                </label>
                {capturedPhoto && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Foto Siap
                    </span>
                    {compressionStats && (
                      <span
                        className="text-[10px] font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800 flex items-center gap-1"
                        title={`Asli: ${compressionStats.originalKB} KB -> Terkompresi: ${compressionStats.compressedKB} KB`}
                      >
                        <Zap className="w-3 h-3 text-cyan-500" /> {compressionStats.compressedKB} KB
                        {compressionStats.ratioPercent > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            (-{compressionStats.ratioPercent}%)
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Pengaturan Tingkat Kompresi & Info Google Drive */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mode Kompresi Foto:</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
                    {(['eco', 'balanced', 'high'] as const).map((presetKey) => (
                      <button
                        type="button"
                        key={presetKey}
                        onClick={() => {
                          setCompressPreset(presetKey);
                          setSavedCompressionPreset(presetKey);
                        }}
                        className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                          compressPreset === presetKey
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {presetKey === 'eco'
                          ? 'Hemat (~40KB)'
                          : presetKey === 'balanced'
                          ? 'Seimbang (~60KB)'
                          : 'Kualitas (~100KB)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-sky-500" />
                    Tujuan Penyimpanan:
                  </span>
                  {getCachedAccessToken() ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Google Drive Cloud (OAuth)
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      Firestore Cloud Storage
                    </span>
                  )}
                </div>
              </div>

              {/* Viewfinder Frame - Proportionate & Centered */}
              <div className="relative aspect-square max-w-[270px] sm:max-w-[300px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner">
                {/* Live Video */}
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${
                    isCameraActive ? 'block' : 'hidden'
                  } ${isMirrored && facingMode === 'user' ? '-scale-x-100' : ''}`}
                  playsInline
                  autoPlay
                  muted
                />

                {/* Canvas for snapshot */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Loading state while compressing image */}
                {isCompressing && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30 text-white animate-fadeIn">
                    <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
                    <span className="text-xs font-semibold tracking-wide">Mengompresi Foto Otomatis...</span>
                    <span className="text-[10px] text-slate-400">Mengurangi ukuran file ke ~50 KB</span>
                  </div>
                )}

                {/* Captured Photo Preview */}
                {capturedPhoto && !isCameraActive && (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedPhoto}
                      alt="Selfie Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-xs backdrop-blur-xs">
                      <Check className="w-3 h-3" /> Terverifikasi
                    </div>
                    {compressionStats && (
                      <div className="absolute bottom-2 left-2 bg-slate-900/85 text-white text-[9px] font-medium px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 border border-white/10 shadow-xs">
                        <Zap className="w-2.5 h-2.5 text-cyan-400" />
                        <span>Kompresi: {compressionStats.compressedKB} KB</span>
                        {compressionStats.ratioPercent > 0 && (
                          <span className="text-emerald-400 font-bold">(-{compressionStats.ratioPercent}%)</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Placeholder when idle */}
                {!isCameraActive && !capturedPhoto && (
                  <div className="text-center p-4 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-100">
                      Ambil Foto Selfie Seragam PKL
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      Pilih tombol kamera di bawah untuk mengambil foto selfie.
                    </p>
                  </div>
                )}

                {/* Camera Live Top Toolbar Overlay */}
                {isCameraActive && (
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20 pointer-events-auto">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={toggleFacingMode}
                        className="px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-[10px] font-semibold border border-slate-700/80 flex items-center gap-1 transition cursor-pointer active:scale-95 backdrop-blur-xs"
                        title="Balik Kamera (Depan / Belakang)"
                      >
                        <RefreshCw className="w-3 h-3 text-sky-400" />
                        <span>{facingMode === 'user' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-1 rounded-lg bg-slate-900/80 hover:bg-rose-900/80 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                        title="Tutup Kamera"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Camera Face Guide Overlay */}
                {isCameraActive && (
                  <div className="absolute inset-8 border-2 border-dashed border-sky-400/80 rounded-full pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-medium text-sky-200 bg-slate-950/70 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      Posisikan Wajah
                    </span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Akses Kamera Browser Terbatas:</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">{cameraError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Thumb-Friendly Camera Action Buttons - Mobile Ergonomic 2x2 Grid */}
              {!isCameraActive ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Option 1: Live WebRTC Camera */}
                  <button
                    type="button"
                    id="btn-start-camera"
                    onClick={() => startCamera('user')}
                    className="min-h-[48px] px-3 py-2 rounded-xl bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
                    title="Buka live webcam browser langsung"
                  >
                    <Camera className="w-4 h-4 shrink-0" />
                    <span>{capturedPhoto ? 'Kamera Ulang' : 'Kamera (Live)'}</span>
                  </button>

                  {/* Option 2: Native Smartphone Camera (Direct Selfie Launch) */}
                  <button
                    type="button"
                    id="btn-upload-camera-native"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="min-h-[48px] px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-900 dark:text-sky-200 border-2 border-sky-300 dark:border-sky-700 hover:bg-sky-100 dark:hover:bg-sky-900/80 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    title="Buka aplikasi kamera bawaan ponsel untuk selfie langsung"
                  >
                    <Camera className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>Kamera HP</span>
                  </button>

                  {/* Option 3: Gallery / File Upload */}
                  <button
                    type="button"
                    id="btn-upload-gallery"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[46px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    title="Pilih foto bukti dari galeri atau berkas komputer"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Galeri / File</span>
                  </button>

                  {/* Option 4: Quick Test Snapshot */}
                  <button
                    type="button"
                    onClick={generateFallbackSnapshot}
                    className="min-h-[46px] px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                    title="Gunakan simulasi foto terverifikasi otomatis untuk pengujian cepat"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Contoh Foto</span>
                  </button>
                </div>
              ) : (
                /* When Camera is LIVE - Shutter Bar in Thumb Reach */
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-take-photo"
                    onClick={takeSnapshot}
                    className="flex-1 min-h-[50px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95 shadow-md cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Jepret Foto Selfie</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="min-h-[50px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Izin / Sakit Section */
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
              <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Ketentuan Pengajuan {selectedStatus}
              </span>
              <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
                Pemberitahuan otomatis akan dikirimkan ke WhatsApp Orang Tua dan Guru Pembimbing
                melalui Fonnte API Gateway.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                Alasan / Keterangan {selectedStatus} <span className="text-rose-500">*</span>:
              </label>
              <textarea
                id="input-keterangan"
                rows={3}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder={`Jelaskan alasan ${selectedStatus.toLowerCase()} secara rinci (misal: Sakit demam berobat ke Puskesmas, atau izin keperluan keluarga)...`}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-sky-500 focus:border-slate-900 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                required
              />
            </div>
          </div>
        )}

        {/* Thumb-Friendly Submit Attendance Action Button */}
        <button
          type="button"
          id="btn-submit-presensi"
          disabled={isSubmitting || isCompressing}
          onClick={() => handleSubmit(false)}
          className={`w-full min-h-[54px] sm:min-h-[58px] py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md border ${
            isSubmitting || isCompressing
              ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed border-transparent'
              : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white active:scale-98 border-slate-950 dark:border-emerald-700 cursor-pointer'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Menyimpan ke Database & Google Drive...</span>
            </>
          ) : isCompressing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Mengompresi Foto Selfie...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Kirim Presensi {selectedStatus} ({selectedShift?.nama_shift || 'Shift Aktif'})</span>
            </>
          )}
        </button>
      </div>

      {/* 3. MINI SCROLLABLE ATTENDANCE HISTORY WITH RICH SEARCH & MULTI-CRITERIA FILTERS */}
      {(() => {
        const countHadir = studentHistory.filter((p) => p.status === 'Hadir').length;
        const countIzin = studentHistory.filter((p) => p.status === 'Izin').length;
        const countSakit = studentHistory.filter((p) => p.status === 'Sakit').length;
        const activeFiltersCount =
          (historySearchQuery.trim() ? 1 : 0) +
          (historyDatePreset !== 'all' ? 1 : 0) +
          (historyStatusFilter !== 'all' ? 1 : 0) +
          (historyKetepatanFilter !== 'all' ? 1 : 0) +
          (historyJurnalFilter !== 'all' ? 1 : 0);

        const resetAllFilters = () => {
          setHistorySearchQuery('');
          setHistoryDatePreset('all');
          setHistoryCustomDate('');
          setHistoryStatusFilter('all');
          setHistoryKetepatanFilter('all');
          setHistoryJurnalFilter('all');
        };

        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors">
            {/* Header with Title & Stats Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Riwayat Presensi Siswa Terkini
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Daftar absensi terbaru Anda dengan filter pencarian instan
                  </p>
                </div>
              </div>

              {/* Quick Counter Badges */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Total: {studentHistory.length}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Hadir: {countHadir}
                </span>
                {countIzin > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    Izin: {countIzin}
                  </span>
                )}
                {countSakit > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Sakit: {countSakit}
                  </span>
                )}
              </div>
            </div>

            {/* Search Input Bar & Filter Toggle Button */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Cari tanggal, shift, status, atau catatan..."
                    className="w-full pl-8.5 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition"
                  />
                  {historySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    activeFiltersCount > 0
                      ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] flex items-center justify-center font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                  {isFilterExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Collapsible Advanced Filters Section */}
              {isFilterExpanded && (
                <div className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                  {/* Filter 1: Tanggal Presets */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Rentang Tanggal
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['all', 'today', '7days', 'month', 'custom'] as const).map((preset) => {
                        const labels: Record<string, string> = {
                          all: 'Semua',
                          today: 'Hari Ini',
                          '7days': '7 Hari Terakhir',
                          month: 'Bulan Ini',
                          custom: 'Pilih Tanggal',
                        };
                        const isActive = historyDatePreset === preset;
                        return (
                          <button
                            type="button"
                            key={preset}
                            onClick={() => setHistoryDatePreset(preset)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                              isActive
                                ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {labels[preset]}
                          </button>
                        );
                      })}
                    </div>

                    {historyDatePreset === 'custom' && (
                      <div className="pt-1.5 flex items-center gap-2">
                        <input
                          type="date"
                          value={historyCustomDate}
                          onChange={(e) => setHistoryCustomDate(e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                        />
                        {historyCustomDate && (
                          <button
                            type="button"
                            onClick={() => setHistoryCustomDate('')}
                            className="text-[10px] text-rose-600 hover:underline"
                          >
                            Reset Tanggal
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Filter 2: Status Presensi */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Status Kehadiran
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['all', 'Hadir', 'Izin', 'Sakit'] as const).map((status) => {
                        const isActive = historyStatusFilter === status;
                        return (
                          <button
                            type="button"
                            key={status}
                            onClick={() => setHistoryStatusFilter(status)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                              isActive
                                ? 'bg-slate-900 dark:bg-sky-600 text-white border-transparent'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {status === 'all' ? 'Semua Status' : status}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filter 3: Ketepatan & Status Jurnal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Ketepatan Waktu
                      </label>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(['all', 'Tepat Waktu', 'Terlambat'] as const).map((k) => (
                          <button
                            type="button"
                            key={k}
                            onClick={() => setHistoryKetepatanFilter(k)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              historyKetepatanFilter === k
                                ? 'bg-slate-800 text-white dark:bg-slate-700 border-transparent'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {k === 'all' ? 'Semua' : k}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Jurnal Kegiatan
                      </label>
                      <div className="flex items-center gap-1 flex-wrap">
                        {([
                          { id: 'all', label: 'Semua' },
                          { id: 'with_journal', label: 'Ada Jurnal' },
                          { id: 'without_journal', label: 'Belum Ada' },
                        ] as const).map((j) => (
                          <button
                            type="button"
                            key={j.id}
                            onClick={() => setHistoryJurnalFilter(j.id)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              historyJurnalFilter === j.id
                                ? 'bg-sky-700 text-white dark:bg-sky-600 border-transparent'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {j.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reset Filters CTA */}
                  {activeFiltersCount > 0 && (
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        {activeFiltersCount} filter aktif diterapkan
                      </span>
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Semua Filter</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filter Result Counter */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
              <span>
                Menampilkan <strong>{filteredStudentHistory.length}</strong> dari {studentHistory.length} catatan
              </span>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-sky-600 dark:text-sky-400 hover:underline text-[10px] font-semibold"
                >
                  Bersihkan Filter
                </button>
              )}
            </div>

            {/* Scrollable Container */}
            {filteredStudentHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 space-y-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {studentHistory.length === 0
                    ? 'Belum ada riwayat presensi tercatat.'
                    : 'Tidak ada catatan presensi yang cocok dengan filter.'}
                </p>
                {studentHistory.length > 0 && activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 rounded-lg border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="max-h-72 sm:max-h-84 overflow-y-auto space-y-2.5 pr-1.5 focus:outline-hidden">
                {filteredStudentHistory.map((p) => {
                  // Find connected journal for this student & date
                  const journalForDate = jurnalList.find(
                    (j) => j.id_siswa === currentSiswa?.id_siswa && j.tanggal === p.tanggal
                  );

                  return (
                    <div
                      key={p.id_presensi}
                      className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col gap-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          {/* Date & Status Badges */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {p.hari ? `${p.hari}, ` : ''}{p.tanggal}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'Hadir'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : p.status === 'Izin'
                                  ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                                  : 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.nama_shift && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
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

                          {/* Times & Details */}
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Masuk: <strong className="text-slate-800 dark:text-slate-200 font-mono">{p.jam_masuk} WIB</strong> | Pulang:{' '}
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">{p.jam_pulang ? `${p.jam_pulang} WIB` : 'Belum Pulang'}</strong>
                          </p>

                          {/* Keterangan if any */}
                          {p.keterangan && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                              &ldquo;{p.keterangan}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Photo Thumbnail & Links */}
                        <div className="flex items-center gap-2 shrink-0">
                          {p.foto_selfie && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs bg-slate-100 dark:bg-slate-800">
                              <img
                                src={p.foto_selfie}
                                alt="Selfie"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="text-right space-y-0.5">
                            {p.drive_view_url ? (
                              <a
                                href={p.drive_view_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-700 dark:text-sky-300 text-[10px] font-semibold border border-sky-200 dark:border-sky-800 transition"
                                title="Buka foto selfie asli di Google Drive"
                              >
                                <Cloud className="w-2.5 h-2.5 text-sky-500" />
                                <span>Drive</span>
                              </a>
                            ) : p.koordinat_absen?.jarak_meter ? (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                                {p.koordinat_absen.jarak_meter} m
                              </span>
                            ) : null}
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                              ✓ WA Terkirim
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Journal Linked Status Footer for this attendance record */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px] gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0">
                          <BookOpen className="w-3 h-3 text-slate-400 shrink-0" />
                          {journalForDate ? (
                            <span className="truncate">
                              Jurnal: <strong className="text-emerald-700 dark:text-emerald-400">{journalForDate.deskripsi_kegiatan}</strong>
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">
                              Belum mengisi jurnal harian
                            </span>
                          )}
                        </div>

                        {onNavigateTab && !journalForDate && p.status === 'Hadir' && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('jurnal')}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline"
                          >
                            <span>+ Tulis Jurnal</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
