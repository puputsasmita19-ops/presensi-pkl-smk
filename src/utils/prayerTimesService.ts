/**
 * Prayer Times (Jadwal Sholat 5 Waktu) Service
 * - Standard Kemenag RI (Kementerian Agama Republik Indonesia) Astronomical Calculations
 * - Realtime Geolocation Detection with GPS & City presets
 * - Live Countdown to Next Prayer Time & Active Prayer Detection
 * - Qibla Direction (Arah Kiblat) calculation
 * - Reactive cross-component location sync event emitter
 * - Aladhan API integration with robust offline fallback
 */

import { useState, useEffect, useMemo } from 'react';

export interface PrayerTimes {
  imsak: string;    // HH:mm
  subuh: string;    // HH:mm
  terbit: string;   // HH:mm
  dhuha: string;    // HH:mm
  dzuhur: string;   // HH:mm
  ashar: string;    // HH:mm
  maghrib: string;  // HH:mm
  isya: string;     // HH:mm
}

export interface PrayerLocation {
  lat: number;
  lng: number;
  locationName: string;
  isGps: boolean;
}

export interface PrayerTimesData {
  dateFormatted: string;
  hijriFormatted: string;
  locationName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  qiblaAngle: number;
  times: PrayerTimes;
  source: 'gps' | 'city' | 'api' | 'calculated';
}

export interface NextPrayerInfo {
  name: 'Imsak' | 'Subuh' | 'Terbit' | 'Dhuha' | 'Dzuhur' | 'Ashar' | 'Maghrib' | 'Isya';
  time: string;
  remainingSeconds: number;
  remainingFormatted: string;
  currentPrayerName: string;
  isPassed: boolean;
}

export interface CityPreset {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number; // in hours, e.g. 7 for WIB, 8 for WITA, 9 for WIT
  timezoneName: 'WIB' | 'WITA' | 'WIT';
}

export const INDONESIAN_CITIES: CityPreset[] = [
  { name: 'Jakarta', province: 'DKI Jakarta', latitude: -6.2088, longitude: 106.8456, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Surabaya', province: 'Jawa Timur', latitude: -7.2575, longitude: 112.7521, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Bandung', province: 'Jawa Barat', latitude: -6.9175, longitude: 107.6191, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Semarang', province: 'Jawa Tengah', latitude: -6.9667, longitude: 110.4167, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Yogyakarta', province: 'DI Yogyakarta', latitude: -7.7956, longitude: 110.3695, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Medan', province: 'Sumatera Utara', latitude: 3.5952, longitude: 98.6722, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Palembang', province: 'Sumatera Selatan', latitude: -2.9909, longitude: 104.7565, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Makassar', province: 'Sulawesi Selatan', latitude: -5.1477, longitude: 119.4327, timezoneOffset: 8, timezoneName: 'WITA' },
  { name: 'Denpasar', province: 'Bali', latitude: -8.6705, longitude: 115.2126, timezoneOffset: 8, timezoneName: 'WITA' },
  { name: 'Banjarmasin', province: 'Kalimantan Selatan', latitude: -3.3194, longitude: 114.5908, timezoneOffset: 8, timezoneName: 'WITA' },
  { name: 'Balikpapan', province: 'Kalimantan Timur', latitude: -1.2379, longitude: 116.8529, timezoneOffset: 8, timezoneName: 'WITA' },
  { name: 'Pontianak', province: 'Kalimantan Barat', latitude: -0.0263, longitude: 109.3425, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Manado', province: 'Sulawesi Utara', latitude: 1.4748, longitude: 124.8428, timezoneOffset: 8, timezoneName: 'WITA' },
  { name: 'Mataram (Lombok)', province: 'NTB', latitude: -8.5833, longitude: 116.1167, timezoneOffset: 8, timezoneName: 'WITA' },
  { name: 'Kupang', province: 'NTT', latitude: -10.1772, longitude: 123.607, timezoneOffset: 8, timezoneName: 'WITA' },
  { name: 'Ambon', province: 'Maluku', latitude: -3.6547, longitude: 128.1906, timezoneOffset: 9, timezoneName: 'WIT' },
  { name: 'Jayapura', province: 'Papua', latitude: -2.5916, longitude: 140.669, timezoneOffset: 9, timezoneName: 'WIT' },
  { name: 'Banda Aceh', province: 'Aceh', latitude: 5.5483, longitude: 95.3238, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Padang', province: 'Sumatera Barat', latitude: -0.9471, longitude: 100.4172, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Pekanbaru', province: 'Riau', latitude: 0.5071, longitude: 101.4478, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Bandar Lampung', province: 'Lampung', latitude: -5.45, longitude: 105.2667, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Malang', province: 'Jawa Timur', latitude: -7.9797, longitude: 112.6304, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Cirebon', province: 'Jawa Barat', latitude: -6.732, longitude: 108.5523, timezoneOffset: 7, timezoneName: 'WIB' },
  { name: 'Solo / Surakarta', province: 'Jawa Tengah', latitude: -7.5755, longitude: 110.8243, timezoneOffset: 7, timezoneName: 'WIB' },
];

const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

/**
 * Calculates Qibla direction in degrees clockwise from North (0 - 360 deg)
 */
export function calculateQiblaDirection(latitude: number, longitude: number): number {
  const phi1 = (latitude * Math.PI) / 180;
  const phi2 = (KAABA_LAT * Math.PI) / 180;
  const deltaLambda = ((KAABA_LNG - longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);

  let qibla = (Math.atan2(y, x) * 180) / Math.PI;
  qibla = (qibla + 360) % 360;
  return Math.round(qibla * 10) / 10;
}

/**
 * Calculates Great-circle distance to Kaaba in kilometers (Haversine formula)
 */
export function calculateDistanceToKaaba(latitude: number, longitude: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((KAABA_LAT - latitude) * Math.PI) / 180;
  const dLng = ((KAABA_LNG - longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((latitude * Math.PI) / 180) *
      Math.cos((KAABA_LAT * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * High-precision astronomical calculation of Islamic Prayer Times
 * Standard: Kemenag RI (Kementerian Agama RI)
 * - Subuh: Sun altitude = -20.0°
 * - Isya: Sun altitude = -18.0°
 * - Ashar: Shafi'i shadow factor = 1.0 (shadow = object + noon shadow)
 * - Imsak: 10 minutes before Subuh
 * - Dhuha: Sun altitude = 4.5° (approx 20 mins after sunrise)
 * - Ihtiyat (safety margin): +2 minutes added as recommended by Kemenag RI
 */
export function calculateKemenagPrayerTimes(
  date: Date,
  lat: number,
  lng: number,
  timezoneOffset?: number
): PrayerTimes {
  const tz = timezoneOffset !== undefined ? timezoneOffset : -date.getTimezoneOffset() / 60;

  // Julian Date calculation
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  let jd =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  // Julian Century
  const t = (jd - 2451545.0) / 36525.0;

  // Sun's mean longitude & mean anomaly
  const l0 = (280.46646 + 36000.76983 * t + 0.0003032 * t * t) % 360;
  const mSun = (357.52911 + 35999.05029 * t - 0.0001537 * t * t) % 360;
  const mRad = (mSun * Math.PI) / 180;

  // Sun equation of center
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mRad) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * mRad) +
    0.000289 * Math.sin(3 * mRad);

  // Sun true longitude & apparent longitude
  const sunTrueLong = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const lambda = sunTrueLong - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180);
  const lambdaRad = (lambda * Math.PI) / 180;

  // Mean obliquity of ecliptic
  const epsilon0 =
    23 +
    (26 + (21.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t * t * t) / 60) / 60;
  const epsilon = epsilon0 + 0.00256 * Math.cos((omega * Math.PI) / 180);
  const epsRad = (epsilon * Math.PI) / 180;

  // Sun's declination
  const sinDec = Math.sin(epsRad) * Math.sin(lambdaRad);
  const decRad = Math.asin(sinDec);
  const dec = (decRad * 180) / Math.PI;

  // Equation of Time in minutes
  const yEq = Math.tan(epsRad / 2) * Math.tan(epsRad / 2);
  const l0Rad = (l0 * Math.PI) / 180;
  const eotRad =
    yEq * Math.sin(2 * l0Rad) -
    2 * 0.016708634 * Math.sin(mRad) +
    4 * 0.016708634 * yEq * Math.sin(mRad) * Math.cos(2 * l0Rad) -
    0.5 * yEq * yEq * Math.sin(4 * l0Rad) -
    1.25 * 0.016708634 * 0.016708634 * Math.sin(2 * mRad);
  const eqTime = (eotRad * 180) / Math.PI * 4; // in minutes

  // Solar noon (Dzuhur) in hours
  const solarNoon = (12 + tz - lng / 15 - eqTime / 60 + 24) % 24;

  const latRad = (lat * Math.PI) / 180;

  // Helper for Hour Angle calculation at a given altitude angle
  const getHourAngle = (altitudeDeg: number): number => {
    const altRad = (altitudeDeg * Math.PI) / 180;
    const cosHA =
      (Math.sin(altRad) - Math.sin(latRad) * Math.sin(decRad)) /
      (Math.cos(latRad) * Math.cos(decRad));
    if (cosHA > 1) return 0; // Never rises
    if (cosHA < -1) return 180; // Never sets
    return (Math.acos(cosHA) * 180) / Math.PI;
  };

  // 1. Subuh: Sun altitude = -20.0 deg (Kemenag standard)
  const haSubuh = getHourAngle(-20.0);
  const subuhHours = solarNoon - haSubuh / 15;

  // 2. Terbit (Sunrise): Sun altitude = -0.833 deg (standard refraction + semi-diameter)
  const haSunrise = getHourAngle(-0.833);
  const sunriseHours = solarNoon - haSunrise / 15;

  // 3. Dhuha: Sun altitude = 4.5 deg (Kemenag standard)
  const haDhuha = getHourAngle(4.5);
  const dhuhaHours = solarNoon - haDhuha / 15;

  // 4. Dzuhur: Solar noon + 2 minutes safety margin (ihtiyat)
  const dzuhurHours = solarNoon;

  // 5. Ashar: Shafi'i shadow factor = 1
  const asrAltRad = Math.atan(1 / (1 + Math.tan(Math.abs(latRad - decRad))));
  const asrAltDeg = (asrAltRad * 180) / Math.PI;
  const haAshar = getHourAngle(asrAltDeg);
  const asharHours = solarNoon + haAshar / 15;

  // 6. Maghrib (Sunset): Sun altitude = -0.833 deg
  const haSunset = getHourAngle(-0.833);
  const maghribHours = solarNoon + haSunset / 15;

  // 7. Isya: Sun altitude = -18.0 deg (Kemenag standard)
  const haIsya = getHourAngle(-18.0);
  const isyaHours = solarNoon + haIsya / 15;

  // Convert decimal hours to HH:mm string with safety margin (+2 mins Kemenag standard ihtiyat)
  const toTimeString = (decimalHours: number, ihtiyatMinutes = 2): string => {
    let totalMinutes = Math.round(decimalHours * 60) + ihtiyatMinutes;
    totalMinutes = (totalMinutes + 1440) % 1440;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Imsak is 10 minutes before Subuh
  const subuhTotalMin = Math.round(subuhHours * 60) + 2;
  const imsakTotalMin = (subuhTotalMin - 10 + 1440) % 1440;
  const imsakStr = `${String(Math.floor(imsakTotalMin / 60)).padStart(2, '0')}:${String(
    imsakTotalMin % 60
  ).padStart(2, '0')}`;

  return {
    imsak: imsakStr,
    subuh: toTimeString(subuhHours, 2),
    terbit: toTimeString(sunriseHours, -2), // Sunrise doesn't have positive ihtiyat
    dhuha: toTimeString(dhuhaHours, 2),
    dzuhur: toTimeString(dzuhurHours, 2),
    ashar: toTimeString(asharHours, 2),
    maghrib: toTimeString(maghribHours, 2),
    isya: toTimeString(isyaHours, 2),
  };
}

/**
 * Converts Gregorian date to estimated Islamic Hijri Date string
 */
export function getEstimatedHijriDate(date: Date): string {
  const hijriMonths = [
    'Muharram',
    'Safar',
    "Rabi'ul Awwal",
    "Rabi'ul Akhir",
    'Jumadil Awwal',
    'Jumadil Akhir',
    'Rajab',
    "Sya'ban",
    'Ramadhan',
    'Syawwal',
    "Dzulqa'dah",
    'Dzulhijjah',
  ];

  try {
    const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    const jd =
      date.getTime() / 86400000 +
      2440587.5 -
      date.getTimezoneOffset() / 1440;
    const l = Math.floor(jd - 1948440 + 10632);
    const n = Math.floor((l - 1) / 10631);
    const l2 = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
      Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
    const l3 =
      l2 -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const m = Math.floor((24 * l3) / 709);
    const d = l3 - Math.floor((709 * m) / 24);
    const y = 30 * n + j - 30;

    const monthName = hijriMonths[(m - 1 + 12) % 12];
    return `${d} ${monthName} ${y} H`;
  }
}

/**
 * Calculates which prayer is currently active and the countdown to the next prayer
 */
export function getNextPrayerCountdown(
  times: PrayerTimes,
  currentDate: Date = new Date()
): NextPrayerInfo {
  const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
  const currentSeconds = currentMinutes * 60 + currentDate.getSeconds();

  const parseToSeconds = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60 + m) * 60;
  };

  const prayerList: { name: NextPrayerInfo['name']; seconds: number; timeStr: string }[] = [
    { name: 'Imsak', seconds: parseToSeconds(times.imsak), timeStr: times.imsak },
    { name: 'Subuh', seconds: parseToSeconds(times.subuh), timeStr: times.subuh },
    { name: 'Terbit', seconds: parseToSeconds(times.terbit), timeStr: times.terbit },
    { name: 'Dhuha', seconds: parseToSeconds(times.dhuha), timeStr: times.dhuha },
    { name: 'Dzuhur', seconds: parseToSeconds(times.dzuhur), timeStr: times.dzuhur },
    { name: 'Ashar', seconds: parseToSeconds(times.ashar), timeStr: times.ashar },
    { name: 'Maghrib', seconds: parseToSeconds(times.maghrib), timeStr: times.maghrib },
    { name: 'Isya', seconds: parseToSeconds(times.isya), timeStr: times.isya },
  ];

  // Determine current active prayer
  let currentActive = 'Malam';
  if (currentSeconds >= prayerList[1].seconds && currentSeconds < prayerList[2].seconds) {
    currentActive = 'Waktu Subuh';
  } else if (currentSeconds >= prayerList[2].seconds && currentSeconds < prayerList[3].seconds) {
    currentActive = 'Waktu Syuruq (Terbit)';
  } else if (currentSeconds >= prayerList[3].seconds && currentSeconds < prayerList[4].seconds) {
    currentActive = 'Waktu Dhuha';
  } else if (currentSeconds >= prayerList[4].seconds && currentSeconds < prayerList[5].seconds) {
    currentActive = 'Waktu Dzuhur';
  } else if (currentSeconds >= prayerList[5].seconds && currentSeconds < prayerList[6].seconds) {
    currentActive = 'Waktu Ashar';
  } else if (currentSeconds >= prayerList[6].seconds && currentSeconds < prayerList[7].seconds) {
    currentActive = 'Waktu Maghrib';
  } else if (currentSeconds >= prayerList[7].seconds || currentSeconds < prayerList[0].seconds) {
    currentActive = 'Waktu Isya';
  } else if (currentSeconds >= prayerList[0].seconds && currentSeconds < prayerList[1].seconds) {
    currentActive = 'Waktu Imsak';
  }

  // Find next upcoming prayer
  let nextPrayer = prayerList.find((p) => p.seconds > currentSeconds);

  // If passed all prayers today (past Isya), the next prayer is Imsak/Subuh tomorrow
  let remainingSec = 0;
  if (nextPrayer) {
    remainingSec = nextPrayer.seconds - currentSeconds;
  } else {
    // Next prayer is tomorrow's Imsak/Subuh
    nextPrayer = prayerList[0]; // Imsak tomorrow
    remainingSec = 86400 - currentSeconds + nextPrayer.seconds;
  }

  const hours = Math.floor(remainingSec / 3600);
  const mins = Math.floor((remainingSec % 3600) / 60);
  const secs = remainingSec % 60;

  let remainingFormatted = '';
  if (hours > 0) {
    remainingFormatted = `${hours}j ${mins}m ${secs}d`;
  } else if (mins > 0) {
    remainingFormatted = `${mins}m ${secs}d`;
  } else {
    remainingFormatted = `${secs}d`;
  }

  return {
    name: nextPrayer.name,
    time: nextPrayer.timeStr,
    remainingSeconds: remainingSec,
    remainingFormatted,
    currentPrayerName: currentActive,
    isPassed: false,
  };
}

export const PRAYER_LOCATION_EVENT = 'pkl_prayer_location_update';
const STORAGE_SAVED_CITY = 'pkl_prayer_saved_city';
const STORAGE_SAVED_GPS = 'pkl_prayer_saved_gps';

/**
 * Dispatch cross-component reactive location event
 */
export function notifyPrayerLocationChanged(loc: PrayerLocation): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PRAYER_LOCATION_EVENT, { detail: loc }));
  }
}

/**
 * Get Saved or Initial Location
 */
export function getSavedPrayerLocation(): PrayerLocation {
  if (typeof window === 'undefined') {
    return {
      lat: INDONESIAN_CITIES[0].latitude,
      lng: INDONESIAN_CITIES[0].longitude,
      locationName: `${INDONESIAN_CITIES[0].name}, ${INDONESIAN_CITIES[0].province}`,
      isGps: false,
    };
  }

  const savedGps = localStorage.getItem(STORAGE_SAVED_GPS);
  if (savedGps) {
    try {
      const parsed = JSON.parse(savedGps);
      if (parsed.lat && parsed.lng) {
        return {
          lat: parsed.lat,
          lng: parsed.lng,
          locationName: parsed.locationName || 'Lokasi GPS Anda',
          isGps: true,
        };
      }
    } catch {}
  }

  const savedCityName = localStorage.getItem(STORAGE_SAVED_CITY);
  if (savedCityName) {
    const found = INDONESIAN_CITIES.find((c) => c.name.toLowerCase() === savedCityName.toLowerCase());
    if (found) {
      return {
        lat: found.latitude,
        lng: found.longitude,
        locationName: `${found.name}, ${found.province}`,
        isGps: false,
      };
    }
  }

  // Default to Jakarta
  return {
    lat: INDONESIAN_CITIES[0].latitude,
    lng: INDONESIAN_CITIES[0].longitude,
    locationName: `${INDONESIAN_CITIES[0].name}, ${INDONESIAN_CITIES[0].province}`,
    isGps: false,
  };
}

export function savePrayerLocation(
  lat: number,
  lng: number,
  locationName: string,
  isGps: boolean
): void {
  if (typeof window === 'undefined') return;
  const newLoc: PrayerLocation = { lat, lng, locationName, isGps };
  if (isGps) {
    localStorage.setItem(
      STORAGE_SAVED_GPS,
      JSON.stringify({ lat, lng, locationName, updatedAt: new Date().toISOString() })
    );
  } else {
    localStorage.removeItem(STORAGE_SAVED_GPS);
    localStorage.setItem(STORAGE_SAVED_CITY, locationName.split(',')[0].trim());
  }
  notifyPrayerLocationChanged(newLoc);
}

/**
 * Reverse Geocode Coordinates to human readable Indonesian city / area name
 */
export async function reverseGeocodeLocation(lat: number, lng: number): Promise<string> {
  try {
    // 1. Try finding closest known Indonesian city first for ultra-fast response
    let closestCity = INDONESIAN_CITIES[0];
    let minDistance = Number.MAX_VALUE;

    for (const city of INDONESIAN_CITIES) {
      const dist = Math.hypot(city.latitude - lat, city.longitude - lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestCity = city;
      }
    }

    // If within ~35km of a major city, use that name
    if (minDistance < 0.35) {
      return `${closestCity.name}, ${closestCity.province}`;
    }

    // 2. Fetch reverse geocode via free BigDataCloud API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision;
      const province = data.principalSubdivision;
      if (city && province && city !== province) {
        return `${city}, ${province}`;
      } else if (city || province) {
        return city || province;
      }
    }
  } catch {}

  return `Koordinat (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
}

/**
 * Fetch online prayer times from Aladhan API with automatic offline calculation fallback
 */
export async function fetchOnlinePrayerTimes(
  lat: number,
  lng: number,
  date: Date = new Date()
): Promise<PrayerTimes | null> {
  try {
    const timestamp = Math.floor(date.getTime() / 1000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    // Method 20 = Kemenag RI (Kementerian Agama RI)
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=20`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.timings) {
        const t = data.data.timings;
        return {
          imsak: t.Imsak ? t.Imsak.slice(0, 5) : '',
          subuh: t.Fajr ? t.Fajr.slice(0, 5) : '',
          terbit: t.Sunrise ? t.Sunrise.slice(0, 5) : '',
          dhuha: t.Sunrise
            ? (() => {
                const [h, m] = t.Sunrise.split(':').map(Number);
                const tot = (h * 60 + m + 22) % 1440;
                return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(
                  tot % 60
                ).padStart(2, '0')}`;
              })()
            : '',
          dzuhur: t.Dhuhr ? t.Dhuhr.slice(0, 5) : '',
          ashar: t.Asr ? t.Asr.slice(0, 5) : '',
          maghrib: t.Maghrib ? t.Maghrib.slice(0, 5) : '',
          isya: t.Isha ? t.Isha.slice(0, 5) : '',
        };
      }
    }
  } catch {}

  return null;
}

/**
 * Custom React Hook for Realtime Prayer Times synchronized across the entire app
 */
export function usePrayerTimes() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [locationState, setLocationState] = useState<PrayerLocation>(() => getSavedPrayerLocation());

  // Realtime clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for instant location changes from any component without page reload
  useEffect(() => {
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent<PrayerLocation>;
      if (customEvent.detail) {
        setLocationState(customEvent.detail);
      } else {
        setLocationState(getSavedPrayerLocation());
      }
    };

    window.addEventListener(PRAYER_LOCATION_EVENT, handleLocationChange);
    window.addEventListener('storage', handleLocationChange);

    return () => {
      window.removeEventListener(PRAYER_LOCATION_EVENT, handleLocationChange);
      window.removeEventListener('storage', handleLocationChange);
    };
  }, []);

  const prayerTimes: PrayerTimes = useMemo(() => {
    return calculateKemenagPrayerTimes(currentDate, locationState.lat, locationState.lng);
  }, [currentDate, locationState.lat, locationState.lng]);

  const countdown: NextPrayerInfo = useMemo(() => {
    return getNextPrayerCountdown(prayerTimes, currentDate);
  }, [prayerTimes, currentDate]);

  const hijriFormatted: string = useMemo(() => {
    return getEstimatedHijriDate(currentDate);
  }, [currentDate]);

  const qiblaAngle: number = useMemo(() => {
    return calculateQiblaDirection(locationState.lat, locationState.lng);
  }, [locationState.lat, locationState.lng]);

  const shortLocation = useMemo(() => {
    return locationState.locationName.split(',')[0].trim();
  }, [locationState.locationName]);

  return {
    currentDate,
    locationState,
    setLocationState,
    prayerTimes,
    countdown,
    hijriFormatted,
    qiblaAngle,
    shortLocation,
  };
}

export interface PrayerReminderConfig {
  enabled: boolean; // Master On / Off switch
  soundEnabled: boolean; // Audio chime On / Off switch
  popupEnabled: boolean; // Modal Pop-up On / Off switch
  notifySubuh: boolean;
  notifyDzuhur: boolean;
  notifyAshar: boolean;
  notifyMaghrib: boolean;
  notifyIsya: boolean;
  notifyImsak: boolean;
}

export interface PrayerAlertPayload {
  prayerName: string;
  prayerTime: string;
  isTest?: boolean;
  locationName?: string;
  hijriDate?: string;
}

export const PRAYER_REMINDER_CONFIG_EVENT = 'pkl_prayer_reminder_config_update';
export const PRAYER_ALERT_EVENT = 'pkl_prayer_alert_trigger';
export const STORAGE_PRAYER_REMINDER_CONFIG = 'pkl_prayer_reminder_config';
export const STORAGE_PRAYER_LAST_ALERT = 'pkl_prayer_last_alert_key';

export const DEFAULT_PRAYER_REMINDER_CONFIG: PrayerReminderConfig = {
  enabled: true,
  soundEnabled: true,
  popupEnabled: true,
  notifySubuh: true,
  notifyDzuhur: true,
  notifyAshar: true,
  notifyMaghrib: true,
  notifyIsya: true,
  notifyImsak: false,
};

export function getSavedPrayerReminderConfig(): PrayerReminderConfig {
  if (typeof window === 'undefined') {
    return DEFAULT_PRAYER_REMINDER_CONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_PRAYER_REMINDER_CONFIG);
    if (!raw) return DEFAULT_PRAYER_REMINDER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : true,
      soundEnabled: parsed.soundEnabled !== undefined ? Boolean(parsed.soundEnabled) : true,
      popupEnabled: parsed.popupEnabled !== undefined ? Boolean(parsed.popupEnabled) : true,
      notifySubuh: parsed.notifySubuh !== undefined ? Boolean(parsed.notifySubuh) : true,
      notifyDzuhur: parsed.notifyDzuhur !== undefined ? Boolean(parsed.notifyDzuhur) : true,
      notifyAshar: parsed.notifyAshar !== undefined ? Boolean(parsed.notifyAshar) : true,
      notifyMaghrib: parsed.notifyMaghrib !== undefined ? Boolean(parsed.notifyMaghrib) : true,
      notifyIsya: parsed.notifyIsya !== undefined ? Boolean(parsed.notifyIsya) : true,
      notifyImsak: parsed.notifyImsak !== undefined ? Boolean(parsed.notifyImsak) : false,
    };
  } catch {
    return DEFAULT_PRAYER_REMINDER_CONFIG;
  }
}

export function savePrayerReminderConfig(config: Partial<PrayerReminderConfig>): PrayerReminderConfig {
  const current = getSavedPrayerReminderConfig();
  const updated: PrayerReminderConfig = { ...current, ...config };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_PRAYER_REMINDER_CONFIG, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(PRAYER_REMINDER_CONFIG_EVENT, { detail: updated }));
    } catch {}
  }
  return updated;
}

export function triggerPrayerAlert(payload: PrayerAlertPayload): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PRAYER_ALERT_EVENT, { detail: payload }));
  }
}

export function triggerTestPrayerAlert(prayerName = 'Dzuhur', prayerTime = '12:05'): void {
  triggerPrayerAlert({
    prayerName,
    prayerTime,
    isTest: true,
  });
}
