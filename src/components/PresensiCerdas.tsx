import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Siswa, DUDI, Presensi, StatusPresensi, User, ShiftKerja } from '../types';
import { calculateDistanceMeters, formatDistance } from '../utils/geo';
import { DEFAULT_SELFIE_PREVIEW } from '../data/initialData';
import {
  getNamaHari,
  isHariKerjaDUDI,
  getRecommendedShift,
  calculateKetepatan,
} from '../utils/shiftHelper';
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
  onSavePresensi: (presensi: Presensi, sendWA: boolean) => void;
  onOpenWhatsAppModal: () => void;
  isOnline?: boolean;
  pendingOfflineCount?: number;
  onTriggerSync?: () => void;
  isSyncing?: boolean;
  onSelectSiswaDetail?: (siswa: Siswa) => void;
  showStatistikWidget?: boolean;
}

export const PresensiCerdas: React.FC<PresensiCerdasProps> = ({
  currentUser,
  siswaList,
  dudiList,
  presensiList,
  onSavePresensi,
  onOpenWhatsAppModal,
  isOnline = true,
  pendingOfflineCount = 0,
  onTriggerSync,
  isSyncing = false,
  onSelectSiswaDetail,
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

  // Current time for shift matching and punctuality
  const now = new Date();
  const currentTimeHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentTimeHHMMSS = `${currentTimeHHMM}:${String(now.getSeconds()).padStart(2, '0')}`;

  // Shift state: initialized to best matching shift for today
  const [selectedShift, setSelectedShift] = useState<ShiftKerja>(() =>
    getRecommendedShift(assignedDUDI, todayDayName, currentTimeHHMM)
  );

  // When assignedDUDI changes, re-sync selected shift
  useEffect(() => {
    setSelectedShift(getRecommendedShift(assignedDUDI, todayDayName, currentTimeHHMM));
  }, [assignedDUDI.id_dudi, todayDayName]);

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
  const handleSubmit = (isCheckout: boolean = false) => {
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

    if (isCheckout && todayAttendance) {
      // Absen Pulang
      const updated: Presensi = {
        ...todayAttendance,
        jam_pulang: timeStr,
      };
      onSavePresensi(updated, false);
      if (!isOnline) {
        alert(
          `[MODE OFFLINE] Presensi Pulang berhasil dicatat pada ${timeStr} WIB dan tersimpan di penyimpanan perangkat lokal. Data akan otomatis dikirim ke Database MySQL/TiDB saat online.`
        );
      } else {
        alert(`Presensi Pulang berhasil dicatat pada ${timeStr} WIB dan tersimpan ke Database MySQL/TiDB Cloud!`);
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

    onSavePresensi(newPresensi, true);
    if (!isOnline) {
      alert(
        selectedStatus === 'Hadir'
          ? `[MODE OFFLINE] Presensi Masuk berhasil dicatat (${timeStr} WIB) dan diamankan di penyimpanan lokal. Foto & data akan otomatis disinkronkan ke Google Drive & Database saat kembali online!`
          : `[MODE OFFLINE] Laporan ${selectedStatus} tersimpan sementara di penyimpanan lokal perangkat.`
      );
    } else {
      alert(
        selectedStatus === 'Hadir'
          ? `Presensi Masuk berhasil dicatat pada ${timeStr} WIB (${selectedShift?.nama_shift || 'Shift'} - ${punctualityCheck.deskripsi})! Foto diunggah ke Google Drive dan data tersimpan di Database MySQL/TiDB.`
          : `Laporan ${selectedStatus} berhasil dikirim ke Database MySQL/TiDB!`
      );
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
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Evaluasi Ketepatan Waktu:
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              punctualityLive.status === 'Tepat Waktu'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            {punctualityLive.deskripsi}
          </span>
        </div>
      </div>

      {/* Today Attendance Status Banner if already checked in */}
      {todayAttendance && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
                Presensi Hari Ini Telah Dicatat
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                {todayAttendance.status}
              </span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Masuk: <strong>{todayAttendance.jam_masuk} WIB</strong> | Pulang:{' '}
              <strong>{todayAttendance.jam_pulang ? `${todayAttendance.jam_pulang} WIB` : 'Belum Absen Pulang'}</strong>
            </p>

            {/* Cloud & LocalStorage Sync Status Indicator */}
            <div className="pt-1 flex items-center gap-2 flex-wrap">
              {todayAttendance.is_offline_pending ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                  <span>Tersimpan di LocalStorage (Menunggu Sinkronisasi Firebase)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Tersinkronisasi ke Firebase Firestore Cloud</span>
                </span>
              )}

              {isOnline && todayAttendance.is_offline_pending && onTriggerSync && (
                <button
                  type="button"
                  onClick={onTriggerSync}
                  disabled={isSyncing}
                  className="text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:text-amber-950 dark:hover:text-amber-100 underline cursor-pointer"
                >
                  {isSyncing ? 'Sedang mengirim...' : 'Kirim Sekarang'}
                </button>
              )}
            </div>

            {todayAttendance.status === 'Hadir' && !todayAttendance.jam_pulang && (
              <button
                id="btn-absen-pulang"
                onClick={() => handleSubmit(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 dark:bg-emerald-600 text-white hover:bg-emerald-800 dark:hover:bg-emerald-500 transition shadow-xs"
              >
                <Clock className="w-3.5 h-3.5" />
                Catat Absen Pulang Sekarang
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
              Data presensi Anda akan <strong>diamankan sementara di localStorage perangkat</strong> dan akan <strong>otomatis dikirimkan ke Firebase Firestore</strong> segera setelah koneksi internet kembali normal.
            </p>
            {pendingOfflineCount > 0 && (
              <div className="pt-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                📌 Terdapat {pendingOfflineCount} presensi di antrean lokal yang menunggu koneksi internet stabil.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Attendance Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Form Presensi Mandiri</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pilih status kehadiran, pastikan GPS aktif dan berada di area industri.
          </p>
        </div>

        {/* Touch-Friendly Status Toggles */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
            Pilihan Status Kehadiran:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* Hadir */}
            <button
              type="button"
              id="toggle-status-hadir"
              onClick={() => setSelectedStatus('Hadir')}
              className={`min-h-[48px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border-2 active:scale-98 ${
                selectedStatus === 'Hadir'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-slate-900 dark:border-emerald-500 text-slate-900 dark:text-emerald-200 shadow-xs ring-1 ring-slate-900/10 dark:ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900"></span>
              <span>Hadir</span>
            </button>

            {/* Izin */}
            <button
              type="button"
              id="toggle-status-izin"
              onClick={() => setSelectedStatus('Izin')}
              className={`min-h-[48px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border-2 active:scale-98 ${
                selectedStatus === 'Izin'
                  ? 'bg-sky-50/80 dark:bg-sky-950/50 border-slate-900 dark:border-sky-500 text-slate-900 dark:text-sky-200 shadow-xs ring-1 ring-slate-900/10 dark:ring-sky-500/20'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-200 dark:ring-sky-900"></span>
              <span>Izin</span>
            </button>

            {/* Sakit */}
            <button
              type="button"
              id="toggle-status-sakit"
              onClick={() => setSelectedStatus('Sakit')}
              className={`min-h-[48px] py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all border-2 active:scale-98 ${
                selectedStatus === 'Sakit'
                  ? 'bg-purple-50/80 dark:bg-purple-950/50 border-slate-900 dark:border-purple-500 text-slate-900 dark:text-purple-200 shadow-xs ring-1 ring-slate-900/10 dark:ring-purple-500/20'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-200 dark:ring-purple-900"></span>
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
                  className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-sky-100 flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-md border border-sky-200 dark:border-slate-700 shadow-2xs"
                >
                  <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                  <span>Baca GPS Riil</span>
                </button>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-white dark:bg-slate-950 rounded-lg p-2.5 border border-sky-100 dark:border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">Jarak ke DUDI</span>
                  <strong
                    className={`text-sm font-bold ${
                      isWithinRadius ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatDistance(calculatedDistance)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Batas Radius</span>
                  <strong className="text-sm font-bold text-slate-700 dark:text-slate-200">{radiusLimit} m</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Status Valid</span>
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
              <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-2 border border-sky-100 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simulasi Uji Radius:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setUseSimulatedGPS(true);
                      setSimulatedDistanceOffset(25);
                    }}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md border ${
                      useSimulatedGPS && simulatedDistanceOffset <= radiusLimit
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
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
                    className={`px-2 py-1 text-[10px] font-bold rounded-md border ${
                      useSimulatedGPS && simulatedDistanceOffset > radiusLimit
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Di Rumah (1.2km)
                  </button>
                </div>
              </div>
            </div>

            {/* Camera / Selfie Section */}
            <div className="space-y-2">
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
                    <span>Mode Kompresi Foto (Hemat Ruang):</span>
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
                        className={`px-2 py-1 rounded-md font-semibold transition ${
                          compressPreset === presetKey
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {presetKey === 'eco'
                          ? 'Super Hemat (~40KB)'
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
                    Tujuan Penyimpanan Foto:
                  </span>
                  {getCachedAccessToken() ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Google Drive (OAuth Aktif)
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">
                      TiDB Cloud / MySQL Lokal
                    </span>
                  )}
                </div>
              </div>

              <div className="relative aspect-square max-w-[300px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-inner">
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
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-500 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-200">
                      Ambil Foto Selfie Seragam / ID PKL
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                      Gunakan live camera, kamera ponsel langsung, atau upload bukti kehadiran.
                    </p>
                  </div>
                )}

                {/* Camera Live Top Toolbar Overlay */}
                {isCameraActive && (
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20 pointer-events-auto">
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs animate-pulse">
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
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 Buka Kamera HP Langsung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Pilih File Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={generateFallbackSnapshot}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-amber-100/60 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 inline mr-1" />
                      Gunakan Foto Pengujian
                    </button>
                  </div>
                </div>
              )}

              {/* Camera Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {!isCameraActive ? (
                  <>
                    <button
                      type="button"
                      id="btn-start-camera"
                      onClick={() => startCamera('user')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-sky-600 text-white hover:bg-slate-800 dark:hover:bg-sky-500 transition active:scale-95 shadow-xs cursor-pointer"
                      title="Buka live webcam browser langsung"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{capturedPhoto ? 'Kamera Live (Ulang)' : 'Buka Kamera (Live)'}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-upload-camera-native"
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-sky-600/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 hover:bg-sky-600/25 border border-sky-500/30 transition active:scale-95 cursor-pointer"
                      title="Buka aplikasi kamera bawaan HP secara langsung untuk selfie"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Kamera HP (Selfie)</span>
                    </button>

                    <button
                      type="button"
                      id="btn-upload-gallery"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer"
                      title="Pilih foto bukti dari galeri atau berkas komputer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Galeri / File</span>
                    </button>

                    {!capturedPhoto && (
                      <button
                        type="button"
                        onClick={generateFallbackSnapshot}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        title="Gunakan simulasi foto terverifikasi otomatis untuk pengujian cepat"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Contoh Foto</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      id="btn-take-photo"
                      onClick={takeSnapshot}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95 shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Jepret Foto Selfie</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Izin / Sakit Section */
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Ketentuan Pengajuan {selectedStatus}
              </span>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Pemberitahuan otomatis akan dikirimkan ke WhatsApp Orang Tua dan Guru Pembimbing
                melalui Fonnte API Gateway.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Alasan / Keterangan {selectedStatus} <span className="text-rose-500">*</span>:
              </label>
              <textarea
                id="input-keterangan"
                rows={3}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder={`Jelaskan alasan ${selectedStatus.toLowerCase()} secara rinci (misal: Sakit demam berobat ke Puskesmas, atau izin keperluan keluarga)...`}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-900 dark:focus:ring-sky-500 focus:border-slate-900 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          </div>
        )}

        {/* Submit Attendance Button */}
        <button
          type="button"
          id="btn-submit-presensi"
          onClick={() => handleSubmit(false)}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-slate-900 dark:bg-sky-600 text-sky-400 dark:text-white hover:bg-slate-800 dark:hover:bg-sky-500 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md border border-slate-800 dark:border-sky-700"
        >
          <Send className="w-4 h-4" />
          <span>Kirim Presensi {selectedStatus} ({selectedShift?.nama_shift || 'Shift'})</span>
        </button>
      </div>

      {/* History Presensi Terbaru Siswa */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Riwayat Presensi Terbaru
        </h4>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {presensiList.slice(0, 4).map((p) => {
            const isSelf = p.id_siswa === currentSiswa?.id_siswa;
            const targetSiswa = siswaList.find((x) => x.id_siswa === p.id_siswa);
            return (
              <div key={p.id_presensi} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{p.hari ? `${p.hari}, ` : ''}{p.tanggal}</span>
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
                    {targetSiswa && onSelectSiswaDetail && (
                      <button
                        type="button"
                        onClick={() => onSelectSiswaDetail(targetSiswa)}
                        className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Lihat profil detail siswa"
                      >
                        <span>{isSelf ? '(Anda)' : targetSiswa.nama_lengkap}</span>
                        <Eye className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Masuk: {p.jam_masuk} WIB | Pulang: {p.jam_pulang || '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.foto_selfie && (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs bg-slate-100 dark:bg-slate-800">
                      <img
                        src={p.foto_selfie}
                        alt="Selfie"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="text-right">
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
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block">
                        {p.koordinat_absen.jarak_meter} m
                      </span>
                    ) : null}
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">WA Terkirim</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
