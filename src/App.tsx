/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  INITIAL_USERS,
  INITIAL_DUDI,
  INITIAL_GURU,
  INITIAL_SISWA,
  INITIAL_PRESENSI,
  INITIAL_JURNAL,
  INITIAL_FONNTE_CONFIG,
  INITIAL_LOGS,
  INITIAL_KUNJUNGAN_GURU,
} from './data/initialData';
import {
  User,
  Role,
  Siswa,
  DUDI,
  GuruPembimbing,
  Presensi,
  JurnalHarian,
  StatusValidasiJurnal,
  StatusPersetujuanDudi,
  KunjunganGuru,
  FonnteConfig,
  LogAktivitas,
  KategoriAktivitas,
  StatusAktivitas,
} from './types';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { PresensiCerdas } from './components/PresensiCerdas';
import { PresensiKunjunganGuru } from './components/PresensiKunjunganGuru';
import { PersetujuanPresensiDUDI } from './components/PersetujuanPresensiDUDI';
import { JurnalKegiatan } from './components/JurnalKegiatan';
import { MasterDataAdmin } from './components/MasterDataAdmin';
import { StatistikDataAdmin } from './components/StatistikDataAdmin';
import { StatistikKehadiranSiswa } from './components/StatistikKehadiranSiswa';
import { LaporanPresensi } from './components/LaporanPresensi';
import { LogAktivitasViewer } from './components/LogAktivitasViewer';
import { InfoPKLSiswa } from './components/InfoPKLSiswa';
import { ProfilIndustriDUDI } from './components/ProfilIndustriDUDI';
import { ArsitekturCodeViewer } from './components/ArsitekturCodeViewer';
import { WhatsAppFonnteModal } from './components/WhatsAppFonnteModal';
import { ProfilDetailSiswaModal } from './components/ProfilDetailSiswaModal';
import { DatabaseModal } from './components/DatabaseModal';
import { formatWhatsAppMessage, sendFonnteNotification } from './utils/fonnte';
import { getCachedAccessToken, isGoogleDriveLinked } from './services/googleAuth';
import {
  getOfflineQueue,
  saveToOfflineQueue,
  savePresensiToDatabase,
  syncOfflinePresensiToDatabase,
} from './services/offlinePresensiService';
import { executeUnifiedPresensiSave } from './services/unifiedStorageService';
import { getInitialTheme, applyTheme } from './utils/theme';
import {
  fetchSiswaFromDb,
  saveSiswaToDb,
  deleteSiswaFromDb,
  fetchDudiFromDb,
  saveDudiToDb,
  fetchPresensiFromDb,
  savePresensiToDb,
  fetchJurnalFromDb,
  saveJurnalToDb,
  checkDbConnection,
  DbStatusResponse,
} from './utils/apiService';

import {
  getStoredSession,
  saveUserSession,
  clearUserSession,
  getStoredActiveTab,
  saveActiveTab,
  ROLE_ALLOWED_TABS,
} from './utils/sessionManager';

export default function App() {
  // Ambil sesi autentikasi awal yang persisten dari multi-tier storage (localStorage, sessionStorage, cookie)
  const initialSession = useMemo(() => getStoredSession(), []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => initialSession.isAuthenticated
  );

  const [currentUser, setCurrentUser] = useState<User>(() => {
    if (initialSession.user) {
      return initialSession.user;
    }
    return INITIAL_USERS[0]; // Budi Santoso (Admin)
  });

  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(() => {
    return isGoogleDriveLinked();
  });

  // State Status Koneksi Backend & Database MySQL / TiDB
  const [dbStatus, setDbStatus] = useState<DbStatusResponse | null>(null);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState<boolean>(false);

  const refreshDbStatus = useCallback(async () => {
    try {
      const res = await checkDbConnection();
      setDbStatus(res);
    } catch {
      setDbStatus({
        connected: false,
        configured: false,
        message: 'Server backend offline',
      });
    }
  }, []);

  useEffect(() => {
    refreshDbStatus();
    const interval = setInterval(refreshDbStatus, 25000);
    return () => clearInterval(interval);
  }, [refreshDbStatus]);

  // Dark Mode / Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(getInitialTheme);

  useEffect(() => {
    applyTheme(isDarkMode);
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Internet Connectivity & Offline Sync State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingOfflineQueue, setPendingOfflineQueue] = useState<Presensi[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Global States with realistic initial datasets & resilient localStorage persistence
  const [siswaList, setSiswaList] = useState<Siswa[]>(() => {
    try {
      const saved = localStorage.getItem('pkl_siswa_list');
      return saved ? JSON.parse(saved) : INITIAL_SISWA;
    } catch {
      return INITIAL_SISWA;
    }
  });

  const [dudiList, setDudiList] = useState<DUDI[]>(() => {
    try {
      const saved = localStorage.getItem('pkl_dudi_list');
      return saved ? JSON.parse(saved) : INITIAL_DUDI;
    } catch {
      return INITIAL_DUDI;
    }
  });

  const [guruList, setGuruList] = useState<GuruPembimbing[]>(() => {
    try {
      const saved = localStorage.getItem('pkl_guru_list');
      return saved ? JSON.parse(saved) : INITIAL_GURU;
    } catch {
      return INITIAL_GURU;
    }
  });

  const [presensiList, setPresensiList] = useState<Presensi[]>(() => {
    try {
      const saved = localStorage.getItem('pkl_presensi_list');
      return saved ? JSON.parse(saved) : INITIAL_PRESENSI;
    } catch {
      return INITIAL_PRESENSI;
    }
  });

  const [jurnalList, setJurnalList] = useState<JurnalHarian[]>(() => {
    try {
      const saved = localStorage.getItem('pkl_jurnal_list');
      return saved ? JSON.parse(saved) : INITIAL_JURNAL;
    } catch {
      return INITIAL_JURNAL;
    }
  });

  const [kunjunganGuruList, setKunjunganGuruList] = useState<KunjunganGuru[]>(() => {
    try {
      const saved = localStorage.getItem('kunjungan_guru_list');
      return saved ? JSON.parse(saved) : INITIAL_KUNJUNGAN_GURU;
    } catch {
      return INITIAL_KUNJUNGAN_GURU;
    }
  });

  const [fonnteConfig, setFonnteConfig] = useState<FonnteConfig>(() => {
    try {
      const saved = localStorage.getItem('pkl_fonnte_config');
      return saved ? JSON.parse(saved) : INITIAL_FONNTE_CONFIG;
    } catch {
      return INITIAL_FONNTE_CONFIG;
    }
  });

  const [logs, setLogs] = useState<LogAktivitas[]>(() => {
    try {
      const saved = localStorage.getItem('pkl_system_logs');
      return saved ? JSON.parse(saved) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  // Simpan data master ke localStorage saat ada perubahan
  useEffect(() => {
    try { localStorage.setItem('pkl_siswa_list', JSON.stringify(siswaList)); } catch (e) { /* silent */ }
  }, [siswaList]);

  useEffect(() => {
    try { localStorage.setItem('pkl_dudi_list', JSON.stringify(dudiList)); } catch (e) { /* silent */ }
  }, [dudiList]);

  useEffect(() => {
    try { localStorage.setItem('pkl_guru_list', JSON.stringify(guruList)); } catch (e) { /* silent */ }
  }, [guruList]);

  useEffect(() => {
    try { localStorage.setItem('pkl_presensi_list', JSON.stringify(presensiList)); } catch (e) { /* silent */ }
  }, [presensiList]);

  useEffect(() => {
    try { localStorage.setItem('pkl_jurnal_list', JSON.stringify(jurnalList)); } catch (e) { /* silent */ }
  }, [jurnalList]);

  useEffect(() => {
    try { localStorage.setItem('kunjungan_guru_list', JSON.stringify(kunjunganGuruList)); } catch (e) { /* silent */ }
  }, [kunjunganGuruList]);

  useEffect(() => {
    try { localStorage.setItem('pkl_fonnte_config', JSON.stringify(fonnteConfig)); } catch (e) { /* silent */ }
  }, [fonnteConfig]);

  useEffect(() => {
    try { localStorage.setItem('pkl_system_logs', JSON.stringify(logs.slice(0, 100))); } catch (e) { /* silent */ }
  }, [logs]);

  // Tab Navigasi Aktif dengan dual-persistence (URL Hash + Storage tiers)
  const [activeTab, setActiveTab] = useState<string>(() => {
    const role: Role = initialSession.user ? initialSession.user.role : 'Admin';
    return getStoredActiveTab(role);
  });

  // Sinkronkan activeTab ke storage dan URL Hash setiap kali berpindah tab
  useEffect(() => {
    saveActiveTab(activeTab);
  }, [activeTab]);

  // Pantau perubahan hash URL (misal tombol Back / Forward di browser)
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace('#', '').trim();
      const mainHash = rawHash.split('/')[0].split('?')[0];
      const allowed = ROLE_ALLOWED_TABS[currentUser.role] || ['presensi'];
      if (mainHash && allowed.includes(mainHash) && mainHash !== activeTab) {
        setActiveTab(mainHash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentUser.role, activeTab]);

  // Simpan sesi autentikasi dan data user ke multi-tier storage jika user aktif
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      saveUserSession(currentUser);
    }
  }, [isAuthenticated, currentUser]);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState<boolean>(false);
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState<boolean>(false);
  const [selectedSiswaDetail, setSelectedSiswaDetail] = useState<Siswa | null>(null);
  const [isProfilDetailModalOpen, setIsProfilDetailModalOpen] = useState<boolean>(false);

  const handleOpenSiswaDetail = (siswa: Siswa) => {
    setSelectedSiswaDetail(siswa);
    setIsProfilDetailModalOpen(true);
    addLog(
      'Sistem',
      'Lihat Detail Siswa',
      `Membuka profil detail dan riwayat presensi individual siswa: ${siswa.nama_lengkap} (${siswa.nis}).`,
      'Sukses',
      currentUser
    );
  };

  const handleCloseSiswaDetail = () => {
    setIsProfilDetailModalOpen(false);
  };

  // Log Helper
  const addLog = (
    kategori: KategoriAktivitas,
    aksi: string,
    deskripsi: string,
    status: StatusAktivitas = 'Sukses',
    user?: User,
    ip_device?: string
  ) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const formattedWaktu = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const actor = user || currentUser;
    const newLogEntry: LogAktivitas = {
      id_log: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      waktu: formattedWaktu,
      kategori,
      aksi,
      deskripsi,
      pengguna: actor ? actor.nama_lengkap : 'Sistem PKL',
      role: actor ? actor.role : 'Admin',
      status,
      ip_device: ip_device || 'Web Browser Client',
    };

    setLogs((prev) => [newLogEntry, ...prev]);
  };

  // Inisialisasi status koneksi Google Drive saat aplikasi dimuat
  useEffect(() => {
    setIsGoogleConnected(isGoogleDriveLinked());
  }, []);

  // Initialize offline queue from localStorage on mount
  useEffect(() => {
    setPendingOfflineQueue(getOfflineQueue());
  }, []);

  // Memuat data terbaru dari Backend MySQL jika database online terhubung
  useEffect(() => {
    let isMounted = true;
    const loadFromDatabase = async () => {
      try {
        const [dbSiswa, dbDudi, dbPresensi, dbJurnal] = await Promise.all([
          fetchSiswaFromDb(),
          fetchDudiFromDb(),
          fetchPresensiFromDb(),
          fetchJurnalFromDb(),
        ]);

        if (!isMounted) return;

        if (dbSiswa && dbSiswa.length > 0) {
          setSiswaList(dbSiswa);
        }
        if (dbDudi && dbDudi.length > 0) {
          setDudiList(dbDudi);
        }
        if (dbPresensi && dbPresensi.length > 0) {
          setPresensiList(dbPresensi);
        }
        if (dbJurnal && dbJurnal.length > 0) {
          setJurnalList(dbJurnal);
        }
      } catch (err) {
        console.info('Penyimpanan lokal aktif (MySQL online standby).');
      }
    };

    loadFromDatabase();
    return () => {
      isMounted = false;
    };
  }, []);

  // Function to sync offline presensi queue to Firebase Firestore
  const triggerSyncToFirebase = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncToastMessage('Tidak dapat menyinkronkan: Perangkat sedang dalam mode offline.');
      setTimeout(() => setSyncToastMessage(null), 4000);
      return;
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
      setPendingOfflineQueue([]);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncOfflinePresensiToDatabase((synced) => {
        setPresensiList((prev) =>
          prev.map((p) =>
            p.id_presensi === synced.id_presensi
              ? {
                  ...p,
                  is_offline_pending: false,
                  synced_to_db: true,
                  synced_to_firebase: true,
                  synced_at: synced.synced_at,
                }
              : p
          )
        );
      });

      const remaining = getOfflineQueue();
      setPendingOfflineQueue(remaining);

      if (result.successCount > 0) {
        addLog(
          'Presensi',
          'Sinkronisasi Database Berhasil',
          `Koneksi pulih. Berhasil mengirim ${result.successCount} data presensi offline dari perangkat ke Database MySQL / TiDB Cloud.`,
          'Sukses',
          currentUser,
          'Database Cloud Sync'
        );
        setSyncToastMessage(
          `Koneksi stabil! ${result.successCount} data presensi berhasil disinkronkan ke Database MySQL/TiDB.`
        );
        setTimeout(() => setSyncToastMessage(null), 6000);
      }
    } catch (err: any) {
      console.error('Error saat menyinkronkan data offline ke database:', err);
      addLog(
        'Presensi',
        'Sinkronisasi Database Tertunda',
        `Gagal menyinkronkan: ${err?.message || 'Koneksi terganggu'}. Data tetap aman tersimpan di perangkat lokal.`,
        'Peringatan',
        currentUser,
        'Firebase Sync Error'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Listen to network connectivity changes (online & offline)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog(
        'Autentikasi',
        'Koneksi Internet Pulih (Online)',
        'Perangkat kembali terhubung ke internet. Memulai sinkronisasi otomatis data presensi ke Firebase Firestore...',
        'Sukses',
        currentUser,
        'Network Online Event'
      );
      triggerSyncToFirebase();
    };

    const handleOffline = () => {
      setIsOnline(false);
      addLog(
        'Autentikasi',
        'Koneksi Internet Terputus (Offline)',
        'Perangkat beralih ke Mode Offline. Presensi baru akan otomatis disimpan sementara ke localStorage.',
        'Peringatan',
        currentUser,
        'Network Offline Event'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If online on initial load and there are pending items, sync them
    if (typeof navigator !== 'undefined' && navigator.onLine && getOfflineQueue().length > 0) {
      triggerSyncToFirebase();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  // Login handler
  const handleLoginSuccess = (user: User, googleConnected = false) => {
    // Simpan sesi autentikasi secara sinkron ke seluruh storage tier (localStorage, sessionStorage, cookie)
    saveUserSession(user);
    setCurrentUser(user);
    setIsAuthenticated(true);
    
    // Tentukan tab aktif (gunakan tab tersimpan/hash yang valid untuk role ini)
    const targetTab = getStoredActiveTab(user.role);
    setActiveTab(targetTab);
    saveActiveTab(targetTab);

    setIsGoogleConnected(googleConnected || isGoogleDriveLinked());
    addLog(
      'Autentikasi',
      'Login Akun Berhasil',
      `${user.nama_lengkap} berhasil masuk ke sistem sebagai ${user.role}.`,
      'Sukses',
      user,
      'Autentikasi Form Sekolah'
    );
  };

  // Strict Role-Based Access Control (RBAC): Ensure activeTab is strictly allowed for current role
  useEffect(() => {
    if (!isAuthenticated) return;
    const allowed = ROLE_ALLOWED_TABS[currentUser.role] || ['presensi'];
    if (!allowed.includes(activeTab)) {
      const fallbackTab = allowed[0] || 'presensi';
      setActiveTab(fallbackTab);
      saveActiveTab(fallbackTab);
    }
  }, [isAuthenticated, currentUser.role, activeTab]);

  // Logout handler
  const handleLogout = async () => {
    addLog(
      'Autentikasi',
      'Keluar Akun (Logout)',
      `${currentUser.nama_lengkap} keluar dari sesi aplikasi.`,
      'Info',
      currentUser
    );
    clearUserSession();
    // Tautan Google Drive tetap tersimpan dan tidak terputus saat logout dari aplikasi
    setIsAuthenticated(false);
  };

  // Switch role helper
  const handleRoleChange = (newRole: Role) => {
    let targetUser: User | undefined;
    if (newRole === 'Admin') {
      targetUser = INITIAL_USERS.find((u) => u.role === 'Admin');
    } else if (newRole === 'Guru Pembimbing') {
      targetUser = INITIAL_USERS.find((u) => u.role === 'Guru Pembimbing');
    } else if (newRole === 'DUDI') {
      targetUser = INITIAL_USERS.find((u) => u.role === 'DUDI');
    } else {
      targetUser = INITIAL_USERS.find((u) => u.role === 'Siswa');
    }
    if (targetUser) {
      saveUserSession(targetUser);
      setCurrentUser(targetUser);
      // Ensure active tab is valid for the newly selected role
      const allowed = ROLE_ALLOWED_TABS[newRole] || ['presensi'];
      if (!allowed.includes(activeTab)) {
        const fallbackTab = allowed[0] || 'presensi';
        setActiveTab(fallbackTab);
        saveActiveTab(fallbackTab);
      }
      addLog(
        'Sistem',
        'Ganti Peran Pengguna',
        `Beralih ke peran ${newRole} sebagai ${targetUser.nama_lengkap}.`,
        'Sukses',
        targetUser
      );
    }
  };

  // Presensi Handler: Menyimpan ke Google Drive (foto), Database MySQL / TiDB Cloud, dan antrean offline
  const handleSavePresensi = async (presensi: Presensi, sendWA: boolean) => {
    const activeSiswa = siswaList.find((s) => s.id_siswa === presensi.id_siswa);
    const studentName = activeSiswa?.nama_lengkap || currentUser?.nama_lengkap || 'Siswa';

    // Eksekusi Pipeline Penyimpanan Terpadu (Google Drive -> MySQL/TiDB -> Offline Queue jika gagal)
    const { presensi: savedPresensi, report } = await executeUnifiedPresensiSave(presensi, studentName);

    // Update state tampilan data presensi lokal
    setPresensiList((prev) => {
      const existingIdx = prev.findIndex((p) => p.id_presensi === savedPresensi.id_presensi);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = savedPresensi;
        return next;
      }
      return [savedPresensi, ...prev];
    });

    // Perbarui counter offline queue jika tersimpan secara offline
    if (savedPresensi.is_offline_pending) {
      setPendingOfflineQueue(getOfflineQueue());
      setSyncToastMessage(
        'Mode Offline: Presensi berhasil disimpan di perangkat. Akan otomatis disinkronkan ke Google Drive & Database MySQL saat online.'
      );
      setTimeout(() => setSyncToastMessage(null), 7000);
    }

    // Catat log aktivitas sistem dengan detail status Drive & TiDB/MySQL
    let logDetail = `Presensi ${savedPresensi.status} (${savedPresensi.jam_masuk || savedPresensi.jam_pulang || ''}).`;
    if (report.driveSuccess) {
      logDetail += ' Foto tersimpan di Google Drive (OAuth).';
    }
    if (report.databaseSuccess) {
      logDetail += ` Data tercatat di MySQL/TiDB Cloud.`;
    } else {
      logDetail += ` Data disimpan di cache offline lokal perangkat.`;
    }

    addLog(
      'Presensi',
      savedPresensi.jam_pulang ? 'Presensi Pulang' : 'Presensi Masuk',
      logDetail,
      report.databaseSuccess ? (savedPresensi.koordinat_absen.dalam_radius ? 'Sukses' : 'Peringatan') : 'Peringatan',
      currentUser,
      report.databaseSuccess ? (report.driveSuccess ? 'Drive + TiDB/MySQL' : 'TiDB/MySQL') : 'Offline Cache'
    );

    // Handle WhatsApp Dispatch via Fonnte (if online)
    if (sendWA && (fonnteConfig.autoNotifyParentOnAbsence || fonnteConfig.autoNotifyOnCheckIn)) {
      const siswa = siswaList.find((s) => s.id_siswa === presensi.id_siswa);
      const dudi = siswa ? dudiList.find((d) => d.id_dudi === siswa.id_dudi) : null;
      if (siswa && dudi) {
        try {
          const message = formatWhatsAppMessage(presensi, siswa, dudi);
          const targetPhone =
            presensi.status !== 'Hadir' ? siswa.nomor_wa_ortu : siswa.nomor_wa;
          await sendFonnteNotification(targetPhone, message, fonnteConfig.apiKey);
          addLog(
            'WhatsApp',
            'Notifikasi WhatsApp Dispatched',
            `Notifikasi presensi berhasil dikirim ke nomor ${targetPhone} via Fonnte Gateway.`,
            'Sukses',
            currentUser,
            'Fonnte WA Gateway'
          );
        } catch (waErr) {
          console.warn('Gagal kirim WA:', waErr);
        }
      }
    }
  };

  // Jurnal Handlers
  const handleSaveJurnal = (jurnal: JurnalHarian) => {
    setJurnalList((prev) => [jurnal, ...prev]);

    // Simpan ke database MySQL Online jika aktif
    saveJurnalToDb(jurnal).catch(console.error);

    addLog(
      'Jurnal',
      'Pengisian Jurnal PKL',
      `Siswa mengisi jurnal kegiatan baru untuk tanggal ${jurnal.tanggal}.`,
      'Sukses',
      currentUser
    );
  };

  const handleUpdateStatusJurnal = (
    idJurnal: string,
    reviewerRole: 'Guru Pembimbing' | 'DUDI',
    status: StatusValidasiJurnal,
    catatan: string
  ) => {
    const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setJurnalList((prev) =>
      prev.map((j) => {
        if (j.id_jurnal !== idJurnal) return j;
        if (reviewerRole === 'DUDI') {
          return {
            ...j,
            status_validasi_dudi: status,
            catatan_dudi: catatan,
            validated_dudi_at: timeNow,
            nama_dudi_penilai: currentUser.nama_lengkap,
          };
        } else {
          return {
            ...j,
            status_validasi_guru: status,
            catatan_guru: catatan,
            validated_at: timeNow,
            nama_guru_penilai: currentUser.nama_lengkap,
          };
        }
      })
    );
    addLog(
      'Jurnal',
      `Validasi Jurnal oleh ${reviewerRole}`,
      `Jurnal ID ${idJurnal} divalidasi dengan status "${status}" oleh ${currentUser.nama_lengkap}. Catatan: "${catatan || '-'}"`,
      'Sukses',
      currentUser
    );
  };

  // Kunjungan Guru Handler
  const handleSaveKunjunganGuru = (kunjungan: KunjunganGuru) => {
    setKunjunganGuruList((prev) => [kunjungan, ...prev]);
    addLog(
      'Presensi',
      'Presensi Kunjungan Guru DUDI',
      `Guru ${kunjungan.nama_guru} mencatat presensi kunjungan supervisi ke ${kunjungan.nama_dudi} (${kunjungan.jam_kunjungan} WIB).`,
      'Sukses',
      currentUser
    );
  };

  // Persetujuan Presensi Siswa oleh DUDI
  const handleApprovePresensiDudi = (
    idPresensi: string,
    status: StatusPersetujuanDudi,
    catatanDudi: string
  ) => {
    const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setPresensiList((prev) =>
      prev.map((p) =>
        p.id_presensi === idPresensi
          ? {
              ...p,
              status_persetujuan_dudi: status,
              catatan_dudi: catatanDudi,
              disetujui_dudi_pada: timeNow,
              nama_pembimbing_dudi: currentUser.nama_lengkap,
            }
          : p
      )
    );
    addLog(
      'Presensi',
      'Persetujuan Presensi Siswa DUDI',
      `Pembimbing DUDI ${currentUser.nama_lengkap} menetapkan status ${status} untuk presensi ${idPresensi}. Catatan: "${catatanDudi || '-'}"`,
      'Sukses',
      currentUser
    );
  };

  // Master Data Handlers
  const handleSaveSiswa = (siswa: Siswa) => {
    setSiswaList((prev) => {
      const idx = prev.findIndex((s) => s.id_siswa === siswa.id_siswa);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = siswa;
        return next;
      }
      return [...prev, siswa];
    });

    // Simpan ke database MySQL backend online jika server aktif
    saveSiswaToDb(siswa).then((success) => {
      if (success) {
        addLog(
          'Master Data',
          'Sinkronisasi Siswa ke MySQL',
          `Data siswa ${siswa.nama_lengkap} (NIS: ${siswa.nis}) berhasil disimpan ke database MySQL online.`,
          'Sukses',
          currentUser,
          'MySQL Database'
        );
      }
    });
  };

  const handleDeleteSiswa = (id_siswa: string) => {
    setSiswaList((prev) => prev.filter((s) => s.id_siswa !== id_siswa));
    deleteSiswaFromDb(id_siswa).catch(console.error);
  };

  const handleSaveDUDI = (dudi: DUDI) => {
    setDudiList((prev) => {
      const idx = prev.findIndex((d) => d.id_dudi === dudi.id_dudi);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = dudi;
        return next;
      }
      return [...prev, dudi];
    });

    // Simpan ke database MySQL backend online
    saveDudiToDb(dudi).catch(console.error);
  };

  const handleDeleteDUDI = (id_dudi: string) => {
    setDudiList((prev) => prev.filter((d) => d.id_dudi !== id_dudi));
  };

  const handleSaveGuru = (guru: GuruPembimbing) => {
    setGuruList((prev) => {
      const idx = prev.findIndex((g) => g.id_guru === guru.id_guru);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = guru;
        return next;
      }
      return [...prev, guru];
    });
  };

  const handleDeleteGuru = (id_guru: string) => {
    setGuruList((prev) => prev.filter((g) => g.id_guru !== id_guru));
  };

  // Bulk Import Handlers
  const handleImportSiswa = (newItems: Siswa[]) => {
    setSiswaList((prev) => {
      const copy = [...prev];
      newItems.forEach((item) => {
        const idx = copy.findIndex(
          (s) => s.id_siswa === item.id_siswa || (s.nis && item.nis && s.nis === item.nis)
        );
        if (idx >= 0) {
          copy[idx] = item;
        } else {
          copy.push(item);
        }
      });
      return copy;
    });
  };

  const handleImportDUDI = (newItems: DUDI[]) => {
    setDudiList((prev) => {
      const copy = [...prev];
      newItems.forEach((item) => {
        const idx = copy.findIndex(
          (d) =>
            d.id_dudi === item.id_dudi ||
            d.nama_instansi.toLowerCase().trim() === item.nama_instansi.toLowerCase().trim()
        );
        if (idx >= 0) {
          copy[idx] = item;
        } else {
          copy.push(item);
        }
      });
      return copy;
    });
  };

  const handleImportGuru = (newItems: GuruPembimbing[]) => {
    setGuruList((prev) => {
      const copy = [...prev];
      newItems.forEach((item) => {
        const idx = copy.findIndex(
          (g) =>
            g.id_guru === item.id_guru ||
            (g.nip && item.nip && g.nip.trim() === item.nip.trim()) ||
            g.nama_guru.toLowerCase().trim() === item.nama_guru.toLowerCase().trim()
        );
        if (idx >= 0) {
          copy[idx] = item;
        } else {
          copy.push(item);
        }
      });
      return copy;
    });
  };

  // If not authenticated, render modern Login Page
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onOpenWhatsAppHelp={() => setIsWhatsAppModalOpen(true)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
        <WhatsAppFonnteModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          config={fonnteConfig}
          onSaveConfig={setFonnteConfig}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200">
      {/* App Header & Navigation */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        onOpenGoogleDrive={() => setIsGoogleDriveModalOpen(true)}
        onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
        dbStatus={dbStatus}
        onLogout={handleLogout}
        isGoogleConnected={isGoogleConnected}
        isOnline={isOnline}
        pendingOfflineCount={pendingOfflineQueue.length}
        onTriggerSync={triggerSyncToFirebase}
        isSyncing={isSyncing}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenProfilSiswa={() => {
          const selfSiswa =
            siswaList.find(
              (s) =>
                s.id_siswa === currentUser.id_user ||
                s.nama_lengkap.toLowerCase() === currentUser.nama_lengkap.toLowerCase()
            ) || siswaList[0];
          if (selfSiswa) handleOpenSiswaDetail(selfSiswa);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5">
        {activeTab === 'presensi' && (
          currentUser.role === 'Guru Pembimbing' ? (
            <PresensiKunjunganGuru
              currentUser={currentUser}
              dudiList={dudiList}
              siswaList={siswaList}
              presensiList={presensiList}
              kunjunganList={kunjunganGuruList}
              onSaveKunjungan={handleSaveKunjunganGuru}
              onSelectSiswaDetail={handleOpenSiswaDetail}
            />
          ) : currentUser.role === 'DUDI' ? (
            <PersetujuanPresensiDUDI
              currentUser={currentUser}
              dudiList={dudiList}
              siswaList={siswaList}
              presensiList={presensiList}
              onApprovePresensi={handleApprovePresensiDudi}
              onSelectSiswaDetail={handleOpenSiswaDetail}
            />
          ) : currentUser.role === 'Admin' ? (
            <StatistikDataAdmin
              currentUser={currentUser}
              siswaList={siswaList}
              dudiList={dudiList}
              guruList={guruList}
              presensiList={presensiList}
              jurnalList={jurnalList}
              kunjunganList={kunjunganGuruList}
              onSelectSiswaDetail={handleOpenSiswaDetail}
              onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          ) : (
            <PresensiCerdas
              currentUser={currentUser}
              siswaList={siswaList}
              dudiList={dudiList}
              presensiList={presensiList}
              onSavePresensi={handleSavePresensi}
              onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
              isOnline={isOnline}
              pendingOfflineCount={pendingOfflineQueue.length}
              onTriggerSync={triggerSyncToFirebase}
              isSyncing={isSyncing}
              onSelectSiswaDetail={handleOpenSiswaDetail}
            />
          )
        )}

        {activeTab === 'statistik' && currentUser.role === 'Siswa' && (
          <StatistikKehadiranSiswa
            currentUser={currentUser}
            siswaList={siswaList}
            dudiList={dudiList}
            guruList={guruList}
            presensiList={presensiList}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSelectSiswaDetail={handleOpenSiswaDetail}
          />
        )}

        {activeTab === 'jurnal' && (
          <JurnalKegiatan
            currentUser={currentUser}
            siswaList={siswaList}
            jurnalList={jurnalList}
            onSaveJurnal={handleSaveJurnal}
            onUpdateStatusJurnal={handleUpdateStatusJurnal}
            onSelectSiswaDetail={handleOpenSiswaDetail}
          />
        )}

        {activeTab === 'master' && currentUser.role === 'Admin' && (
          <MasterDataAdmin
            currentUser={currentUser}
            siswaList={siswaList}
            dudiList={dudiList}
            guruList={guruList}
            onSaveSiswa={handleSaveSiswa}
            onDeleteSiswa={handleDeleteSiswa}
            onSaveDUDI={handleSaveDUDI}
            onDeleteDUDI={handleDeleteDUDI}
            onSaveGuru={handleSaveGuru}
            onDeleteGuru={handleDeleteGuru}
            onImportSiswa={handleImportSiswa}
            onImportDUDI={handleImportDUDI}
            onImportGuru={handleImportGuru}
            onSelectSiswaDetail={handleOpenSiswaDetail}
            onOpenDatabaseDetails={() => setIsDatabaseModalOpen(true)}
          />
        )}

        {activeTab === 'laporan' && (
          <LaporanPresensi
            currentUser={currentUser}
            siswaList={siswaList}
            dudiList={dudiList}
            guruList={guruList}
            presensiList={presensiList}
            onSelectSiswaDetail={handleOpenSiswaDetail}
          />
        )}

        {activeTab === 'info-pkl' && currentUser.role === 'Siswa' && (
          <InfoPKLSiswa
            currentUser={currentUser}
            siswaList={siswaList}
            dudiList={dudiList}
            guruList={guruList}
            presensiList={presensiList}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'info-dudi' && currentUser.role === 'DUDI' && (
          <ProfilIndustriDUDI
            currentUser={currentUser}
            dudiList={dudiList}
            siswaList={siswaList}
            guruList={guruList}
            presensiList={presensiList}
            onSelectSiswaDetail={handleOpenSiswaDetail}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'log-aktivitas' && (currentUser.role === 'Admin' || currentUser.role === 'Guru Pembimbing') && (
          <LogAktivitasViewer
            logs={logs}
            onClearLogs={() => setLogs([])}
            onAddLog={(newLog) => addLog(newLog.kategori, newLog.aksi, newLog.deskripsi, newLog.status)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>
          Sistem Presensi & Jurnal Digital &copy; 2026. Portal Resmi Kehadiran dan Aktivitas.
        </p>
      </footer>

      {/* Google Drive Integration Modal - Khusus Admin */}
      {currentUser.role === 'Admin' && (
        <GoogleDriveModal
          isOpen={isGoogleDriveModalOpen}
          onClose={() => setIsGoogleDriveModalOpen(false)}
          presensiList={presensiList}
          jurnalList={jurnalList}
          siswaList={siswaList}
          dudiList={dudiList}
          onConnectionChange={(connected) => setIsGoogleConnected(connected)}
        />
      )}

      {/* Database MySQL / TiDB Modal - Khusus Admin */}
      {currentUser.role === 'Admin' && (
        <DatabaseModal
          isOpen={isDatabaseModalOpen}
          onClose={() => setIsDatabaseModalOpen(false)}
          siswaList={siswaList}
          dudiList={dudiList}
          presensiList={presensiList}
          jurnalList={jurnalList}
          onRefreshData={refreshDbStatus}
        />
      )}

      {/* WhatsApp Modal - Khusus Admin */}
      {currentUser.role === 'Admin' && (
        <WhatsAppFonnteModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          config={fonnteConfig}
          onSaveConfig={setFonnteConfig}
        />
      )}

      {/* Profil Detail & Histori Presensi Siswa Modal */}
      <ProfilDetailSiswaModal
        isOpen={isProfilDetailModalOpen}
        onClose={handleCloseSiswaDetail}
        siswa={selectedSiswaDetail}
        dudiList={dudiList}
        guruList={guruList}
        presensiList={presensiList}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
      />

      {/* Floating Network & Sync Toast */}
      {syncToastMessage && (
        <div
          id="toast-network-sync"
          className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900/95 text-white border border-slate-700 shadow-2xl rounded-2xl p-3.5 flex items-start gap-3 backdrop-blur-xs transition-all"
        >
          <div
            className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <p className="text-xs text-slate-200 flex-1 leading-relaxed">{syncToastMessage}</p>
          <button
            type="button"
            onClick={() => setSyncToastMessage(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer p-0.5 rounded-md hover:bg-slate-800"
            aria-label="Tutup Notifikasi"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
