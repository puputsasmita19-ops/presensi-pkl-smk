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
  playPrayerCallChime,
  playAdhanAudio,
  stopAdhanAudio,
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

  // Listen to manual or programmatic alert triggers (e.g. Test Button)
  useEffect(() => {
    const handleAlertTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<PrayerAlertPayload>;
      const payload = customEvent.detail;
      if (!payload) return;

      const loc = getSavedPrayerLocation();
      const hijri = getEstimatedHijriDate(new Date());

      // If adhan sound is enabled in config, play adhan; otherwise if sound is enabled play chime
      const currentCfg = getSavedPrayerReminderConfig();
      if (currentCfg.enabled) {
        if (currentCfg.adhanSoundEnabled) {
          playAdhanAudio();
        } else if (currentCfg.soundEnabled) {
          playPrayerCallChime();
        }
      }

      setAlertModalState({
        isOpen: true,
        prayerName: payload.prayerName,
        prayerTime: payload.prayerTime,
        isTest: payload.isTest || false,
        locationName: payload.locationName || loc.locationName,
        hijriDate: payload.hijriDate || hijri,
      });
    };

    window.addEventListener(PRAYER_ALERT_EVENT, handleAlertTrigger);
    return () => {
      window.removeEventListener(PRAYER_ALERT_EVENT, handleAlertTrigger);
    };
  }, []);

  // Real-time prayer ticker to detect when prayer time arrives
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const checkPrayerTime = () => {
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

        // Check if current HH:mm matches prayer time
        if (p.time === currentTimeStr) {
          const alertKey = `${todayDateKey}_${p.name}`;
          const lastAlert = localStorage.getItem(STORAGE_PRAYER_LAST_ALERT);

          if (lastAlert !== alertKey) {
            // Record alert so it only fires once per prayer per day
            try {
              localStorage.setItem(STORAGE_PRAYER_LAST_ALERT, alertKey);
            } catch {}

            // Play Adhan sound if enabled, or chime
            if (currentCfg.adhanSoundEnabled) {
              playAdhanAudio();
            } else if (currentCfg.soundEnabled) {
              playPrayerCallChime();
            }

            // Desktop browser notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                try {
                  new Notification(`Waktu Sholat ${p.name} Telah Tiba`, {
                    body: `Pukul ${p.time} untuk wilayah ${loc.locationName}. Mari sejenak menunaikan ibadah sholat tepat waktu.`,
                    icon: '/favicon.ico',
                  });
                } catch {}
              }
            }

            // Trigger Pop-up Modal if enabled
            if (currentCfg.popupEnabled) {
              setAlertModalState({
                isOpen: true,
                prayerName: p.name,
                prayerTime: p.time,
                isTest: false,
                locationName: loc.locationName,
                hijriDate: getEstimatedHijriDate(now),
              });
            }

            break;
          }
        }
      }
    };

    // Check immediately and then every 2 seconds
    checkPrayerTime();
    const interval = setInterval(checkPrayerTime, 2000);
    return () => clearInterval(interval);
  }, []);

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
    playPrayerCallChime();
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
