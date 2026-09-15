import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Compass,
  Navigation,
  MapPin,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { calculateDistanceToKaaba } from '../utils/prayerTimesService';

interface QiblaCompassProps {
  qiblaAngle: number; // e.g. 295.1°
  latitude: number;
  longitude: number;
  locationName: string;
}

export const QiblaCompass: React.FC<QiblaCompassProps> = ({
  qiblaAngle,
  latitude,
  longitude,
  locationName,
}) => {
  // Device heading in degrees (0 - 360, 0 = North, 90 = East, 180 = South, 270 = West)
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [isSensorActive, setIsSensorActive] = useState<boolean>(false);
  const [sensorType, setSensorType] = useState<'gyro' | 'webkit' | 'manual' | 'simulated'>('manual');
  const [needsPermission, setNeedsPermission] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [tiltWarning, setTiltWarning] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Manual angle override for desktop/mouse interaction
  const [manualHeading, setManualHeading] = useState<number>(0);

  // Audio & vibration trigger cooldown
  const lastAlignedTriggerRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Calculate distance to Kaaba in kilometers
  const distanceKm = calculateDistanceToKaaba(latitude, longitude);

  // Play soft spiritual chime when locking on Qibla
  const playLockChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Gentle dual tone chime (harmonic 528 Hz & 792 Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(528, now); // Solfeggio frequency
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(792, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch {
      // Audio playback fails silently if blocked
    }
  }, [soundEnabled]);

  // Request Device Orientation permission (iOS Safari 13+)
  const requestOrientationPermission = async () => {
    try {
      setPermissionError(null);
      const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
      };

      if (typeof DeviceOrientationEventAny?.requestPermission === 'function') {
        const response = await DeviceOrientationEventAny.requestPermission();
        if (response === 'granted') {
          setNeedsPermission(false);
          startOrientationListener();
        } else {
          setPermissionError('Izin akses sensor gerak/gyroscope ditolak oleh browser.');
        }
      } else {
        startOrientationListener();
      }
    } catch (err) {
      setPermissionError('Tidak dapat meminta izin sensor pada browser ini.');
      console.warn('Orientation permission error:', err);
    }
  };

  const startOrientationListener = useCallback(() => {
    let sensorFired = false;

    // Handler for orientation events
    const handleOrientation = (event: DeviceOrientationEvent) => {
      sensorFired = true;
      setIsSensorActive(true);

      // Check tilt: device should be held relatively flat for accurate compass reading
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      const isExcessiveTilt = Math.abs(beta) > 35 || Math.abs(gamma) > 35;
      setTiltWarning(isExcessiveTilt);

      let heading: number | null = null;

      // 1. iOS Safari webkitCompassHeading (0 to 360 clockwise from magnetic North)
      if (typeof (event as unknown as { webkitCompassHeading?: number }).webkitCompassHeading !== 'undefined') {
        const iosHeading = (event as unknown as { webkitCompassHeading: number }).webkitCompassHeading;
        if (iosHeading !== null && !isNaN(iosHeading)) {
          heading = iosHeading;
          setSensorType('webkit');
        }
      }

      // 2. Android absolute orientation or standard alpha
      if (heading === null && event.alpha !== null && !isNaN(event.alpha)) {
        // Standard W3C alpha is counter-clockwise, convert to clockwise heading
        heading = (360 - event.alpha) % 360;
        setSensorType('gyro');
      }

      if (heading !== null) {
        setDeviceHeading(Math.round(heading * 10) / 10);
      }
    };

    // Prefer deviceorientationabsolute if available (standard Android Chrome)
    const win = window as unknown as Record<string, unknown>;
    const hasAbsolute = typeof win !== 'undefined' && 'ondeviceorientationabsolute' in win;

    if (hasAbsolute) {
      window.addEventListener('deviceorientationabsolute' as unknown as keyof WindowEventMap, handleOrientation as EventListener, true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    // Check after 1.5 seconds if any event actually fired
    const timer = setTimeout(() => {
      if (!sensorFired) {
        setIsSensorActive(false);
        setSensorType('manual');
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (hasAbsolute) {
        window.removeEventListener('deviceorientationabsolute' as unknown as keyof WindowEventMap, handleOrientation as EventListener, true);
      }
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // Initialization: check permissions and register listeners
  useEffect(() => {
    const DeviceOrientationEventAny = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
    };

    if (typeof DeviceOrientationEventAny?.requestPermission === 'function') {
      // iOS requires explicit user interaction to trigger requestPermission
      setNeedsPermission(true);
    } else {
      startOrientationListener();
    }
  }, [startOrientationListener]);

  // Simulation mode: automatically rotate heading 360 degrees
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setManualHeading((prev) => {
        const next = (prev + 1.5) % 360;
        setDeviceHeading(Math.round(next * 10) / 10);
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Active heading: use manual heading if sensor is not active and not in permission request
  const currentHeading = isSensorActive && !isSimulating ? deviceHeading : manualHeading;

  // Calculate difference to Qibla: shortest signed angular difference [-180, 180]
  const diffAngle = ((qiblaAngle - currentHeading + 540) % 360) - 180;
  const isAligned = Math.abs(diffAngle) <= 3; // within +/- 3 degrees tolerance

  // Trigger vibration & chime on alignment (with 3-second debounce)
  useEffect(() => {
    if (isAligned) {
      const now = Date.now();
      if (now - lastAlignedTriggerRef.current > 2500) {
        lastAlignedTriggerRef.current = now;
        playLockChime();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([60, 40, 80]);
        }
      }
    }
  }, [isAligned, playLockChime]);

  // Cardinal direction text for current heading
  const getCardinalDirection = (deg: number): string => {
    const d = (deg + 360) % 360;
    if (d >= 337.5 || d < 22.5) return 'U (Utara)';
    if (d >= 22.5 && d < 67.5) return 'TL (Timur Laut)';
    if (d >= 67.5 && d < 112.5) return 'T (Timur)';
    if (d >= 112.5 && d < 157.5) return 'TG (Tenggara)';
    if (d >= 157.5 && d < 202.5) return 'S (Selatan)';
    if (d >= 202.5 && d < 247.5) return 'BD (Barat Daya)';
    if (d >= 247.5 && d < 292.5) return 'B (Barat)';
    return 'BL (Barat Laut)';
  };

  // Turn recommendation instruction
  const getTurnGuidance = () => {
    if (isAligned) {
      return {
        text: "Tepat Menghadap Ka'bah (Allahu Akbar)",
        sub: 'Posisi sholat sudah lurus sempurna dengan kiblat',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/20 border-emerald-500/50',
      };
    }
    if (diffAngle > 0) {
      return {
        text: `Putar ke KANAN ${Math.round(diffAngle)}°`,
        sub: 'Arahkan bagian atas layar HP perlahan ke kanan',
        color: 'text-amber-400',
        bg: 'bg-amber-500/15 border-amber-500/40',
      };
    }
    return {
      text: `Putar ke KIRI ${Math.round(Math.abs(diffAngle))}°`,
      sub: 'Arahkan bagian atas layar HP perlahan ke kiri',
      color: 'text-amber-400',
      bg: 'bg-amber-500/15 border-amber-500/40',
    };
  };

  const guidance = getTurnGuidance();

  // Handle manual dial slider
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setManualHeading(val);
    setDeviceHeading(val);
    setIsSensorActive(false);
    setSensorType('manual');
    setIsSimulating(false);
  };

  // Align immediately to Kaaba button
  const handleSnapToQibla = () => {
    setManualHeading(qiblaAngle);
    setDeviceHeading(qiblaAngle);
    setIsSensorActive(false);
    setSensorType('manual');
    setIsSimulating(false);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Top Status & Sensor Badge */}
      <div className="w-full flex items-center justify-between gap-2 mb-3 px-1 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-[170px]">{locationName}</span>
          <span className="text-slate-500 text-[10px]">({latitude.toFixed(2)}°, {longitude.toFixed(2)}°)</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title={soundEnabled ? 'Suara nada pengunci kiblat aktif' : 'Suara dimatikan'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Sensor Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isAligned
                  ? 'bg-emerald-400 animate-ping'
                  : isSensorActive
                  ? 'bg-emerald-400'
                  : isSimulating
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-sky-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {isSensorActive
                ? sensorType === 'webkit'
                  ? 'iOS Gyro (Aktif)'
                  : 'Gyroscope (Aktif)'
                : isSimulating
                ? 'Simulasi Putar'
                : 'Mode Kompas Layar'}
            </span>
          </div>
        </div>
      </div>

      {/* iOS Safari Permission Banner if required */}
      {needsPermission && (
        <div className="w-full mb-3 p-3 rounded-xl bg-sky-950/60 border border-sky-500/40 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-200">
              Perangkat iOS memerlukan izin sensor orientasi kompas.
            </span>
          </div>
          <button
            type="button"
            onClick={requestOrientationPermission}
            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition shadow-xs cursor-pointer ml-auto"
          >
            Izinkan Sensor Kompas
          </button>
        </div>
      )}

      {permissionError && (
        <div className="w-full mb-3 p-2.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{permissionError} Menggunakan mode manual.</span>
        </div>
      )}

      {/* Excessive Tilt Warning (Compass needs to be horizontal) */}
      {tiltWarning && isSensorActive && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full mb-3 p-2 rounded-lg bg-amber-900/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-center justify-center gap-1.5"
        >
          <Smartphone className="w-3.5 h-3.5 rotate-45 text-amber-400" />
          <span>Pegang HP mendatar (posisi telapak tangan rata) untuk hasil kompas paling akurat.</span>
        </motion.div>
      )}

      {/* Guidance Header Banner: "TEPAT MENGHADAP KIBLAT" or "Putar ke Kiri/Kanan X°" */}
      <motion.div
        animate={{ scale: isAligned ? [1, 1.02, 1] : 1 }}
        transition={{ duration: 0.6, repeat: isAligned ? Infinity : 0 }}
        className={`w-full p-2.5 rounded-2xl border text-center transition-all duration-300 mb-4 shadow-sm ${guidance.bg}`}
      >
        <div className="flex items-center justify-center gap-2">
          {isAligned ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
          ) : (
            <Navigation
              className={`w-4 h-4 ${guidance.color} transition-transform duration-300`}
              style={{ transform: `rotate(${diffAngle}deg)` }}
            />
          )}
          <span className={`text-sm sm:text-base font-extrabold tracking-tight ${guidance.color}`}>
            {guidance.text}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 mt-0.5">{guidance.sub}</p>
      </motion.div>

      {/* 360-Degree Interactive Compass Stage */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 my-1 flex items-center justify-center">
        {/* Alignment Glow Aura */}
        {isAligned && (
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse pointer-events-none" />
        )}

        {/* Top Reference Needle Indicator (Represents the top of user's device/screen) */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          <div
            className={`w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] ${
              isAligned
                ? 'border-t-emerald-400 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'border-t-rose-500'
            }`}
          />
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs -mt-0.5" />
        </div>

        {/* Compass Outer Bezel */}
        <div
          className={`relative w-full h-full rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-4 transition-all duration-500 flex items-center justify-center shadow-2xl overflow-hidden ${
            isAligned
              ? 'border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.35)]'
              : 'border-slate-700/80'
          }`}
        >
          {/* Subtle Dial Texture & Concentric Rings */}
          <div className="absolute inset-2 rounded-full border border-slate-800/80 pointer-events-none" />
          <div className="absolute inset-8 rounded-full border border-slate-800/60 pointer-events-none" />
          <div className="absolute inset-16 rounded-full border border-slate-800/40 pointer-events-none" />

          {/* Rotating Compass Dial Plate: Rotates by -currentHeading degrees so that top matches device orientation */}
          <div
            className="absolute inset-0 w-full h-full transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `rotate(${-currentHeading}deg)` }}
          >
            {/* Cardinal Points on the Dial */}
            {/* UTARA (0°) */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span className="text-rose-400 font-extrabold text-xs tracking-wider">U</span>
              <div className="w-0.5 h-2 bg-rose-400 rounded-full" />
            </div>

            {/* TIMUR (90°) */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
              <div className="w-2 h-0.5 bg-slate-400 rounded-full" />
              <span className="text-slate-300 font-bold text-xs pl-1">T</span>
            </div>

            {/* SELATAN (180°) */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
              <div className="w-0.5 h-2 bg-slate-400 rounded-full" />
              <span className="text-slate-300 font-bold text-xs">S</span>
            </div>

            {/* BARAT (270°) */}
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center">
              <span className="text-slate-300 font-bold text-xs pr-1">B</span>
              <div className="w-2 h-0.5 bg-slate-400 rounded-full" />
            </div>

            {/* 30-Degree Ticks around the perimeter */}
            {[30, 60, 120, 150, 210, 240, 300, 330].map((deg) => (
              <div
                key={deg}
                className="absolute inset-0 w-full h-full flex justify-center pointer-events-none"
                style={{ transform: `rotate(${deg}deg)` }}
              >
                <div className="w-[1px] h-2 bg-slate-600/70 mt-3" />
              </div>
            ))}

            {/* KAABA POINTER (Fixed on the dial at qiblaAngle degrees, e.g. 295.1°) */}
            <div
              className="absolute inset-0 w-full h-full flex justify-center items-start pointer-events-none"
              style={{ transform: `rotate(${qiblaAngle}deg)` }}
            >
              {/* Pointer Needle to Kaaba */}
              <div className="flex flex-col items-center mt-3 z-20">
                {/* Kaaba Marker Graphic */}
                <div
                  className={`relative p-1 rounded-lg transition-all duration-300 ${
                    isAligned
                      ? 'bg-gradient-to-tr from-emerald-500 to-amber-300 shadow-[0_0_12px_rgba(52,211,153,0.9)] scale-110'
                      : 'bg-gradient-to-tr from-amber-500 to-yellow-400 shadow-md'
                  }`}
                  title={`Ka'bah (${qiblaAngle}°)`}
                >
                  {/* Kaaba Symbol (Black cube with gold band) */}
                  <div className="w-5 h-5 rounded-xs bg-slate-950 border border-amber-300 flex flex-col justify-between p-0.5">
                    <div className="w-full h-1 bg-amber-400 rounded-xs" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mx-auto" />
                  </div>
                </div>

                {/* Target Angle Needle */}
                <div
                  className={`w-1 h-14 rounded-full mt-1 ${
                    isAligned
                      ? 'bg-gradient-to-b from-emerald-400 to-transparent'
                      : 'bg-gradient-to-b from-amber-400 to-transparent'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Compass Center Core (Fixed relative to the device) */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center p-3 rounded-full bg-slate-900/90 border border-slate-700/80 backdrop-blur-sm shadow-inner w-28 h-28">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Kiblat
            </span>
            <span
              className={`font-mono font-extrabold text-lg leading-tight transition-colors ${
                isAligned ? 'text-emerald-400' : 'text-white'
              }`}
            >
              {qiblaAngle}°
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Barat Laut</span>

            <div className="mt-1 pt-1 border-t border-slate-800 w-full text-center">
              <span className="text-[9px] text-slate-400 font-mono">
                HP: {Math.round(currentHeading)}°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Angle Readouts & Distance Stats Bar */}
      <div className="w-full grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] text-slate-400">Sudut Kiblat</div>
          <div className="font-mono font-bold text-sm text-emerald-400">{qiblaAngle}°</div>
          <div className="text-[9px] text-slate-500">Ka'bah</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] text-slate-400">Arah HP</div>
          <div className="font-mono font-bold text-sm text-white">{Math.round(currentHeading)}°</div>
          <div className="text-[9px] text-slate-400 truncate">{getCardinalDirection(currentHeading)}</div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[10px] text-slate-400">Jarak Ka'bah</div>
          <div className="font-mono font-bold text-sm text-amber-400">
            {distanceKm.toLocaleString('id-ID')}
          </div>
          <div className="text-[9px] text-slate-500">kilometer</div>
        </div>
      </div>

      {/* Manual / Desktop Interaction Controls */}
      <div className="w-full mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Kontrol & Kalibrasi Kompas:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                isSimulating
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Putar kompas secara otomatis untuk demonstrasi"
            >
              <RefreshCw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Hentikan' : 'Simulasi Putar'}</span>
            </button>

            <button
              type="button"
              onClick={handleSnapToQibla}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-700/60 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-100 transition cursor-pointer flex items-center gap-1"
              title="Arahkan langsung tepat ke Ka'bah"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Luruskan</span>
            </button>
          </div>
        </div>

        {/* Range Slider for Manual / Desktop Heading */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400">0°</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={currentHeading}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            title="Geser untuk memutar arah kompas secara manual"
          />
          <span className="text-[11px] font-mono text-slate-400">360°</span>
        </div>

        {/* Informative usage tip */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-start gap-1.5 text-[11px] text-slate-400 leading-normal">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
          <span>
            {isSensorActive
              ? 'Sensor gyroscope & kompas aktif otomatis mengikuti putaran fisik HP Anda.'
              : 'Pada browser laptop/desktop tanpa sensor gerak, geser pengatur di atas atau gunakan simulasi putar untuk mengarahkan kompas.'}
          </span>
        </div>
      </div>
    </div>
  );
};
