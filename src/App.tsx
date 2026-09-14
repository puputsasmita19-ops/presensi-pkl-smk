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
import {
  executeUnifiedPresensiSave,
  executeUnifiedKunjunganSave,
  syncAllPendingPhotosToGoogleDrive,
} from './services/unifiedStorageService';
import {
  getAllPresensiFromIndexedDb,
  getAllKunjunganFromIndexedDb,
  savePresensiToIndexedDb,
  saveKunjunganToIndexedDb,
} from './services/indexedDbService';
import { getInitialTheme, applyTheme } from './utils/theme';
import {
  subscribeSiswa,
  subscribeDudi,
  subscribeGuru,
  subscribePresensi,
  subscribeJurnal,
  subscribeKunjungan,
  subscribeLogs,
  saveSiswaToFirestore,
  deleteSiswaFromFirestore,
  saveDudiToFirestore,
  deleteDudiFromFirestore,
  saveGuruToFirestore,
  saveJurnalToFirestore,
  saveLogToFirestore,
  seedInitialDataToFirestore,
} from './services/firestoreService';

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

  // State Status Koneksi Backend & Modal Database Firestore
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState<boolean>(false);

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
    // Simpan ke IndexedDB untuk penyimpanan foto persisten bebas limit 5MB
    presensiList.forEach((p) => {
      savePresensiToIndexedDb(p).catch(() => {});
    });
  }, [presensiList]);

  useEffect(() => {
    try { localStorage.setItem('pkl_jurnal_list', JSON.stringify(jurnalList)); } catch (e) { /* silent */ }
  }, [jurnalList]);

  useEffect(() => {
    try { localStorage.setItem('kunjungan_guru_list', JSON.stringify(kunjunganGuruList)); } catch (e) { /* silent */ }
    // Simpan ke IndexedDB untuk foto supervisi guru persisten
    kunjunganGuruList.forEach((k) => {
      saveKunjunganToIndexedDb(k).catch(() => {});
    });
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

  // Memuat data dari IndexedDB lokal dan berlangganan realtime updates dari Firebase Firestore
  useEffect(() => {
    let isMounted = true;
    const loadFromIndexedDb = async () => {
      try {
        const [idbPresensi, idbKunjungan] = await Promise.all([
          getAllPresensiFromIndexedDb().catch(() => []),
          getAllKunjunganFromIndexedDb().catch(() => []),
        ]);

        if (isMounted) {
          if (idbPresensi && idbPresensi.length > 0) {
            setPresensiList((prev) => {
              const map = new Map<string, Presensi>();
              idbPresensi.forEach((p) => map.set(p.id_presensi, p));
              prev.forEach((p) => {
                if (!map.has(p.id_presensi)) {
                  map.set(p.id_presensi, p);
                } else {
                  const existing = map.get(p.id_presensi)!;
                  if (!existing.foto_selfie && p.foto_selfie) {
                    map.set(p.id_presensi, { ...existing, foto_selfie: p.foto_selfie });
                  }
                }
              });
              return Array.from(map.values());
            });
          }

          if (idbKunjungan && idbKunjungan.length > 0) {
            setKunjunganGuruList((prev) => {
              const map = new Map<string, KunjunganGuru>();
              idbKunjungan.forEach((k) => map.set(k.id_kunjungan, k));
              prev.forEach((k) => {
                if (!map.has(k.id_kunjungan)) {
                  map.set(k.id_kunjungan, k);
                }
              });
              return Array.from(map.values());
            });
          }
        }
      } catch (err) {
        console.warn('Gagal memuat dari IndexedDB:', err);
      }
    };

    loadFromIndexedDb();

    // Berlangganan Realtime Updates dari Firebase Firestore
    const unsubSiswa = subscribeSiswa((data) => {
      if (data && data.length > 0) {
        setSiswaList(data);
      } else if (data && data.length === 0) {
        // Auto-seed data awal jika Firestore masih kosong
        seedInitialDataToFirestore({
          siswa: INITIAL_SISWA,
          dudi: INITIAL_DUDI,
          guru: INITIAL_GURU,
          presensi: INITIAL_PRESENSI,
          jurnal: INITIAL_JURNAL,
          users: INITIAL_USERS,
          logs: [],
          kunjungan: [],
        }).catch(console.warn);
      }
    });
    const unsubDudi = subscribeDudi((data) => {
      if (data && data.length > 0) setDudiList(data);
    });
    const unsubGuru = subscribeGuru((data) => {
      if (data && data.length > 0) setGuruList(data);
    });
    const unsubPresensi = subscribePresensi((data) => {
      if (data && data.length > 0) {
        setPresensiList((prev) => {
          const map = new Map<string, Presensi>();
          prev.forEach((p) => map.set(p.id_presensi, p));
          data.forEach((p) => {
            const existing = map.get(p.id_presensi);
            if (existing) {
              map.set(p.id_presensi, {
                ...existing,
                ...p,
                foto_selfie: p.foto_selfie || existing.foto_selfie,
              });
            } else {
              map.set(p.id_presensi, p);
            }
          });
          return Array.from(map.values());
        });
      }
    });
    const unsubJurnal = subscribeJurnal((data) => {
      if (data && data.length > 0) setJurnalList(data);
    });
    const unsubKunjungan = subscribeKunjungan((data) => {
      if (data && data.length > 0) {
        setKunjunganGuruList((prev) => {
          const map = new Map<string, KunjunganGuru>();
          prev.forEach((k) => map.set(k.id_kunjungan, k));
          data.forEach((k) => {
            const existing = map.get(k.id_kunjungan);
            if (existing) {
              map.set(k.id_kunjungan, {
                ...existing,
                ...k,
                foto_kunjungan: k.foto_kunjungan || existing.foto_kunjungan,
              });
            } else {
              map.set(k.id_kunjungan, k);
            }
          });
          return Array.from(map.values());
        });
      }
    });

    return () => {
      isMounted = false;
      unsubSiswa();
      unsubDudi();
      unsubGuru();
      unsubPresensi();
      unsubJurnal();
      unsubKunjungan();
    };
  }, []);

  // Function to sync offline presensi queue to Firebase Firestore
  const triggerSyncToDatabase = async () => {
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
          'Sinkronisasi Firestore Berhasil',
          `Koneksi pulih. Berhasil mengirim ${result.successCount} data presensi offline dari perangkat ke Firebase Firestore.`,
          'Sukses',
          currentUser,
          'Firestore Realtime Sync'
        );
        setSyncToastMessage(
          `Koneksi stabil! ${result.successCount} data presensi berhasil disinkronkan ke Firebase Firestore.`
        );
        setTimeout(() => setSyncToastMessage(null), 6000);
      }
    } catch (err: any) {
      console.error('Error saat menyinkronkan data offline ke firestore:', err);
      addLog(
        'Presensi',
        'Sinkronisasi Firestore Tertunda',
        `Gagal menyinkronkan: ${err?.message || 'Koneksi terganggu'}. Data tetap aman tersimpan di perangkat lokal.`,
        'Peringatan',
        currentUser,
        'Firestore Sync'
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
        'Perangkat kembali terhubung ke internet. Memulai sinkronisasi otomatis data presensi ke Database MySQL/TiDB Cloud...',
        'Sukses',
        currentUser,
        'Network Online Event'
      );
      triggerSyncToDatabase();
    };

    const handleOffline = () => {
      setIsOnline(false);
      addLog(
        'Autentikasi',
        'Koneksi Internet Terputus (Offline)',
        'Perangkat beralih ke Mode Offline. Presensi baru akan otomatis disimpan sementara ke penyimpanan lokal.',
        'Peringatan',
        currentUser,
        'Network Offline Event'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // If online on initial load and there are pending items, sync them
    if (typeof navigator !== 'undefined' && navigator.onLine && getOfflineQueue().length > 0) {
      triggerSyncToDatabase();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentUser]);

  // Otomatisasi Sinkronisasi Foto Selfie & Kunjungan ke Google Drive secara Latar Belakang (Tanpa Perlu Upload Manual Admin)
  useEffect(() => {
    if (!isOnline) return;
    if (!isGoogleConnected && !isGoogleDriveLinked()) return;

    let isRunning = false;
    const runAutoDriveSync = async () => {
      if (isRunning) return;
      isRunning = true;
      try {
        const res = await syncAllPendingPhotosToGoogleDrive(
          presensiList,
          siswaList,
          kunjunganGuruList,
          (updatedP) => {
            setPresensiList((prev) =>
              prev.map((item) => (item.id_presensi === updatedP.id_presensi ? updatedP : item))
            );
          },
          (updatedK) => {
            setKunjunganGuruList((prev) =>
              prev.map((item) => (item.id_kunjungan === updatedK.id_kunjungan ? updatedK : item))
            );
          }
        );

        if (res.uploadedPresensi > 0 || res.uploadedKunjungan > 0) {
          const total = res.uploadedPresensi + res.uploadedKunjungan;
          addLog(
            'Google Drive',
            'Auto-Sync Foto ke Google Drive Berhasil',
            `Otomatis mengunggah ${total} foto (${res.uploadedPresensi} presensi, ${res.uploadedKunjungan} supervisi) ke Google Drive Folder "Presensi & Jurnal PKL SMK".`,
            'Sukses',
            currentUser,
            'Background Auto-Sync'
          );
        }
      } catch (err) {
        console.warn('Background auto drive sync skipped:', err);
      } finally {
        isRunning = false;
      }
    };

    // Jalankan timer sync otomatis
    const timer = setTimeout(runAutoDriveSync, 2000);
    const interval = setInterval(runAutoDriveSync, 30000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [isOnline, isGoogleConnected, presensiList, siswaList, kunjunganGuruList]);

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
        'Mode Offline: Presensi berhasil disimpan di perangkat. Akan otomatis disinkronkan ke Google Drive & Firebase Firestore saat online.'
      );
      setTimeout(() => setSyncToastMessage(null), 7000);
    }

    // Catat log aktivitas sistem dengan detail status Drive & Firestore
    let logDetail = `Presensi ${savedPresensi.status} (${savedPresensi.jam_masuk || savedPresensi.jam_pulang || ''}).`;
    if (report.driveSuccess) {
      logDetail += ' Foto tersimpan di Google Drive (OAuth).';
    }
    if (report.databaseSuccess) {
      logDetail += ` Data tercatat di Firebase Firestore.`;
    } else {
      logDetail += ` Data disimpan di cache offline lokal perangkat.`;
    }

    addLog(
      'Presensi',
      savedPresensi.jam_pulang ? 'Presensi Pulang' : 'Presensi Masuk',
      logDetail,
      report.databaseSuccess ? (savedPresensi.koordinat_absen.dalam_radius ? 'Sukses' : 'Peringatan') : 'Peringatan',
      currentUser,
      report.databaseSuccess ? (report.driveSuccess ? 'Drive + Firestore' : 'Firestore') : 'Offline Cache'
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

    // Simpan ke Firebase Firestore Realtime
    saveJurnalToFirestore(jurnal).catch(console.error);

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
    let updatedJurnalTarget: JurnalHarian | undefined;

    setJurnalList((prev) =>
      prev.map((j) => {
        if (j.id_jurnal !== idJurnal) return j;
        let updated: JurnalHarian;
        if (reviewerRole === 'DUDI') {
          updated = {
            ...j,
            status_validasi_dudi: status,
            catatan_dudi: catatan,
            validated_dudi_at: timeNow,
            nama_dudi_penilai: currentUser.nama_lengkap,
          };
        } else {
          updated = {
            ...j,
            status_validasi_guru: status,
            catatan_guru: catatan,
            validated_at: timeNow,
            nama_guru_penilai: currentUser.nama_lengkap,
          };
        }
        updatedJurnalTarget = updated;
        return updated;
      })
    );

    if (updatedJurnalTarget) {
      saveJurnalToFirestore(updatedJurnalTarget).catch(console.error);
    }

    addLog(
      'Jurnal',
      `Validasi Jurnal oleh ${reviewerRole}`,
      `Jurnal ID ${idJurnal} divalidasi dengan status "${status}" oleh ${currentUser.nama_lengkap}. Catatan: "${catatan || '-'}"`,
      'Sukses',
      currentUser
    );
  };

  // Kunjungan Guru Handler: Menyimpan ke Google Drive (foto supervisi) & Firestore
  const handleSaveKunjunganGuru = async (kunjungan: KunjunganGuru) => {
    // Eksekusi Pipeline Penyimpanan Terpadu Kunjungan Guru (Google Drive OAuth -> Firestore -> State)
    const { kunjungan: savedKunjungan, report } = await executeUnifiedKunjunganSave(kunjungan);

    setKunjunganGuruList((prev) => {
      const existingIdx = prev.findIndex((k) => k.id_kunjungan === savedKunjungan.id_kunjungan);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = savedKunjungan;
        return next;
      }
      return [savedKunjungan, ...prev];
    });

    let logDetail = `Guru ${savedKunjungan.nama_guru} mencatat presensi kunjungan supervisi ke ${savedKunjungan.nama_dudi} (${savedKunjungan.jam_kunjungan} WIB).`;
    if (report.driveSuccess) {
      logDetail += ' Foto bukti supervisi tersimpan di Google Drive.';
    }
    if (report.databaseSuccess) {
      logDetail += ' Data tercatat di Firestore Realtime.';
    }

    addLog(
      'Presensi',
      'Presensi Kunjungan Guru DUDI',
      logDetail,
      'Sukses',
      currentUser,
      report.driveSuccess ? 'Drive + Firestore' : 'Firestore'
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
      prev.map((p) => {
        if (p.id_presensi !== idPresensi) return p;
        const updated = {
          ...p,
          status_persetujuan_dudi: status,
          catatan_dudi: catatanDudi,
          disetujui_dudi_pada: timeNow,
          nama_pembimbing_dudi: currentUser.nama_lengkap,
        };
        // Simpan langsung ke unified storage / Firestore
        executeUnifiedPresensiSave(updated, updated.nama_siswa || 'Siswa').catch(console.error);
        return updated;
      })
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

    // Simpan ke Firestore Realtime Database
    saveSiswaToFirestore(siswa).then((success) => {
      if (success) {
        addLog(
          'Master Data',
          'Sinkronisasi Siswa ke Firestore',
          `Data siswa ${siswa.nama_lengkap} (NIS: ${siswa.nis}) berhasil disimpan ke Firestore realtime.`,
          'Sukses',
          currentUser,
          'Firestore DB'
        );
      }
    });
  };

  const handleDeleteSiswa = (id_siswa: string) => {
    setSiswaList((prev) => prev.filter((s) => s.id_siswa !== id_siswa));
    deleteSiswaFromFirestore(id_siswa).catch(console.error);
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

    // Simpan ke Firestore Realtime Database
    saveDudiToFirestore(dudi).catch(console.error);
  };

  const handleDeleteDUDI = (id_dudi: string) => {
    setDudiList((prev) => prev.filter((d) => d.id_dudi !== id_dudi));
    deleteDudiFromFirestore(id_dudi).catch(console.error);
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
    saveGuruToFirestore(guru).catch(console.error);
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
        onLogout={handleLogout}
        isGoogleConnected={isGoogleConnected}
        isOnline={isOnline}
        pendingOfflineCount={pendingOfflineQueue.length}
        onTriggerSync={triggerSyncToDatabase}
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
              onTriggerSync={triggerSyncToDatabase}
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
          kunjunganList={kunjunganGuruList}
          onConnectionChange={(connected) => setIsGoogleConnected(connected)}
          onPresensiUpdated={(updatedP) => {
            setPresensiList((prev) =>
              prev.map((item) => (item.id_presensi === updatedP.id_presensi ? updatedP : item))
            );
          }}
          onKunjunganUpdated={(updatedK) => {
            setKunjunganGuruList((prev) =>
              prev.map((item) => (item.id_kunjungan === updatedK.id_kunjungan ? updatedK : item))
            );
          }}
        />
      )}

      {/* Database Firebase Firestore Modal - Khusus Admin */}
      {currentUser.role === 'Admin' && (
        <DatabaseModal
          isOpen={isDatabaseModalOpen}
          onClose={() => setIsDatabaseModalOpen(false)}
          siswaList={siswaList}
          dudiList={dudiList}
          guruList={guruList}
          presensiList={presensiList}
          jurnalList={jurnalList}
          users={INITIAL_USERS}
          logs={logs}
          kunjunganList={kunjunganGuruList}
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
