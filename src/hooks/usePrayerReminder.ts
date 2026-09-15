import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PrayerReminderConfig,
  getSavedPrayerReminderConfig,
  savePrayerReminderConfig,
  PRAYER_REMINDER_CONFIG_EVENT,
  PRAYER_ALERT_EVENT,
  STORAGE_PRAYER_LAST_ALERT,
  PrayerAlertPayload,
  triggerTestPrayerAlert,
  calculateKemenagPrayerTimes,
  getSavedPrayerLocation,
  getEstimatedHijriDate,
} from '../utils/prayerTimesService';
import {
  playAdhanAudio,
  stopAdhanAudio,
  preloadAdhanAudio,
  isAdhanPlaying,
  addAdhanListener,
} from '../utils/audioNotification';

export interface AlertModalState {
  isOpen: boolean;
  prayerName: string;
  prayerTime: string;
  isTest?: boolean;
  locationName: string;
  hijriDate: string;
}

/**
 * Helper to check if Adhan audio is enabled for an individual prayer
 */
export function isAdhanEnabledForPrayer(prayerName: string, cfg: PrayerReminderConfig): boolean {
  if (!cfg.enabled || !cfg.adhanSoundEnabled) return false;
  switch (prayerName.toLowerCase()) {
    case 'subuh':
      return cfg.adhanSubuh !== false;
    case 'dzuhur':
      return cfg.adhanDzuhur !== false;
    case 'ashar':
      return cfg.adhanAshar !== false;
    case 'maghrib':
      return cfg.adhanMaghrib !== false;
    case 'isya':
      return cfg.adhanIsya !== false;
    default:
      return false;
  }
}

export function usePrayerReminder() {
  const [config, setConfig] = useState<PrayerReminderConfig>(() => getSavedPrayerReminderConfig());
  const [alertModalState, setAlertModalState] = useState<AlertModalState | null>(null);
  const [adhanActive, setAdhanActive] = useState<boolean>(() => isAdhanPlaying());

  // Subscribe to adhan state changes
  useEffect(() => {
    return addAdhanListener((playing) => {
      setAdhanActive(playing);
    });
  }, []);

  // Preload adhan audio with preload="auto" immediately upon mounting & config change
  // Ensures zero buffering latency when prayer time enters even on weak cellular signal
  useEffect(() => {
    preloadAdhanAudio(config.adhanVoice);
  }, [config.adhanVoice]);

  // Sync config state when changed from anywhere (e.g., another component or modal)
  useEffect(() => {
    const handleConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent<PrayerReminderConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(getSavedPrayerReminderConfig());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pkl_prayer_reminder_config') {
        setConfig(getSavedPrayerReminderConfig());
      }
    };

    window.addEventListener(PRAYER_REMINDER_CONFIG_EVENT, handleConfigChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener(PRAYER_REMINDER_CONFIG_EVENT, handleConfigChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Central trigger function to execute prayer alert and sound
  const firePrayerAlert = useCallback((prayerName: string, prayerTime: string, isTest = false) => {
    const loc = getSavedPrayerLocation();
    const hijri = getEstimatedHijriDate(new Date());
    const currentCfg = getSavedPrayerReminderConfig();

    if (currentCfg.enabled) {
      const shouldPlayAdhan = isAdhanEnabledForPrayer(prayerName, currentCfg);
      if (shouldPlayAdhan) {
        // Play instant preloaded authentic adhan audio
        playAdhanAudio(undefined, currentCfg.adhanVoice);
      }
      // Nada chime telah dihapus - jika adzan dimatikan, mode senyap berlaku
    }

    // Desktop browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(`Waktu Sholat ${prayerName} Telah Tiba`, {
            body: `Pukul ${prayerTime} untuk wilayah ${loc.locationName}. Mari sejenak menunaikan ibadah sholat tepat waktu.`,
            icon: '/favicon.ico',
          });
        } catch {}
      }
    }

    // Trigger Pop-up Modal if enabled
    if (currentCfg.popupEnabled) {
      setAlertModalState({
        isOpen: true,
        prayerName,
        prayerTime,
        isTest,
        locationName: loc.locationName,
        hijriDate: hijri,
      });
    }
  }, []);

  // Listen to manual or programmatic alert triggers (e.g. Test Button)
  useEffect(() => {
    const handleAlertTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<PrayerAlertPayload>;
      const payload = customEvent.detail;
      if (!payload) return;
      firePrayerAlert(payload.prayerName, payload.prayerTime, payload.isTest || false);
    };

    window.addEventListener(PRAYER_ALERT_EVENT, handleAlertTrigger);
    return () => {
      window.removeEventListener(PRAYER_ALERT_EVENT, handleAlertTrigger);
    };
  }, [firePrayerAlert]);

  // HIGH-PRECISION SCHEDULER:
  // Schedules exact millisecond timer for the upcoming prayer and preloads audio
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
    let preloadTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleNextPrayer = () => {
      if (schedulerTimer) clearTimeout(schedulerTimer);
      if (preloadTimer) clearTimeout(preloadTimer);

      const currentCfg = configRef.current;
      if (!currentCfg.enabled) return;

      const now = new Date();
      const loc = getSavedPrayerLocation();
      const prayerTimes = calculateKemenagPrayerTimes(now, loc.lat, loc.lng);

      const prayerCheckList: Array<{ name: string; time: string; enabled: boolean }> = [
        { name: 'Subuh', time: prayerTimes.subuh, enabled: currentCfg.notifySubuh },
        { name: 'Dzuhur', time: prayerTimes.dzuhur, enabled: currentCfg.notifyDzuhur },
        { name: 'Ashar', time: prayerTimes.ashar, enabled: currentCfg.notifyAshar },
        { name: 'Maghrib', time: prayerTimes.maghrib, enabled: currentCfg.notifyMaghrib },
        { name: 'Isya', time: prayerTimes.isya, enabled: currentCfg.notifyIsya },
      ];

      if (currentCfg.notifyImsak) {
        prayerCheckList.push({ name: 'Imsak', time: prayerTimes.imsak, enabled: true });
      }

      // Find upcoming prayer time today
      let nextPrayer: { name: string; time: string; targetDate: Date } | null = null;
      let minDiffMs = Infinity;

      for (const p of prayerCheckList) {
        if (!p.enabled) continue;
        const [hStr, mStr] = p.time.split(':');
        const h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);

        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
        const diff = target.getTime() - now.getTime();

        if (diff > 0 && diff < minDiffMs) {
          minDiffMs = diff;
          nextPrayer = { name: p.name, time: p.time, targetDate: target };
        }
      }

      if (nextPrayer && minDiffMs < 24 * 60 * 60 * 1000) {
        // Preload adhan audio 3 minutes prior to arrival so buffer is warm
        const preloadDelay = Math.max(0, minDiffMs - 3 * 60 * 1000);
        preloadTimer = setTimeout(() => {
          preloadAdhanAudio(currentCfg.adhanVoice);
        }, preloadDelay);

        // Schedule exact trigger at target millisecond
        const scheduledPrayer = nextPrayer;
        schedulerTimer = setTimeout(() => {
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayDateKey = `${year}-${month}-${day}`;
          const alertKey = `${todayDateKey}_${scheduledPrayer.name}`;

          try {
            localStorage.setItem(STORAGE_PRAYER_LAST_ALERT, alertKey);
          } catch {}

          firePrayerAlert(scheduledPrayer.name, scheduledPrayer.time, false);
          // Reschedule for next prayer
          scheduleNextPrayer();
        }, minDiffMs);
      }
    };

    scheduleNextPrayer();

    // FAILSAFE TICKER (every 1 second):
    // In case the tab was sleeping/backgrounded or system clock adjusted
    const failsafeTick = () => {
      const currentCfg = configRef.current;
      if (!currentCfg.enabled) return;

      const now = new Date();
      const loc = getSavedPrayerLocation();
      const prayerTimes = calculateKemenagPrayerTimes(now, loc.lat, loc.lng);

      const hoursStr = String(now.getHours()).padStart(2, '0');
      const minutesStr = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hoursStr}:${minutesStr}`;

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayDateKey = `${year}-${month}-${day}`;

      const prayerCheckList: Array<{ name: string; time: string; enabled: boolean }> = [
        { name: 'Subuh', time: prayerTimes.subuh, enabled: currentCfg.notifySubuh },
        { name: 'Dzuhur', time: prayerTimes.dzuhur, enabled: currentCfg.notifyDzuhur },
        { name: 'Ashar', time: prayerTimes.ashar, enabled: currentCfg.notifyAshar },
        { name: 'Maghrib', time: prayerTimes.maghrib, enabled: currentCfg.notifyMaghrib },
        { name: 'Isya', time: prayerTimes.isya, enabled: currentCfg.notifyIsya },
      ];

      if (currentCfg.notifyImsak) {
        prayerCheckList.push({ name: 'Imsak', time: prayerTimes.imsak, enabled: true });
      }

      for (const p of prayerCheckList) {
        if (!p.enabled) continue;

        if (p.time === currentTimeStr) {
          const alertKey = `${todayDateKey}_${p.name}`;
          const lastAlert = localStorage.getItem(STORAGE_PRAYER_LAST_ALERT);

          if (lastAlert !== alertKey) {
            try {
              localStorage.setItem(STORAGE_PRAYER_LAST_ALERT, alertKey);
            } catch {}

            firePrayerAlert(p.name, p.time, false);
            // Re-run scheduler for the rest of the day
            scheduleNextPrayer();
            break;
          }
        }
      }
    };

    const interval = setInterval(failsafeTick, 1000);

    return () => {
      if (schedulerTimer) clearTimeout(schedulerTimer);
      if (preloadTimer) clearTimeout(preloadTimer);
      clearInterval(interval);
    };
  }, [config, firePrayerAlert]);

  const toggleEnabled = useCallback(() => {
    const updated = savePrayerReminderConfig({ enabled: !config.enabled });
    setConfig(updated);
  }, [config.enabled]);

  const toggleSound = useCallback(() => {
    const updated = savePrayerReminderConfig({ soundEnabled: !config.soundEnabled });
    setConfig(updated);
  }, [config.soundEnabled]);

  const toggleAdhanSound = useCallback(() => {
    const updated = savePrayerReminderConfig({ adhanSoundEnabled: !config.adhanSoundEnabled });
    setConfig(updated);
  }, [config.adhanSoundEnabled]);

  const togglePrayerAdhan = useCallback(
    (prayerKey: 'Subuh' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya') => {
      const configKey = `adhan${prayerKey}` as
        | 'adhanSubuh'
        | 'adhanDzuhur'
        | 'adhanAshar'
        | 'adhanMaghrib'
        | 'adhanIsya';
      const updated = savePrayerReminderConfig({ [configKey]: !config[configKey] });
      setConfig(updated);
    },
    [config]
  );

  const togglePopup = useCallback(() => {
    const updated = savePrayerReminderConfig({ popupEnabled: !config.popupEnabled });
    setConfig(updated);
  }, [config.popupEnabled]);

  const updateConfig = useCallback((partial: Partial<PrayerReminderConfig>) => {
    const updated = savePrayerReminderConfig(partial);
    setConfig(updated);
  }, []);

  const closeAlertModal = useCallback(() => {
    stopAdhanAudio();
    setAlertModalState(null);
  }, []);

  const testAlert = useCallback((prayerName = 'Dzuhur', prayerTime?: string) => {
    const now = new Date();
    const loc = getSavedPrayerLocation();
    const prayerTimes = calculateKemenagPrayerTimes(now, loc.lat, loc.lng);
    const key = prayerName.toLowerCase() as keyof typeof prayerTimes;
    const resolvedTime = prayerTime || (prayerTimes[key] ? prayerTimes[key] : '12:05');
    triggerTestPrayerAlert(prayerName, resolvedTime);
  }, []);

  const playChime = useCallback(() => {
    // Nada chime telah dihapus dari fitur jadwal sholat sesuai permintaan pengguna
  }, []);

  const playAdhan = useCallback(() => {
    playAdhanAudio();
  }, []);

  const stopAdhan = useCallback(() => {
    stopAdhanAudio();
  }, []);

  return {
    config,
    toggleEnabled,
    toggleSound,
    toggleAdhanSound,
    togglePrayerAdhan,
    togglePopup,
    updateConfig,
    alertModalState,
    closeAlertModal,
    testAlert,
    playChime,
    playAdhan,
    stopAdhan,
    isAdhanPlaying: adhanActive,
  };
}
