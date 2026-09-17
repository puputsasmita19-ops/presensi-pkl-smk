import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Users,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Search,
  Check,
  X,
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Clock,
  Layers,
  Sun,
  Moon,
  PlusCircle,
  Clock4,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  EyeOff,
  Key,
  Lock,
  ShieldCheck,
  Save,
  CheckCircle2,
  Phone,
  MessageCircle,
  Sparkles,
  Zap,
  Filter,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { Siswa, DUDI, GuruPembimbing, User, ShiftKerja, TipeJadwalKerja } from '../types';
import { NAMA_HARI_INDONESIA } from '../utils/shiftHelper';
import { ImportExportModal, MasterDataType } from './ImportExportModal';
import {
  exportSiswaToExcel,
  exportDUDIToExcel,
  exportGuruToExcel,
} from '../utils/excelHelper';
import { compressImageFile } from '../utils/imageCompressor';
import { useAppBranding } from '../utils/appBrandingService';
import { AppBrandingModal } from './AppBrandingModal';
import {
  getStoredUsers,
  getAdminContactSettings,
  saveAdminContactSettings,
  AdminContactSettings,
  syncUsersWithEntities,
} from '../utils/userManagement';
import { BulkAccountManager } from './BulkAccountManager';

interface MasterDataAdminProps {
  currentUser: User;
  siswaList: Siswa[];
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  onSaveSiswa: (siswa: Siswa) => void;
  onDeleteSiswa: (id_siswa: string) => void;
  onSaveDUDI: (dudi: DUDI) => void;
  onDeleteDUDI: (id_dudi: string) => void;
  onSaveGuru: (guru: GuruPembimbing) => void;
  onDeleteGuru: (id_guru: string) => void;
  onImportSiswa?: (newItems: Siswa[]) => void;
  onImportDUDI?: (newItems: DUDI[]) => void;
  onImportGuru?: (newItems: GuruPembimbing[]) => void;
  onSelectSiswaDetail?: (siswa: Siswa) => void;
  onOpenDatabaseDetails?: () => void;
}

export const MasterDataAdmin: React.FC<MasterDataAdminProps> = ({
  siswaList,
  dudiList,
  guruList,
  onSaveSiswa,
  onDeleteSiswa,
  onSaveDUDI,
  onDeleteDUDI,
  onSaveGuru,
  onDeleteGuru,
  onImportSiswa,
  onImportDUDI,
  onImportGuru,
  onSelectSiswaDetail,
  onOpenDatabaseDetails,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dudi' | 'siswa' | 'guru' | 'akun'>(() => {
    try {
      const rawHash = typeof window !== 'undefined' ? window.location.hash.replace('#', '').trim() : '';
      if (rawHash.startsWith('master/')) {
        const sub = rawHash.split('/')[1] as 'dudi' | 'siswa' | 'guru' | 'akun';
        if (['dudi', 'siswa', 'guru', 'akun'].includes(sub)) {
          return sub;
        }
      }
      const saved = localStorage.getItem('pkl_master_subtab') as 'dudi' | 'siswa' | 'guru' | 'akun';
      if (saved && ['dudi', 'siswa', 'guru', 'akun'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.error(e);
    }
    return 'dudi';
  });

  useEffect(() => {
    try {
      localStorage.setItem('pkl_master_subtab', activeSubTab);
      window.history.replaceState(null, '', `#master/${activeSubTab}`);
    } catch (e) {
      console.error(e);
    }
  }, [activeSubTab]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'siswa' | 'dudi' | 'guru'>('all');

  // Quick Edit States
  interface QuickEditSiswaState {
    id_siswa: string;
    nama_lengkap: string;
    nis: string;
    kelas: string;
    jurusan: string;
    id_dudi: string;
    id_guru_pembimbing: string;
    nomor_wa: string;
    nomor_wa_ortu: string;
  }
  interface QuickEditDudiState {
    id_dudi: string;
    nama_instansi: string;
    bidang: string;
    nama_pembimbing: string;
    nomor_wa_pembimbing: string;
    alamat: string;
    radius_meter: number;
  }
  interface QuickEditGuruState {
    id_guru: string;
    nama_guru: string;
    nomor_wa: string;
    jadwal_kunjungan: string;
    siswa_bimbingan: string;
  }

  const [quickEditSiswa, setQuickEditSiswa] = useState<QuickEditSiswaState | null>(null);
  const [quickEditDudi, setQuickEditDudi] = useState<QuickEditDudiState | null>(null);
  const [quickEditGuru, setQuickEditGuru] = useState<QuickEditGuruState | null>(null);
  const [quickEditSuccessMsg, setQuickEditSuccessMsg] = useState<string | null>(null);

  // CSV Export state
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick edit handlers
  const handleStartQuickEditSiswa = (s: Siswa) => {
    setQuickEditDudi(null);
    setQuickEditGuru(null);
    setQuickEditSiswa({
      id_siswa: s.id_siswa,
      nama_lengkap: s.nama_lengkap,
      nis: s.nis,
      kelas: s.kelas,
      jurusan: s.jurusan,
      id_dudi: s.id_dudi,
      id_guru_pembimbing: s.id_guru_pembimbing,
      nomor_wa: s.nomor_wa || '',
      nomor_wa_ortu: s.nomor_wa_ortu || '',
    });
  };

  const handleSaveQuickEditSiswa = () => {
    if (!quickEditSiswa) return;
    if (!quickEditSiswa.nama_lengkap.trim()) {
      alert('Nama siswa tidak boleh kosong');
      return;
    }
    const original = siswaList.find((s) => s.id_siswa === quickEditSiswa.id_siswa);
    if (!original) return;
    const updated: Siswa = {
      ...original,
      nama_lengkap: quickEditSiswa.nama_lengkap.trim(),
      nis: quickEditSiswa.nis.trim(),
      kelas: quickEditSiswa.kelas.trim(),
      jurusan: quickEditSiswa.jurusan.trim(),
      id_dudi: quickEditSiswa.id_dudi,
      id_guru_pembimbing: quickEditSiswa.id_guru_pembimbing,
      nomor_wa: quickEditSiswa.nomor_wa.trim(),
      nomor_wa_ortu: quickEditSiswa.nomor_wa_ortu.trim(),
    };
    onSaveSiswa(updated);
    setQuickEditSiswa(null);
    setQuickEditSuccessMsg(`Data siswa "${updated.nama_lengkap}" berhasil diperbarui!`);
    setTimeout(() => setQuickEditSuccessMsg(null), 3500);
  };

  const handleStartQuickEditDudi = (d: DUDI) => {
    setQuickEditSiswa(null);
    setQuickEditGuru(null);
    setQuickEditDudi({
      id_dudi: d.id_dudi,
      nama_instansi: d.nama_instansi,
      bidang: d.bidang,
      nama_pembimbing: d.nama_pembimbing || '',
      nomor_wa_pembimbing: d.nomor_wa_pembimbing || '',
      alamat: d.alamat,
      radius_meter: d.radius_meter,
    });
  };

  const handleSaveQuickEditDudi = () => {
    if (!quickEditDudi) return;
    if (!quickEditDudi.nama_instansi.trim()) {
      alert('Nama instansi DUDI tidak boleh kosong');
      return;
    }
    const original = dudiList.find((d) => d.id_dudi === quickEditDudi.id_dudi);
    if (!original) return;
    const updated: DUDI = {
      ...original,
      nama_instansi: quickEditDudi.nama_instansi.trim(),
      bidang: quickEditDudi.bidang.trim(),
      nama_pembimbing: quickEditDudi.nama_pembimbing.trim(),
      nomor_wa_pembimbing: quickEditDudi.nomor_wa_pembimbing.trim(),
      alamat: quickEditDudi.alamat.trim(),
      radius_meter: Number(quickEditDudi.radius_meter) || 100,
    };
    onSaveDUDI(updated);
    setQuickEditDudi(null);
    setQuickEditSuccessMsg(`Data DUDI "${updated.nama_instansi}" berhasil diperbarui!`);
    setTimeout(() => setQuickEditSuccessMsg(null), 3500);
  };

  const handleStartQuickEditGuru = (g: GuruPembimbing) => {
    setQuickEditSiswa(null);
    setQuickEditDudi(null);
    setQuickEditGuru({
      id_guru: g.id_guru,
      nama_guru: g.nama_guru,
      nomor_wa: g.nomor_wa,
      jadwal_kunjungan: g.jadwal_kunjungan || '',
      siswa_bimbingan: g.siswa_bimbingan || '',
    });
  };

  const handleSaveQuickEditGuru = () => {
    if (!quickEditGuru) return;
    if (!quickEditGuru.nama_guru.trim()) {
      alert('Nama guru tidak boleh kosong');
      return;
    }
    const original = guruList.find((g) => g.id_guru === quickEditGuru.id_guru);
    if (!original) return;
    const updated: GuruPembimbing = {
      ...original,
      nama_guru: quickEditGuru.nama_guru.trim(),
      nomor_wa: quickEditGuru.nomor_wa.trim(),
      jadwal_kunjungan: quickEditGuru.jadwal_kunjungan.trim(),
      siswa_bimbingan: quickEditGuru.siswa_bimbingan.trim(),
    };
    onSaveGuru(updated);
    setQuickEditGuru(null);
    setQuickEditSuccessMsg(`Data guru "${updated.nama_guru}" berhasil diperbarui!`);
    setTimeout(() => setQuickEditSuccessMsg(null), 3500);
  };

  const cancelQuickEdit = () => {
    setQuickEditSiswa(null);
    setQuickEditDudi(null);
    setQuickEditGuru(null);
  };

  // Filtered lists for real-time search
  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredSiswaList = useMemo(() => {
    if (!cleanQuery) return siswaList;
    const dudiMap = new Map<string, string>(dudiList.map((d) => [d.id_dudi, d.nama_instansi.toLowerCase()]));
    const guruMap = new Map<string, string>(guruList.map((g) => [g.id_guru, g.nama_guru.toLowerCase()]));

    return siswaList.filter((s) => {
      const dudiName = dudiMap.get(s.id_dudi) || '';
      const guruName = guruMap.get(s.id_guru_pembimbing) || '';
      return (
        s.nama_lengkap.toLowerCase().includes(cleanQuery) ||
        s.nis.toLowerCase().includes(cleanQuery) ||
        s.id_siswa.toLowerCase().includes(cleanQuery) ||
        s.kelas.toLowerCase().includes(cleanQuery) ||
        s.jurusan.toLowerCase().includes(cleanQuery) ||
        (s.nomor_wa && s.nomor_wa.toLowerCase().includes(cleanQuery)) ||
        (s.nomor_wa_ortu && s.nomor_wa_ortu.toLowerCase().includes(cleanQuery)) ||
        dudiName.includes(cleanQuery) ||
        guruName.includes(cleanQuery)
      );
    });
  }, [siswaList, dudiList, guruList, cleanQuery]);

  const filteredDudiList = useMemo(() => {
    if (!cleanQuery) return dudiList;
    return dudiList.filter((d) => {
      return (
        d.nama_instansi.toLowerCase().includes(cleanQuery) ||
        d.id_dudi.toLowerCase().includes(cleanQuery) ||
        d.bidang.toLowerCase().includes(cleanQuery) ||
        d.alamat.toLowerCase().includes(cleanQuery) ||
        (d.nama_pembimbing && d.nama_pembimbing.toLowerCase().includes(cleanQuery)) ||
        (d.nomor_wa_pembimbing && d.nomor_wa_pembimbing.toLowerCase().includes(cleanQuery))
      );
    });
  }, [dudiList, cleanQuery]);

  const filteredGuruList = useMemo(() => {
    if (!cleanQuery) return guruList;
    return guruList.filter((g) => {
      return (
        g.nama_guru.toLowerCase().includes(cleanQuery) ||
        g.id_guru.toLowerCase().includes(cleanQuery) ||
        g.nomor_wa.toLowerCase().includes(cleanQuery) ||
        (g.jadwal_kunjungan && g.jadwal_kunjungan.toLowerCase().includes(cleanQuery)) ||
        (g.siswa_bimbingan && g.siswa_bimbingan.toLowerCase().includes(cleanQuery))
      );
    });
  }, [guruList, cleanQuery]);

  // CSV Export Handler
  const handleExportCSV = (target: 'siswa' | 'dudi' | 'guru' | 'all' = (activeSubTab === 'akun' ? 'siswa' : activeSubTab)) => {
    setExportDropdownOpen(false);
    if (target === 'siswa') {
      const listToExport = filteredSiswaList.length > 0 ? filteredSiswaList : siswaList;
      exportSiswaToExcel(listToExport, dudiList, guruList, 'csv');
      setExportNotice(`Berhasil mengekspor ${listToExport.length} data Siswa ke format CSV (.csv)`);
    } else if (target === 'dudi') {
      const listToExport = filteredDudiList.length > 0 ? filteredDudiList : dudiList;
      exportDUDIToExcel(listToExport, 'csv');
      setExportNotice(`Berhasil mengekspor ${listToExport.length} data DUDI ke format CSV (.csv)`);
    } else if (target === 'guru') {
      const listToExport = filteredGuruList.length > 0 ? filteredGuruList : guruList;
      exportGuruToExcel(listToExport, 'csv');
      setExportNotice(`Berhasil mengekspor ${listToExport.length} data Guru ke format CSV (.csv)`);
    } else if (target === 'all') {
      exportSiswaToExcel(siswaList, dudiList, guruList, 'csv');
      setTimeout(() => exportDUDIToExcel(dudiList, 'csv'), 400);
      setTimeout(() => exportGuruToExcel(guruList, 'csv'), 800);
      setExportNotice(`Mengekspor semua data Siswa (${siswaList.length}), DUDI (${dudiList.length}), dan Guru (${guruList.length}) ke CSV (.csv)`);
    }
    setTimeout(() => setExportNotice(null), 4500);
  };

  // Password & Admin Contact state
  const [usersList, setUsersList] = useState<User[]>(() =>
    syncUsersWithEntities(siswaList, guruList, dudiList)
  );
  const [adminContactForm, setAdminContactForm] = useState<AdminContactSettings>(() =>
    getAdminContactSettings()
  );
  const [adminContactSaved, setAdminContactSaved] = useState(false);

  // Sync users whenever siswaList, guruList, or dudiList change
  useEffect(() => {
    const synced = syncUsersWithEntities(siswaList, guruList, dudiList);
    setUsersList(synced);
  }, [siswaList, guruList, dudiList]);

  // Delete confirmation modal state
  interface DeleteTarget {
    type: 'siswa' | 'guru' | 'dudi';
    id: string;
    name: string;
    secondaryInfo?: string;
    countWarning?: string;
  }
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'siswa') {
      onDeleteSiswa(deleteTarget.id);
    } else if (deleteTarget.type === 'guru') {
      onDeleteGuru(deleteTarget.id);
    } else if (deleteTarget.type === 'dudi') {
      onDeleteDUDI(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteTarget) {
        setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteTarget]);

  // Modals state
  const [isDudiModalOpen, setIsDudiModalOpen] = useState(false);
  const [editingDudi, setEditingDudi] = useState<DUDI | null>(null);

  const [isSiswaModalOpen, setIsSiswaModalOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<Siswa | null>(null);

  const [isGuruModalOpen, setIsGuruModalOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<GuruPembimbing | null>(null);

  // Import / Export Modal state
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [importExportTargetType, setImportExportTargetType] = useState<MasterDataType>('dudi');
  const [importExportMode, setImportExportMode] = useState<'import' | 'export'>('import');

  // App Branding & Identity Customization
  const { branding, updateBranding, resetBranding } = useAppBranding();
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);

  const handleOpenImportExport = (type: MasterDataType, mode: 'import' | 'export') => {
    setImportExportTargetType(type);
    setImportExportMode(mode);
    setIsImportExportModalOpen(true);
  };

  const handleBatchImportSiswa = (newItems: Siswa[]) => {
    if (onImportSiswa) {
      onImportSiswa(newItems);
    } else {
      newItems.forEach((item) => onSaveSiswa(item));
    }
  };

  const handleBatchImportDUDI = (newItems: DUDI[]) => {
    if (onImportDUDI) {
      onImportDUDI(newItems);
    } else {
      newItems.forEach((item) => onSaveDUDI(item));
    }
  };

  const handleBatchImportGuru = (newItems: GuruPembimbing[]) => {
    if (onImportGuru) {
      onImportGuru(newItems);
    } else {
      newItems.forEach((item) => onSaveGuru(item));
    }
  };

  // Form states for DUDI
  const [dudiForm, setDudiForm] = useState<{
    id_dudi: string;
    nama_instansi: string;
    bidang: string;
    alamat: string;
    nama_pembimbing: string;
    nomor_wa_pembimbing: string;
    latitude: number;
    longitude: number;
    radius_meter: number;
    jam_masuk_standar: string;
    jam_pulang_standar: string;
    hari_kerja: string[];
    tipe_jadwal: TipeJadwalKerja;
    daftar_shift: ShiftKerja[];
  }>({
    id_dudi: '',
    nama_instansi: '',
    bidang: '',
    alamat: '',
    nama_pembimbing: '',
    nomor_wa_pembimbing: '',
    latitude: -7.3056,
    longitude: 112.7358,
    radius_meter: 150,
    jam_masuk_standar: '08:00',
    jam_pulang_standar: '17:00',
    hari_kerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
    tipe_jadwal: 'Reguler',
    daftar_shift: [
      {
        id_shift: 'SHF-DEF-01',
        nama_shift: 'Jam Kerja Standar',
        jam_masuk: '08:00',
        jam_pulang: '17:00',
        toleransi_keterlambatan_menit: 15,
      },
    ],
  });

  // Form states for Siswa
  const [siswaForm, setSiswaForm] = useState({
    id_siswa: '',
    id_user: '',
    nama_lengkap: '',
    nis: '',
    kelas: 'XII RPL 1',
    jurusan: 'Rekayasa Perangkat Lunak',
    id_dudi: dudiList[0]?.id_dudi || '',
    id_guru_pembimbing: guruList[0]?.id_guru || '',
    nomor_wa: '08',
    nomor_wa_ortu: '08',
    foto_profil: '',
  });

  // Form states for Guru
  const [guruForm, setGuruForm] = useState({
    id_guru: '',
    id_user: '',
    nama_guru: '',
    siswa_bimbingan: '',
    nomor_wa: '08',
    jadwal_kunjungan: 'Setiap Selasa & Kamis (Pkl 10:00 WIB)',
  });

  // Open DUDI Modal
  const handleOpenDudiModal = (dudi?: DUDI) => {
    if (dudi) {
      setEditingDudi(dudi);
      setDudiForm({
        id_dudi: dudi.id_dudi,
        nama_instansi: dudi.nama_instansi,
        bidang: dudi.bidang,
        alamat: dudi.alamat,
        nama_pembimbing: dudi.nama_pembimbing || '',
        nomor_wa_pembimbing: dudi.nomor_wa_pembimbing || '',
        latitude: dudi.koordinat_lokasi.latitude,
        longitude: dudi.koordinat_lokasi.longitude,
        radius_meter: dudi.radius_meter,
        jam_masuk_standar: dudi.jam_masuk_standar,
        jam_pulang_standar: dudi.jam_pulang_standar,
        hari_kerja: dudi.hari_kerja && dudi.hari_kerja.length > 0
          ? [...dudi.hari_kerja]
          : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        tipe_jadwal: dudi.tipe_jadwal || 'Reguler',
        daftar_shift: dudi.daftar_shift && dudi.daftar_shift.length > 0
          ? JSON.parse(JSON.stringify(dudi.daftar_shift))
          : [
              {
                id_shift: `SHF-${dudi.id_dudi}-01`,
                nama_shift: 'Jam Kerja Standar',
                jam_masuk: dudi.jam_masuk_standar || '08:00',
                jam_pulang: dudi.jam_pulang_standar || '17:00',
                toleransi_keterlambatan_menit: 15,
              },
            ],
      });
    } else {
      setEditingDudi(null);
      const newDudiId = `DUD-${String(dudiList.length + 1).padStart(3, '0')}`;
      setDudiForm({
        id_dudi: newDudiId,
        nama_instansi: '',
        bidang: '',
        alamat: '',
        nama_pembimbing: '',
        nomor_wa_pembimbing: '',
        latitude: -7.3056,
        longitude: 112.7358,
        radius_meter: 150,
        jam_masuk_standar: '08:00',
        jam_pulang_standar: '17:00',
        hari_kerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
        tipe_jadwal: 'Reguler',
        daftar_shift: [
          {
            id_shift: `SHF-${newDudiId}-01`,
            nama_shift: 'Jam Kerja Reguler',
            jam_masuk: '08:00',
            jam_pulang: '17:00',
            toleransi_keterlambatan_menit: 15,
          },
        ],
      });
    }
    setIsDudiModalOpen(true);
  };

  // Helper to toggle days in DUDI form
  const handleToggleHari = (hari: string) => {
    setDudiForm((prev) => {
      const exists = prev.hari_kerja.includes(hari);
      const updated = exists ? prev.hari_kerja.filter((h) => h !== hari) : [...prev.hari_kerja, hari];
      return { ...prev, hari_kerja: updated };
    });
  };

  // Helper for quick working days presets
  const handleSetPresetHari = (preset: '5hari' | '6hari' | '7hari') => {
    if (preset === '5hari') {
      setDudiForm((prev) => ({ ...prev, hari_kerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] }));
    } else if (preset === '6hari') {
      setDudiForm((prev) => ({ ...prev, hari_kerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] }));
    } else {
      setDudiForm((prev) => ({ ...prev, hari_kerja: [...NAMA_HARI_INDONESIA] }));
    }
  };

  // Helper for adding a new shift
  const handleAddShift = () => {
    setDudiForm((prev) => {
      const count = prev.daftar_shift.length + 1;
      const newShift: ShiftKerja = {
        id_shift: `SHF-${prev.id_dudi}-${Date.now().toString().slice(-4)}`,
        nama_shift: prev.tipe_jadwal === 'Shift' ? `Shift ${count}` : `Jadwal Khusus ${count}`,
        jam_masuk: '08:00',
        jam_pulang: '16:00',
        toleransi_keterlambatan_menit: 15,
        hari_khusus: prev.tipe_jadwal === 'Kondisional' ? ['Jumat'] : undefined,
      };
      return { ...prev, daftar_shift: [...prev.daftar_shift, newShift] };
    });
  };

  // Helper for updating a shift
  const handleUpdateShift = (index: number, updates: Partial<ShiftKerja>) => {
    setDudiForm((prev) => {
      const copy = [...prev.daftar_shift];
      copy[index] = { ...copy[index], ...updates };
      return { ...prev, daftar_shift: copy };
    });
  };

  // Helper for deleting a shift
  const handleDeleteShift = (index: number) => {
    setDudiForm((prev) => {
      const copy = prev.daftar_shift.filter((_, i) => i !== index);
      return { ...prev, daftar_shift: copy };
    });
  };

  const handleSaveDudiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dudiForm.nama_instansi) return;

    // Ensure at least one shift exists
    const finalShifts: ShiftKerja[] =
      dudiForm.daftar_shift.length > 0
        ? dudiForm.daftar_shift
        : [
            {
              id_shift: `SHF-${dudiForm.id_dudi}-01`,
              nama_shift: 'Jam Kerja Standar',
              jam_masuk: dudiForm.jam_masuk_standar,
              jam_pulang: dudiForm.jam_pulang_standar,
              toleransi_keterlambatan_menit: 15,
            },
          ];

    const firstShift = finalShifts[0];

    const record: DUDI = {
      id_dudi: dudiForm.id_dudi,
      nama_instansi: dudiForm.nama_instansi,
      bidang: dudiForm.bidang,
      alamat: dudiForm.alamat,
      nama_pembimbing: dudiForm.nama_pembimbing.trim() || undefined,
      nomor_wa_pembimbing: dudiForm.nomor_wa_pembimbing.trim() || undefined,
      koordinat_lokasi: {
        latitude: Number(dudiForm.latitude),
        longitude: Number(dudiForm.longitude),
      },
      radius_meter: Number(dudiForm.radius_meter),
      jam_masuk_standar: firstShift?.jam_masuk || dudiForm.jam_masuk_standar,
      jam_pulang_standar: firstShift?.jam_pulang || dudiForm.jam_pulang_standar,
      hari_kerja: dudiForm.hari_kerja.length > 0 ? dudiForm.hari_kerja : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      tipe_jadwal: dudiForm.tipe_jadwal,
      daftar_shift: finalShifts,
    };

    onSaveDUDI(record);
    setIsDudiModalOpen(false);
  };

  // Open Siswa Modal
  const handleOpenSiswaModal = (siswa?: Siswa) => {
    if (siswa) {
      setEditingSiswa(siswa);
      setSiswaForm({
        id_siswa: siswa.id_siswa,
        id_user: siswa.id_user,
        nama_lengkap: siswa.nama_lengkap,
        nis: siswa.nis,
        kelas: siswa.kelas,
        jurusan: siswa.jurusan,
        id_dudi: siswa.id_dudi,
        id_guru_pembimbing: siswa.id_guru_pembimbing,
        nomor_wa: siswa.nomor_wa,
        nomor_wa_ortu: siswa.nomor_wa_ortu,
        foto_profil: siswa.foto_profil || '',
      });
    } else {
      setEditingSiswa(null);
      const newNum = siswaList.length + 1;
      setSiswaForm({
        id_siswa: `SIS-${String(newNum).padStart(3, '0')}`,
        id_user: `USR-SIS-${String(newNum).padStart(3, '0')}`,
        nama_lengkap: '',
        nis: `202410${String(newNum).padStart(2, '0')}`,
        kelas: 'XII RPL 1',
        jurusan: 'Rekayasa Perangkat Lunak',
        id_dudi: dudiList[0]?.id_dudi || '',
        id_guru_pembimbing: guruList[0]?.id_guru || '',
        nomor_wa: '085712345600',
        nomor_wa_ortu: '081298765400',
        foto_profil: '',
      });
    }
    setIsSiswaModalOpen(true);
  };

  const handleSaveSiswaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaForm.nama_lengkap) return;

    const record: Siswa = {
      id_siswa: siswaForm.id_siswa,
      id_user: siswaForm.id_user,
      nama_lengkap: siswaForm.nama_lengkap,
      nis: siswaForm.nis,
      kelas: siswaForm.kelas,
      jurusan: siswaForm.jurusan,
      id_dudi: siswaForm.id_dudi,
      id_guru_pembimbing: siswaForm.id_guru_pembimbing,
      nomor_wa: siswaForm.nomor_wa,
      nomor_wa_ortu: siswaForm.nomor_wa_ortu,
      foto_profil: siswaForm.foto_profil || undefined,
    };

    onSaveSiswa(record);
    setIsSiswaModalOpen(false);
  };

  // Open Guru Modal
  const handleOpenGuruModal = (guru?: GuruPembimbing) => {
    if (guru) {
      setEditingGuru(guru);
      // Auto-detect assigned students from siswaList if not populated
      const assignedStudents = siswaList
        .filter((s) => s.id_guru_pembimbing === guru.id_guru)
        .map((s) => `${s.nama_lengkap} (${s.kelas})`)
        .join(', ');

      setGuruForm({
        id_guru: guru.id_guru,
        id_user: guru.id_user,
        nama_guru: guru.nama_guru,
        siswa_bimbingan: guru.siswa_bimbingan || assignedStudents || '',
        nomor_wa: guru.nomor_wa,
        jadwal_kunjungan: guru.jadwal_kunjungan || 'Setiap Selasa & Kamis (Pkl 10:00 WIB)',
      });
    } else {
      setEditingGuru(null);
      const num = guruList.length + 1;
      setGuruForm({
        id_guru: `GUR-${String(num).padStart(3, '0')}`,
        id_user: `USR-GUR-${String(num).padStart(3, '0')}`,
        nama_guru: '',
        siswa_bimbingan: '',
        nomor_wa: '081234567890',
        jadwal_kunjungan: 'Setiap Selasa & Kamis (Pkl 10:00 WIB)',
      });
    }
    setIsGuruModalOpen(true);
  };

  const handleSaveGuruSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guruForm.nama_guru) return;

    const record: GuruPembimbing = {
      id_guru: guruForm.id_guru,
      id_user: guruForm.id_user,
      nama_guru: guruForm.nama_guru,
      siswa_bimbingan: guruForm.siswa_bimbingan || 'Belum ada siswa',
      nip: editingGuru?.nip || '',
      nomor_wa: guruForm.nomor_wa,
      jadwal_kunjungan: guruForm.jadwal_kunjungan || 'Sesuai koordinasi DUDI',
      email: editingGuru?.email || '',
    };

    onSaveGuru(record);
    setIsGuruModalOpen(false);
  };

  // Handlers for Admin Contact & Password Settings
  const handleSaveAdminContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAdminContactSettings(adminContactForm);
    setAdminContactSaved(true);
    setTimeout(() => setAdminContactSaved(false), 3000);
  };

  // Reusable Friendly Empty State Illustration & Message
  const EmptyStateIllustration: React.FC<{
    type: 'dudi' | 'siswa' | 'guru' | 'search';
    searchQuery?: string;
    onResetSearch?: () => void;
    onAddNew?: () => void;
    onImport?: () => void;
  }> = ({ type, searchQuery, onResetSearch, onAddNew, onImport }) => {
    if (type === 'search') {
      return (
        <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
          <div className="relative mb-3.5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-2xs">
              <Search className="w-8 h-8" />
            </div>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
              ?
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            Tidak Ada Data Ditemukan
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Tidak ditemukan data yang cocok dengan kata kunci{' '}
            <span className="font-semibold text-slate-700 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
              "{searchQuery}"
            </span>
            . Silakan periksa ejaan atau ubah kata kunci pencarian.
          </p>
          {onResetSearch && (
            <button
              id="btn-reset-search-empty"
              type="button"
              onClick={onResetSearch}
              className="px-3.5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span>Bersihkan & Reset Pencarian</span>
            </button>
          )}
        </div>
      );
    }

    const configs = {
      dudi: {
        title: 'Belum Ada Mitra DUDI Terdaftar',
        desc: 'Dunia usaha atau industri tempat PKL belum ditambahkan. Daftarkan instansi mitra dan konfigurasikan lokasi geofencing presensinya.',
        icon: Building2,
        addLabel: 'Tambah DUDI Baru',
        badge: 'Mitra Industri',
      },
      siswa: {
        title: 'Belum Ada Data Siswa PKL',
        desc: 'Daftar siswa magang masih kosong. Tambahkan siswa baru secara manual atau gunakan fitur impor dari Excel/CSV untuk memulai onboarding.',
        icon: GraduationCap,
        addLabel: 'Tambah Siswa Baru',
        badge: 'Peserta Magang',
      },
      guru: {
        title: 'Belum Ada Guru Pembimbing',
        desc: 'Belum ada guru pembimbing PKL yang didaftarkan. Daftarkan guru untuk memantau presensi, memvalidasi jurnal, dan jadwal kunjungan siswa.',
        icon: Users,
        addLabel: 'Tambah Guru Baru',
        badge: 'Pembimbing PKL',
      },
    };

    const currentConfig = configs[type];
    const IconComponent = currentConfig.icon;

    return (
      <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-slate-50 via-sky-50 to-indigo-50 border border-slate-200/80 flex items-center justify-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-center text-sky-600 shadow-2xs">
              <IconComponent className="w-6 h-6" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-bold">
            {currentConfig.badge}
          </span>
        </div>
        <h4 className="text-sm font-bold text-slate-900 mb-1.5">{currentConfig.title}</h4>
        <p className="text-xs text-slate-500 max-w-md mb-5 leading-relaxed">{currentConfig.desc}</p>
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          {onAddNew && (
            <button
              type="button"
              onClick={onAddNew}
              className="px-4 py-2 rounded-xl bg-slate-900 text-sky-400 hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{currentConfig.addLabel}</span>
            </button>
          )}
          {onImport && (
            <button
              type="button"
              onClick={onImport}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-600" />
              <span>Impor Excel / CSV</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Header card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Manajemen Master Data PKL (Admin)</h2>
          <p className="text-xs text-slate-500">
            CRUD Entitas RDBMS: Relasi DUDI Mitra, Siswa Magang, dan Guru Pembimbing
          </p>
        </div>
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-200">
          Akses Khusus Admin
        </span>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('dudi')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeSubTab === 'dudi'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>DUDI ({dudiList.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('siswa')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeSubTab === 'siswa'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Siswa ({siswaList.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('guru')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeSubTab === 'guru'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guru ({guruList.length})</span>
          </button>
          <button
            id="subtab-akun"
            onClick={() => setActiveSubTab('akun')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeSubTab === 'akun'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Akun & Password ({usersList.length})</span>
          </button>

          <button
            id="btn-open-branding-admin"
            type="button"
            onClick={() => setIsBrandingModalOpen(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 text-sky-700 bg-sky-50/80 hover:bg-sky-100/80 border border-sky-200/70 shadow-2xs cursor-pointer"
            title="Ubah Logo, Nama Aplikasi & Tagline"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Logo & Branding</span>
          </button>
        </div>

        {/* Action Controls: Export, Import, and Add */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export to CSV Button with Dropdown */}
          <div className="relative inline-flex items-center" ref={exportDropdownRef}>
            <button
              id="btn-export-csv"
              type="button"
              onClick={() => handleExportCSV(activeSubTab === 'akun' ? 'siswa' : activeSubTab)}
              className="px-2.5 py-2 rounded-l-xl bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title={`Unduh Data ${activeSubTab === 'akun' ? 'SISWA' : activeSubTab.toUpperCase()} ke File CSV (.csv)`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export to CSV</span>
            </button>
            <button
              id="btn-export-csv-dropdown-toggle"
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="px-1.5 py-2 rounded-r-xl bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border-y border-r border-emerald-300 text-xs font-bold transition cursor-pointer"
              title="Pilihan Ekspor CSV Tambahan"
            >
              <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Pilihan Unduh CSV
                </div>
                <button
                  type="button"
                  onClick={() => handleExportCSV('siswa')}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
                    <span>Data Siswa (.csv)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({siswaList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV('dudi')}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Data DUDI (.csv)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({dudiList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCSV('guru')}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Data Guru (.csv)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">({guruList.length})</span>
                </button>
                <div className="my-1 border-t border-slate-100"></div>
                <button
                  type="button"
                  onClick={() => handleExportCSV('all')}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-100/70 text-emerald-900 font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Ekspor Semua (3 File CSV)</span>
                </button>
              </div>
            )}
          </div>

          {activeSubTab !== 'akun' && (
            <>
              <button
                type="button"
                onClick={() => handleOpenImportExport(activeSubTab, 'export')}
                className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                title={`Ekspor Data ${activeSubTab.toUpperCase()} ke Excel (.xlsx) / CSV`}
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Ekspor Excel</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenImportExport(activeSubTab, 'import')}
                className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                title={`Impor Data ${activeSubTab.toUpperCase()} dari Excel (.xlsx) / CSV`}
              >
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                <span>Impor Excel/CSV</span>
              </button>
            </>
          )}

          {activeSubTab === 'dudi' && (
            <button
              onClick={() => handleOpenDudiModal()}
              className="px-3 py-2 rounded-xl bg-slate-900 text-sky-400 hover:bg-slate-800 text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah DUDI</span>
            </button>
          )}
          {activeSubTab === 'siswa' && (
            <button
              onClick={() => handleOpenSiswaModal()}
              className="px-3 py-2 rounded-xl bg-slate-900 text-sky-400 hover:bg-slate-800 text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Siswa</span>
            </button>
          )}
          {activeSubTab === 'guru' && (
            <button
              onClick={() => handleOpenGuruModal()}
              className="px-3 py-2 rounded-xl bg-slate-900 text-sky-400 hover:bg-slate-800 text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Guru</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Feedback Toast/Banners */}
      {exportNotice && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="p-1 text-emerald-600 hover:text-emerald-900 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {quickEditSuccessMsg && (
        <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{quickEditSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setQuickEditSuccessMsg(null)}
            className="p-1 text-sky-600 hover:text-sky-900 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search Bar & Category Filter Section */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Kategori:</span>
            </span>
            <button
              id="category-filter-all"
              type="button"
              onClick={() => {
                setCategoryFilter('all');
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({siswaList.length + dudiList.length + guruList.length})
            </button>
            <button
              id="category-filter-siswa"
              type="button"
              onClick={() => {
                setCategoryFilter('siswa');
                setActiveSubTab('siswa');
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs ${
                activeSubTab === 'siswa' && categoryFilter === 'siswa'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Siswa ({filteredSiswaList.length})</span>
            </button>
            <button
              id="category-filter-dudi"
              type="button"
              onClick={() => {
                setCategoryFilter('dudi');
                setActiveSubTab('dudi');
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs ${
                activeSubTab === 'dudi' && categoryFilter === 'dudi'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>DUDI ({filteredDudiList.length})</span>
            </button>
            <button
              id="category-filter-guru"
              type="button"
              onClick={() => {
                setCategoryFilter('guru');
                setActiveSubTab('guru');
              }}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 text-xs ${
                activeSubTab === 'guru' && categoryFilter === 'guru'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Guru ({filteredGuruList.length})</span>
            </button>
          </div>

          {/* Quick Edit Hint Badge */}
          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg shrink-0">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Edit: Edit langsung pada baris tabel</span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-master-data"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'siswa'
                ? 'Cari siswa berdasarkan nama, NIS, kelas, jurusan, DUDI, nomor WhatsApp...'
                : activeSubTab === 'dudi'
                ? 'Cari DUDI berdasarkan nama instansi, bidang usaha, PIC pembimbing, alamat...'
                : activeSubTab === 'guru'
                ? 'Cari guru berdasarkan nama guru, nomor WhatsApp, atau siswa bimbingan...'
                : 'Cari master data atau akun...'
            }
            className="w-full pl-9 pr-24 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-sky-500 rounded-xl focus:ring-2 focus:ring-sky-500/20 transition placeholder:text-slate-400"
          />
          {searchQuery && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md font-medium">
                {activeSubTab === 'siswa'
                  ? `${filteredSiswaList.length} siswa`
                  : activeSubTab === 'dudi'
                  ? `${filteredDudiList.length} DUDI`
                  : `${filteredGuruList.length} guru`}
              </span>
              <button
                id="btn-clear-search"
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-md transition"
                title="Bersihkan pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TABLE SECTION: DUDI */}
      {activeSubTab === 'dudi' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Daftar Dunia Usaha / Dunia Industri (DUDI)
            </span>
            <span className="text-[11px] text-slate-400">Koordinat & Radius Geofencing</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3">ID / Instansi</th>
                  <th className="p-3">Pembimbing / PIC DUDI</th>
                  <th className="p-3">Bidang & Alamat</th>
                  <th className="p-3">Hari Kerja & Sistem</th>
                  <th className="p-3">Daftar Shift / Jam Kerja</th>
                  <th className="p-3">Radius Geo</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDudiList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <EmptyStateIllustration
                        type={searchQuery ? 'search' : 'dudi'}
                        searchQuery={searchQuery}
                        onResetSearch={() => setSearchQuery('')}
                        onAddNew={() => handleOpenDudiModal()}
                        onImport={() => handleOpenImportExport('dudi', 'import')}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredDudiList.map((d) => {
                    const isQuickEditing = quickEditDudi?.id_dudi === d.id_dudi;

                    if (isQuickEditing && quickEditDudi) {
                      return (
                        <tr key={d.id_dudi} className="bg-amber-50/50 border-y-2 border-amber-300">
                          <td className="p-2.5 align-top">
                            <span className="font-mono text-[10px] text-slate-400 block mb-1">
                              {d.id_dudi} (Quick Edit)
                            </span>
                            <input
                              type="text"
                              value={quickEditDudi.nama_instansi}
                              onChange={(e) =>
                                setQuickEditDudi({ ...quickEditDudi, nama_instansi: e.target.value })
                              }
                              placeholder="Nama Instansi DUDI"
                              className="w-full px-2 py-1 text-xs font-bold border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                            />
                          </td>
                          <td className="p-2.5 align-top">
                            <input
                              type="text"
                              value={quickEditDudi.nama_pembimbing}
                              onChange={(e) =>
                                setQuickEditDudi({ ...quickEditDudi, nama_pembimbing: e.target.value })
                              }
                              placeholder="Nama PIC/Pembimbing"
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white mb-1.5 focus:ring-1 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={quickEditDudi.nomor_wa_pembimbing}
                              onChange={(e) =>
                                setQuickEditDudi({ ...quickEditDudi, nomor_wa_pembimbing: e.target.value })
                              }
                              placeholder="WhatsApp PIC (08...)"
                              className="w-full px-2 py-1 text-[11px] font-mono border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500 text-emerald-800"
                            />
                          </td>
                          <td className="p-2.5 align-top">
                            <input
                              type="text"
                              value={quickEditDudi.bidang}
                              onChange={(e) =>
                                setQuickEditDudi({ ...quickEditDudi, bidang: e.target.value })
                              }
                              placeholder="Bidang Industri"
                              className="w-full px-2 py-1 text-xs font-semibold text-sky-800 border border-slate-300 rounded-lg bg-white mb-1.5 focus:ring-1 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={quickEditDudi.alamat}
                              onChange={(e) =>
                                setQuickEditDudi({ ...quickEditDudi, alamat: e.target.value })
                              }
                              placeholder="Alamat Kantor/Pabrik"
                              className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500 text-slate-600"
                            />
                          </td>
                          <td className="p-2.5 align-top">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {d.tipe_jadwal || 'Reguler'}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {d.hari_kerja?.join(', ') || 'Senin - Jumat'}
                            </p>
                          </td>
                          <td className="p-2.5 align-top">
                            <div className="space-y-0.5">
                              {d.daftar_shift && d.daftar_shift.length > 0 ? (
                                <span className="text-[11px] font-medium text-slate-700 block">
                                  {d.daftar_shift.length} Shift Terkonfigurasi
                                </span>
                              ) : (
                                <span className="font-mono text-slate-600 text-[11px] block">
                                  {d.jam_masuk_standar} - {d.jam_pulang_standar}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 italic">
                                Edit jam via tombol modal
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 align-top">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="10"
                                max="5000"
                                value={quickEditDudi.radius_meter}
                                onChange={(e) =>
                                  setQuickEditDudi({
                                    ...quickEditDudi,
                                    radius_meter: Number(e.target.value) || 100,
                                  })
                                }
                                className="w-16 px-1.5 py-1 text-xs font-mono font-bold text-emerald-800 border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
                              />
                              <span className="text-[10px] text-slate-500 font-bold">m</span>
                            </div>
                          </td>
                          <td className="p-2.5 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={handleSaveQuickEditDudi}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                title="Simpan Perubahan"
                              >
                                <Check className="w-3 h-3" />
                                <span>Simpan</span>
                              </button>
                              <button
                                type="button"
                                onClick={cancelQuickEdit}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                                title="Batal"
                              >
                                <X className="w-3 h-3" />
                                <span>Batal</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={d.id_dudi} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-slate-400 block">{d.id_dudi}</span>
                          <strong className="text-slate-800">{d.nama_instansi}</strong>
                        </td>
                        <td className="p-3">
                          {d.nama_pembimbing ? (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-800 block text-xs">
                                {d.nama_pembimbing}
                              </span>
                              {d.nomor_wa_pembimbing ? (
                                <a
                                  href={`https://wa.me/${d.nomor_wa_pembimbing.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-medium hover:underline"
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>{d.nomor_wa_pembimbing}</span>
                                </a>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Tanpa No. HP</span>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-slate-400 text-[11px] italic">Belum diatur</span>
                              {d.nomor_wa_pembimbing && (
                                <span className="text-[11px] text-slate-500 block font-mono">
                                  {d.nomor_wa_pembimbing}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 max-w-[180px]">
                          <span className="text-sky-700 font-medium block">{d.bidang}</span>
                          <span className="text-slate-500 text-[11px] truncate block">{d.alamat}</span>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {d.tipe_jadwal || 'Reguler'}
                            </span>
                            <p className="text-[11px] text-slate-600 font-medium">
                              {d.hari_kerja?.join(', ') || 'Senin - Jumat'}
                            </p>
                          </div>
                        </td>
                        <td className="p-3 max-w-[260px]">
                          <div className="space-y-1">
                            {d.daftar_shift && d.daftar_shift.length > 0 ? (
                              d.daftar_shift.map((shift) => (
                                <div
                                  key={shift.id_shift}
                                  className="text-[11px] bg-slate-50 border border-slate-200/80 rounded-md px-2 py-1 flex items-center justify-between gap-1.5"
                                >
                                  <div className="flex items-center gap-1 truncate">
                                    <strong className="text-slate-800 truncate">{shift.nama_shift}:</strong>
                                    {shift.hari_khusus && shift.hari_khusus.length > 0 && (
                                      <span className="text-[9px] px-1 py-0.2 bg-purple-100 text-purple-700 rounded-sm font-semibold">
                                        {shift.hari_khusus.join(',')}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono font-semibold text-slate-600 shrink-0">
                                    {shift.jam_masuk}-{shift.jam_pulang}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="font-mono text-slate-600 text-[11px]">
                                {d.jam_masuk_standar} - {d.jam_pulang_standar}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200 block w-fit">
                            {d.radius_meter}m
                          </span>
                          <span className="font-mono text-[9px] text-slate-400 block mt-0.5">
                            {d.koordinat_lokasi.latitude.toFixed(3)}, {d.koordinat_lokasi.longitude.toFixed(3)}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            id={`btn-quick-edit-dudi-${d.id_dudi}`}
                            type="button"
                            onClick={() => handleStartQuickEditDudi(d)}
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-md transition"
                            title="Quick Edit (Edit Cepat Langsung di Baris)"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDudiModal(d)}
                            className="p-1 text-slate-600 hover:text-sky-600 hover:bg-slate-100 rounded-md"
                            title="Edit DUDI & Shift Lengkap"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-dudi-${d.id_dudi}`}
                            type="button"
                            onClick={() => {
                              const assignedStudents = siswaList.filter((s) => s.id_dudi === d.id_dudi);
                              setDeleteTarget({
                                type: 'dudi',
                                id: d.id_dudi,
                                name: d.nama_instansi,
                                secondaryInfo: `${d.alamat} • Radius: ${d.radius_meter} meter`,
                                countWarning:
                                  assignedStudents.length > 0
                                    ? `Perhatian: Ada ${assignedStudents.length} siswa PKL yang saat ini ditempatkan di tempat DUDI ini.`
                                    : undefined,
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Hapus DUDI"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE SECTION: SISWA */}
      {activeSubTab === 'siswa' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Data Siswa Praktik Kerja Lapangan
            </span>
            <span className="text-[11px] text-slate-400">Terhubung ke DUDI & Guru</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3">NIS & Nama</th>
                  <th className="p-3">Kelas & Jurusan</th>
                  <th className="p-3">Tempat PKL (DUDI)</th>
                  <th className="p-3">Guru Pembimbing</th>
                  <th className="p-3">WhatsApp Ortu</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSiswaList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyStateIllustration
                        type={searchQuery ? 'search' : 'siswa'}
                        searchQuery={searchQuery}
                        onResetSearch={() => setSearchQuery('')}
                        onAddNew={() => handleOpenSiswaModal()}
                        onImport={() => handleOpenImportExport('siswa', 'import')}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredSiswaList.map((s) => {
                    const dudi = dudiList.find((d) => d.id_dudi === s.id_dudi);
                    const guru = guruList.find((g) => g.id_guru === s.id_guru_pembimbing);
                    const isQuickEditing = quickEditSiswa?.id_siswa === s.id_siswa;

                    if (isQuickEditing && quickEditSiswa) {
                      return (
                        <tr key={s.id_siswa} className="bg-amber-50/50 border-y-2 border-amber-300">
                          <td className="p-2.5 align-top">
                            <span className="font-mono text-[10px] text-slate-400 block mb-1">
                              {s.id_siswa} (Quick Edit)
                            </span>
                            <input
                              type="text"
                              value={quickEditSiswa.nama_lengkap}
                              onChange={(e) =>
                                setQuickEditSiswa({ ...quickEditSiswa, nama_lengkap: e.target.value })
                              }
                              placeholder="Nama Lengkap Siswa"
                              className="w-full px-2 py-1 text-xs font-bold border border-amber-300 rounded-lg bg-white mb-1 focus:ring-2 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={quickEditSiswa.nis}
                              onChange={(e) =>
                                setQuickEditSiswa({ ...quickEditSiswa, nis: e.target.value })
                              }
                              placeholder="NIS Siswa"
                              className="w-full px-2 py-1 text-[11px] font-mono border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                          <td className="p-2.5 align-top">
                            <input
                              type="text"
                              value={quickEditSiswa.kelas}
                              onChange={(e) =>
                                setQuickEditSiswa({ ...quickEditSiswa, kelas: e.target.value })
                              }
                              placeholder="Kelas (XII RPL 1)"
                              className="w-full px-2 py-1 text-xs font-semibold border border-slate-300 rounded-lg bg-white mb-1 focus:ring-1 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={quickEditSiswa.jurusan}
                              onChange={(e) =>
                                setQuickEditSiswa({ ...quickEditSiswa, jurusan: e.target.value })
                              }
                              placeholder="Jurusan"
                              className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500 text-slate-600"
                            />
                          </td>
                          <td className="p-2.5 align-top">
                            <select
                              value={quickEditSiswa.id_dudi}
                              onChange={(e) =>
                                setQuickEditSiswa({ ...quickEditSiswa, id_dudi: e.target.value })
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">-- Pilih DUDI Mitra --</option>
                              {dudiList.map((d) => (
                                <option key={d.id_dudi} value={d.id_dudi}>
                                  {d.nama_instansi}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Lokasi penempatan magang
                            </span>
                          </td>
                          <td className="p-2.5 align-top">
                            <select
                              value={quickEditSiswa.id_guru_pembimbing}
                              onChange={(e) =>
                                setQuickEditSiswa({
                                  ...quickEditSiswa,
                                  id_guru_pembimbing: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="">-- Pilih Guru Pembimbing --</option>
                              {guruList.map((g) => (
                                <option key={g.id_guru} value={g.id_guru}>
                                  {g.nama_guru}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Pembimbing pemantau PKL
                            </span>
                          </td>
                          <td className="p-2.5 align-top">
                            <input
                              type="text"
                              value={quickEditSiswa.nomor_wa_ortu}
                              onChange={(e) =>
                                setQuickEditSiswa({ ...quickEditSiswa, nomor_wa_ortu: e.target.value })
                              }
                              placeholder="WA Ortu (08...)"
                              className="w-full px-2 py-1 text-[11px] font-mono border border-slate-300 rounded-lg bg-white mb-1 focus:ring-1 focus:ring-amber-500 text-emerald-800"
                            />
                            <input
                              type="text"
                              value={quickEditSiswa.nomor_wa}
                              onChange={(e) =>
                                setQuickEditSiswa({ ...quickEditSiswa, nomor_wa: e.target.value })
                              }
                              placeholder="WA Siswa"
                              className="w-full px-2 py-1 text-[11px] font-mono border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500 text-slate-600"
                            />
                          </td>
                          <td className="p-2.5 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={handleSaveQuickEditSiswa}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                title="Simpan Perubahan"
                              >
                                <Check className="w-3 h-3" />
                                <span>Simpan</span>
                              </button>
                              <button
                                type="button"
                                onClick={cancelQuickEdit}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                                title="Batal"
                              >
                                <X className="w-3 h-3" />
                                <span>Batal</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={s.id_siswa} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {s.nis} ({s.id_siswa})
                          </span>
                          {onSelectSiswaDetail ? (
                            <button
                              type="button"
                              onClick={() => onSelectSiswaDetail(s)}
                              className="text-left group cursor-pointer block"
                              title="Lihat profil detail siswa & histori presensi"
                            >
                              <div className="flex items-center gap-1">
                                <strong className="text-slate-800 group-hover:text-sky-600 group-hover:underline transition-colors block">
                                  {s.nama_lengkap}
                                </strong>
                                <Eye className="w-3 h-3 text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </div>
                            </button>
                          ) : (
                            <strong className="text-slate-800">{s.nama_lengkap}</strong>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-700 block">{s.kelas}</span>
                          <span className="text-slate-500 text-[11px]">{s.jurusan}</span>
                        </td>
                        <td className="p-3 text-slate-700">
                          {dudi?.nama_instansi || s.id_dudi}
                        </td>
                        <td className="p-3 text-slate-700">
                          {guru?.nama_guru || s.id_guru_pembimbing}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-emerald-700">
                          {s.nomor_wa_ortu}
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            id={`btn-quick-edit-siswa-${s.id_siswa}`}
                            type="button"
                            onClick={() => handleStartQuickEditSiswa(s)}
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-md transition"
                            title="Quick Edit (Edit Cepat Langsung di Baris)"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                          {onSelectSiswaDetail && (
                            <button
                              type="button"
                              onClick={() => onSelectSiswaDetail(s)}
                              className="p-1 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-md"
                              title="Lihat Profil & Histori Presensi Individual"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenSiswaModal(s)}
                            className="p-1 text-slate-600 hover:text-sky-600 hover:bg-slate-100 rounded-md"
                            title="Edit Siswa Lengkap"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-siswa-${s.id_siswa}`}
                            type="button"
                            onClick={() => {
                              const dudi = dudiList.find((d) => d.id_dudi === s.id_dudi);
                              const guru = guruList.find((g) => g.id_guru === s.id_guru_pembimbing);
                              setDeleteTarget({
                                type: 'siswa',
                                id: s.id_siswa,
                                name: s.nama_lengkap,
                                secondaryInfo: `NIS: ${s.nis} • Kelas: ${s.kelas} ${s.jurusan}${
                                  dudi ? ` • DUDI: ${dudi.nama_instansi}` : ''
                                }${guru ? ` • Pembimbing: ${guru.nama_guru}` : ''}`,
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE SECTION: GURU */}
      {activeSubTab === 'guru' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Data Guru Pembimbing PKL
            </span>
            <span className="text-[11px] text-slate-400">Verifikator Logbook & Monitoring</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3">ID & Nama Guru</th>
                  <th className="p-3">Nama Siswa yang Dibimbing</th>
                  <th className="p-3">Nomor WhatsApp</th>
                  <th className="p-3">Jadwal Kunjungan ke Tempat DUDI</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGuruList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <EmptyStateIllustration
                        type={searchQuery ? 'search' : 'guru'}
                        searchQuery={searchQuery}
                        onResetSearch={() => setSearchQuery('')}
                        onAddNew={() => handleOpenGuruModal()}
                        onImport={() => handleOpenImportExport('guru', 'import')}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredGuruList.map((g) => {
                    const isQuickEditing = quickEditGuru?.id_guru === g.id_guru;

                    if (isQuickEditing && quickEditGuru) {
                      return (
                        <tr key={g.id_guru} className="bg-amber-50/50 border-y-2 border-amber-300">
                          <td className="p-2.5 align-top">
                            <span className="font-mono text-[10px] text-slate-400 block mb-1">
                              {g.id_guru} (Quick Edit)
                            </span>
                            <input
                              type="text"
                              value={quickEditGuru.nama_guru}
                              onChange={(e) =>
                                setQuickEditGuru({ ...quickEditGuru, nama_guru: e.target.value })
                              }
                              placeholder="Nama Lengkap Guru"
                              className="w-full px-2 py-1 text-xs font-bold border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500"
                            />
                          </td>
                          <td className="p-2.5 align-top">
                            <input
                              type="text"
                              value={quickEditGuru.siswa_bimbingan}
                              onChange={(e) =>
                                setQuickEditGuru({ ...quickEditGuru, siswa_bimbingan: e.target.value })
                              }
                              placeholder="Daftar nama siswa bimbingan..."
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500 text-slate-700"
                            />
                            <span className="text-[10px] text-slate-400 block mt-1">
                              Pisahkan dengan tanda koma (,)
                            </span>
                          </td>
                          <td className="p-2.5 align-top">
                            <input
                              type="text"
                              value={quickEditGuru.nomor_wa}
                              onChange={(e) =>
                                setQuickEditGuru({ ...quickEditGuru, nomor_wa: e.target.value })
                              }
                              placeholder="Nomor WA (08...)"
                              className="w-full px-2 py-1 text-[11px] font-mono border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500 text-emerald-800"
                            />
                          </td>
                          <td className="p-2.5 align-top">
                            <input
                              type="text"
                              value={quickEditGuru.jadwal_kunjungan}
                              onChange={(e) =>
                                setQuickEditGuru({ ...quickEditGuru, jadwal_kunjungan: e.target.value })
                              }
                              placeholder="Jadwal (misal: Setiap Kamis)"
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-amber-500"
                            />
                          </td>
                          <td className="p-2.5 align-top text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={handleSaveQuickEditGuru}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                title="Simpan Perubahan"
                              >
                                <Check className="w-3 h-3" />
                                <span>Simpan</span>
                              </button>
                              <button
                                type="button"
                                onClick={cancelQuickEdit}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                                title="Batal"
                              >
                                <X className="w-3 h-3" />
                                <span>Batal</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    // Fallback: lookup direct pupils from siswaList if siswa_bimbingan is blank
                    const pupilsFromList = siswaList
                      .filter((s) => s.id_guru_pembimbing === g.id_guru)
                      .map((s) => s.nama_lengkap)
                      .join(', ');
                    const displayedPupils = g.siswa_bimbingan || pupilsFromList || 'Belum ada bimbingan';

                    return (
                      <tr key={g.id_guru} className="hover:bg-slate-50/60">
                        <td className="p-3">
                          <span className="font-mono text-[10px] text-slate-400 block">{g.id_guru}</span>
                          <strong className="text-slate-800">{g.nama_guru}</strong>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-medium">
                              <GraduationCap className="w-3 h-3 text-sky-600 shrink-0" />
                              <span>{displayedPupils}</span>
                            </span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-emerald-700">{g.nomor_wa}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                            <Calendar className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{g.jadwal_kunjungan || 'Belum diatur'}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            id={`btn-quick-edit-guru-${g.id_guru}`}
                            type="button"
                            onClick={() => handleStartQuickEditGuru(g)}
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-md transition"
                            title="Quick Edit (Edit Cepat Langsung di Baris)"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenGuruModal(g)}
                            className="p-1 text-slate-600 hover:text-sky-600 hover:bg-slate-100 rounded-md"
                            title="Edit Guru Lengkap"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`btn-delete-guru-${g.id_guru}`}
                            type="button"
                            onClick={() => {
                              const pupils = siswaList.filter((s) => s.id_guru_pembimbing === g.id_guru);
                              setDeleteTarget({
                                type: 'guru',
                                id: g.id_guru,
                                name: g.nama_guru,
                                secondaryInfo: `WhatsApp: ${g.nomor_wa || '-'} • Jadwal: ${
                                  g.jadwal_kunjungan || 'Belum diatur'
                                }`,
                                countWarning:
                                  pupils.length > 0
                                    ? `Perhatian: Ada ${pupils.length} siswa bimbingan yang terhubung dengan guru ini.`
                                    : undefined,
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABLE SECTION: AKUN & PASSWORD */}
      {activeSubTab === 'akun' && (
        <div className="space-y-4">
          {/* Card Pengaturan Kontak & WhatsApp Admin untuk Halaman Login */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pengaturan Kontak WhatsApp Admin (Bantuan Login)</h3>
                <p className="text-xs text-slate-500">
                  Nomor ini akan otomatis muncul saat siswa atau pengguna mengklik <strong>"Hubungi Admin"</strong> di halaman login jika mereka butuh bantuan atau lupa kata sandi.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAdminContactSubmit} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nomor WhatsApp Admin / Panitia
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      id="input-admin-phone"
                      value={adminContactForm.adminPhone}
                      onChange={(e) =>
                        setAdminContactForm((prev) => ({ ...prev, adminPhone: e.target.value }))
                      }
                      placeholder="081234567890"
                      className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Admin / Koordinator PKL
                  </label>
                  <input
                    type="text"
                    id="input-admin-name"
                    value={adminContactForm.adminName}
                    onChange={(e) =>
                      setAdminContactForm((prev) => ({ ...prev, adminName: e.target.value }))
                    }
                    placeholder="Budi Santoso, S.Kom"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pesan Pembuka Bantuan
                  </label>
                  <input
                    type="text"
                    id="input-admin-default-message"
                    value={adminContactForm.defaultMessage}
                    onChange={(e) =>
                      setAdminContactForm((prev) => ({ ...prev, defaultMessage: e.target.value }))
                    }
                    placeholder="Halo Admin, saya butuh bantuan login..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {adminContactSaved ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Nomor WhatsApp Admin berhasil disimpan & diperbarui di Halaman Login!
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Perubahan langsung aktif seketika di formulir login tanpa perlu restart server.
                  </span>
                )}
                <button
                  type="submit"
                  id="btn-simpan-kontak-admin"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Kontak Admin</span>
                </button>
              </div>
            </form>
          </div>

          {/* Pengaturan Akun & Password Massal (Guru, Siswa, DUDI, Admin) */}
          <BulkAccountManager
            usersList={usersList}
            siswaList={siswaList}
            guruList={guruList}
            dudiList={dudiList}
            onUsersChange={setUsersList}
          />
        </div>
      )}

      {/* MODAL DUDI */}
      {isDudiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingDudi ? 'Edit Data DUDI & Konfigurasi Jam Kerja' : 'Tambah DUDI Baru'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Konfigurasi lokasi geofence, hari operasional, dan sistem shift / jam kondisional.
                </p>
              </div>
              <button
                onClick={() => setIsDudiModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingDudi && (
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between gap-2 mt-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="text-[11px] text-sky-900 font-medium">
                    Punya banyak data DUDI? Impor massal dari file Excel (.xlsx) atau CSV
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDudiModalOpen(false);
                    handleOpenImportExport('dudi', 'import');
                  }}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 shadow-2xs"
                >
                  <Upload className="w-3 h-3" />
                  <span>Impor Excel</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveDudiSubmit} className="mt-4 space-y-4 text-xs">
              {/* Instansi Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Instansi / Perusahaan:</label>
                  <input
                    type="text"
                    value={dudiForm.nama_instansi}
                    onChange={(e) => setDudiForm({ ...dudiForm, nama_instansi: e.target.value })}
                    placeholder="PT Telkom Indonesia..."
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bidang Usaha:</label>
                  <input
                    type="text"
                    value={dudiForm.bidang}
                    onChange={(e) => setDudiForm({ ...dudiForm, bidang: e.target.value })}
                    placeholder="Teknologi Informasi / Jaringan"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              {/* Pembimbing / Penanggung Jawab DUDI & Kontak */}
              <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-200/70 space-y-2">
                <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                  <Users className="w-3.5 h-3.5 text-sky-600" />
                  <span>Pembimbing / Penanggung Jawab DUDI &amp; Kontak:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nama Pembimbing / PIC DUDI:
                    </label>
                    <input
                      type="text"
                      value={dudiForm.nama_pembimbing}
                      onChange={(e) => setDudiForm({ ...dudiForm, nama_pembimbing: e.target.value })}
                      placeholder="Contoh: Hendra Wijaya, S.T."
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nomor HP / WhatsApp Pembimbing DUDI:
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={dudiForm.nomor_wa_pembimbing}
                        onChange={(e) => setDudiForm({ ...dudiForm, nomor_wa_pembimbing: e.target.value })}
                        placeholder="081399887766"
                        className="w-full pl-8 pr-2 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Lengkap:</label>
                <input
                  type="text"
                  value={dudiForm.alamat}
                  onChange={(e) => setDudiForm({ ...dudiForm, alamat: e.target.value })}
                  placeholder="Jl. Ketintang No. 156, Gayungan, Surabaya"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  required
                />
              </div>

              {/* Geofence Location Coordinates */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Geofencing Presensi (Koordinat & Radius)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Latitude:</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={dudiForm.latitude}
                      onChange={(e) => setDudiForm({ ...dudiForm, latitude: parseFloat(e.target.value) })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Longitude:</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={dudiForm.longitude}
                      onChange={(e) => setDudiForm({ ...dudiForm, longitude: parseFloat(e.target.value) })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">Radius Max (meter):</label>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={dudiForm.radius_meter}
                      onChange={(e) => setDudiForm({ ...dudiForm, radius_meter: parseInt(e.target.value, 10) || 100 })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Hari Kerja Operasional */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Hari Kerja Aktif Siswa:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSetPresetHari('5hari')}
                      className="px-2 py-0.5 rounded bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 text-[10px] font-semibold"
                    >
                      5 Hari (Sen-Jum)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPresetHari('6hari')}
                      className="px-2 py-0.5 rounded bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 text-[10px] font-semibold"
                    >
                      6 Hari (Sen-Sab)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPresetHari('7hari')}
                      className="px-2 py-0.5 rounded bg-white text-slate-700 hover:bg-slate-200 border border-slate-200 text-[10px] font-semibold"
                    >
                      Semua Hari
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {NAMA_HARI_INDONESIA.map((hari) => {
                    const isSelected = dudiForm.hari_kerja.includes(hari);
                    return (
                      <button
                        key={hari}
                        type="button"
                        onClick={() => handleToggleHari(hari)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{hari}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipe Jadwal Kerja */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sistem Pengaturan Jam Kerja:</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDudiForm({ ...dudiForm, tipe_jadwal: 'Reguler' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      dudiForm.tipe_jadwal === 'Reguler'
                        ? 'border-sky-500 bg-sky-50/70 ring-1 ring-sky-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>Reguler</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      1 jam kerja standar setiap hari
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDudiForm({ ...dudiForm, tipe_jadwal: 'Shift' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      dudiForm.tipe_jadwal === 'Shift'
                        ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Sun className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Sistem Shift</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Pagi / Siang / Malam bergilir
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDudiForm({ ...dudiForm, tipe_jadwal: 'Kondisional' })}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      dudiForm.tipe_jadwal === 'Kondisional'
                        ? 'border-purple-500 bg-purple-50/70 ring-1 ring-purple-500'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <Clock4 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Kondisional</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Jam beda di hari tertentu (misal Jumat)
                    </p>
                  </button>
                </div>
              </div>

              {/* Shift & Conditional Hours List */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      {dudiForm.tipe_jadwal === 'Shift'
                        ? 'Daftar Shift Kerja'
                        : dudiForm.tipe_jadwal === 'Kondisional'
                        ? 'Daftar Jam Kerja Kondisional'
                        : 'Jam Kerja Reguler'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Siswa akan memilih atau otomatis disesuaikan dengan jadwal ini saat presensi.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddShift}
                    className="px-2.5 py-1 bg-slate-900 text-sky-400 hover:bg-slate-800 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah {dudiForm.tipe_jadwal === 'Shift' ? 'Shift' : 'Jadwal'}</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {dudiForm.daftar_shift.map((shift, idx) => (
                    <div
                      key={shift.id_shift || idx}
                      className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Nama Shift / Jadwal #{idx + 1}:
                          </label>
                          <input
                            type="text"
                            value={shift.nama_shift}
                            onChange={(e) => handleUpdateShift(idx, { nama_shift: e.target.value })}
                            placeholder="Contoh: Shift 1 (Pagi) / Jadwal Khusus Jumat"
                            className="w-full p-1.5 text-xs font-semibold text-slate-800 border border-slate-300 rounded-md"
                            required
                          />
                        </div>

                        {dudiForm.daftar_shift.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteShift(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg self-end"
                            title="Hapus Shift"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                            Jam Masuk:
                          </label>
                          <input
                            type="time"
                            value={shift.jam_masuk}
                            onChange={(e) => handleUpdateShift(idx, { jam_masuk: e.target.value })}
                            className="w-full p-1.5 text-xs font-mono border border-slate-300 rounded-md"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                            Jam Pulang:
                          </label>
                          <input
                            type="time"
                            value={shift.jam_pulang}
                            onChange={(e) => handleUpdateShift(idx, { jam_pulang: e.target.value })}
                            className="w-full p-1.5 text-xs font-mono border border-slate-300 rounded-md"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                            Toleransi (Menit):
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={shift.toleransi_keterlambatan_menit}
                            onChange={(e) =>
                              handleUpdateShift(idx, {
                                toleransi_keterlambatan_menit: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full p-1.5 text-xs font-mono border border-slate-300 rounded-md"
                            required
                          />
                        </div>
                      </div>

                      {/* If Kondisional, allow selecting specific days */}
                      {dudiForm.tipe_jadwal === 'Kondisional' && (
                        <div className="pt-1.5 border-t border-slate-100">
                          <label className="text-[10px] font-bold text-purple-700 block mb-1">
                            Berlaku Pada Hari Khusus:
                          </label>
                          <div className="flex flex-wrap gap-1">
                            {NAMA_HARI_INDONESIA.map((day) => {
                              const activeDays = shift.hari_khusus || [];
                              const isChecked = activeDays.includes(day);
                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const nextDays = isChecked
                                      ? activeDays.filter((d) => d !== day)
                                      : [...activeDays, day];
                                    handleUpdateShift(idx, { hari_khusus: nextDays });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                                    isChecked
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDudiModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-sky-400 hover:text-white hover:bg-slate-800 font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan DUDI & Jadwal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SISWA */}
      {isSiswaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSiswa ? 'Edit Data Siswa' : 'Tambah Siswa PKL'}
              </h3>
              <button
                onClick={() => setIsSiswaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingSiswa && (
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between gap-2 mt-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="text-[11px] text-sky-900 font-medium">
                    Punya banyak siswa? Impor massal dari file Excel (.xlsx) atau CSV
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsSiswaModalOpen(false);
                    handleOpenImportExport('siswa', 'import');
                  }}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 shadow-2xs"
                >
                  <Upload className="w-3 h-3" />
                  <span>Impor Excel</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveSiswaSubmit} className="mt-4 space-y-3 text-xs">
              {/* Foto Profil Siswa Upload & Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0 font-bold text-slate-500 text-lg relative">
                  {siswaForm.foto_profil ? (
                    <img
                      src={siswaForm.foto_profil}
                      alt={siswaForm.nama_lengkap || 'Foto Siswa'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{siswaForm.nama_lengkap ? siswaForm.nama_lengkap.charAt(0) : 'S'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <label className="font-bold text-slate-700 block text-[11px]">
                    Foto Profil Siswa:
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs">
                      <Upload className="w-3 h-3" />
                      <span>{siswaForm.foto_profil ? 'Ganti Foto' : 'Unggah Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const res = await compressImageFile(file, undefined, {
                                maxWidth: 600,
                                maxHeight: 600,
                                quality: 0.82,
                              });
                              setSiswaForm((prev) => ({ ...prev, foto_profil: res.dataUrl }));
                            } catch (err) {
                              console.error(err);
                              alert('Gagal memproses foto.');
                            }
                          }
                        }}
                      />
                    </label>
                    {siswaForm.foto_profil && (
                      <button
                        type="button"
                        onClick={() => setSiswaForm((prev) => ({ ...prev, foto_profil: '' }))}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[11px] font-medium transition cursor-pointer"
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Siswa:</label>
                <input
                  type="text"
                  value={siswaForm.nama_lengkap}
                  onChange={(e) => setSiswaForm({ ...siswaForm, nama_lengkap: e.target.value })}
                  placeholder="Nama..."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NIS:</label>
                  <input
                    type="text"
                    value={siswaForm.nis}
                    onChange={(e) => setSiswaForm({ ...siswaForm, nis: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kelas:</label>
                  <input
                    type="text"
                    value={siswaForm.kelas}
                    onChange={(e) => setSiswaForm({ ...siswaForm, kelas: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jurusan / Keahlian:</label>
                <input
                  type="text"
                  value={siswaForm.jurusan}
                  onChange={(e) => setSiswaForm({ ...siswaForm, jurusan: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Penempatan DUDI:</label>
                  <select
                    value={siswaForm.id_dudi}
                    onChange={(e) => setSiswaForm({ ...siswaForm, id_dudi: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {dudiList.map((d) => (
                      <option key={d.id_dudi} value={d.id_dudi}>
                        {d.nama_instansi}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Guru Pembimbing:</label>
                  <select
                    value={siswaForm.id_guru_pembimbing}
                    onChange={(e) => setSiswaForm({ ...siswaForm, id_guru_pembimbing: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {guruList.map((g) => (
                      <option key={g.id_guru} value={g.id_guru}>
                        {g.nama_guru}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp Siswa:</label>
                  <input
                    type="text"
                    value={siswaForm.nomor_wa}
                    onChange={(e) => setSiswaForm({ ...siswaForm, nomor_wa: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">WhatsApp Orang Tua:</label>
                  <input
                    type="text"
                    value={siswaForm.nomor_wa_ortu}
                    onChange={(e) => setSiswaForm({ ...siswaForm, nomor_wa_ortu: e.target.value })}
                    placeholder="Untuk notifikasi Fonnte"
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSiswaModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GURU */}
      {isGuruModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingGuru ? 'Edit Guru Pembimbing' : 'Tambah Guru Pembimbing'}
              </h3>
              <button
                onClick={() => setIsGuruModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!editingGuru && (
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between gap-2 mt-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="text-[11px] text-sky-900 font-medium">
                    Punya banyak guru pembimbing? Impor massal dari file Excel / CSV
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsGuruModalOpen(false);
                    handleOpenImportExport('guru', 'import');
                  }}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-bold shrink-0 transition flex items-center gap-1 shadow-2xs"
                >
                  <Upload className="w-3 h-3" />
                  <span>Impor Excel</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveGuruSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Guru & Gelar:</label>
                <input
                  type="text"
                  value={guruForm.nama_guru}
                  onChange={(e) => setGuruForm({ ...guruForm, nama_guru: e.target.value })}
                  placeholder="Nama, M.Pd"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Siswa yang Dibimbing:
                </label>
                <input
                  type="text"
                  value={guruForm.siswa_bimbingan}
                  onChange={(e) => setGuruForm({ ...guruForm, siswa_bimbingan: e.target.value })}
                  placeholder="Contoh: Budi Santoso (XII RPL 1), Siti Rahma (XII RPL 1)"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
                {/* Quick Add Helper Chips from Siswa List */}
                {siswaList.length > 0 && (
                  <div className="mt-1.5">
                    <span className="text-[10px] text-slate-400 block mb-1">
                      Klik nama siswa untuk menambahkan ke daftar bimbingan:
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                      {siswaList.map((s) => {
                        const isIncluded = guruForm.siswa_bimbingan.includes(s.nama_lengkap);
                        return (
                          <button
                            key={s.id_siswa}
                            type="button"
                            onClick={() => {
                              if (isIncluded) {
                                // remove
                                const next = guruForm.siswa_bimbingan
                                  .split(',')
                                  .map((x) => x.trim())
                                  .filter((x) => !x.includes(s.nama_lengkap))
                                  .join(', ');
                                setGuruForm({ ...guruForm, siswa_bimbingan: next });
                              } else {
                                // add
                                const next = guruForm.siswa_bimbingan
                                  ? `${guruForm.siswa_bimbingan}, ${s.nama_lengkap} (${s.kelas})`
                                  : `${s.nama_lengkap} (${s.kelas})`;
                                setGuruForm({ ...guruForm, siswa_bimbingan: next });
                              }
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                              isIncluded
                                ? 'bg-sky-600 text-white font-bold'
                                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {isIncluded ? '✓ ' : '+ '}
                            {s.nama_lengkap}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp Guru:</label>
                <input
                  type="text"
                  value={guruForm.nomor_wa}
                  onChange={(e) => setGuruForm({ ...guruForm, nomor_wa: e.target.value })}
                  placeholder="081234567890"
                  className="w-full p-2 border border-slate-300 rounded-lg font-mono text-xs"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Jadwal Kunjungan ke Tempat DUDI:
                </label>
                <input
                  type="text"
                  value={guruForm.jadwal_kunjungan}
                  onChange={(e) => setGuruForm({ ...guruForm, jadwal_kunjungan: e.target.value })}
                  placeholder="Contoh: Setiap Selasa & Kamis (Pkl 10:00 WIB)"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  required
                />
                {/* Preset Suggestions */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[
                    'Setiap Selasa & Kamis',
                    'Setiap Rabu & Jumat',
                    'Setiap Senin & Kamis',
                    '2 Minggu Sekali',
                    '1 Bulan Sekali',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGuruForm({ ...guruForm, jadwal_kunjungan: `${preset} (Pkl 10:00 WIB)` })}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-600 border border-slate-200 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGuruModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white font-bold"
                >
                  Simpan Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT / EXPORT MODAL FOR DUDI, SISWA, GURU */}
      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        type={importExportTargetType}
        initialMode={importExportMode}
        siswaList={siswaList}
        dudiList={dudiList}
        guruList={guruList}
        onImportSiswa={handleBatchImportSiswa}
        onImportDUDI={handleBatchImportDUDI}
        onImportGuru={handleBatchImportGuru}
      />

      {/* APP BRANDING & LOGO CUSTOMIZATION MODAL */}
      <AppBrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
        config={branding}
        onSave={updateBranding}
        onReset={resetBranding}
      />

      {/* CONFIRMATION DELETE DIALOG MODAL */}
      {deleteTarget && (
        <div
          id="modal-delete-confirmation-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            id="modal-delete-confirmation"
            className="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Konfirmasi Hapus Data
                  </h3>
                  <button
                    id="btn-close-delete-modal"
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus data{' '}
                  <span className="font-semibold text-slate-700">
                    {deleteTarget.type === 'siswa'
                      ? 'Siswa'
                      : deleteTarget.type === 'guru'
                      ? 'Guru Pembimbing'
                      : 'Tempat DUDI'}
                  </span>{' '}
                  ini?
                </p>
              </div>
            </div>

            {/* Target Details Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                  {deleteTarget.type === 'siswa'
                    ? 'Data Siswa PKL'
                    : deleteTarget.type === 'guru'
                    ? 'Data Guru Pembimbing'
                    : 'Data Mitra DUDI'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-600">
                  ID: {deleteTarget.id}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 break-words">
                {deleteTarget.name}
              </p>
              {deleteTarget.secondaryInfo && (
                <p className="text-xs text-slate-500 break-words">
                  {deleteTarget.secondaryInfo}
                </p>
              )}
            </div>

            {/* Warning Alert if children / linked records exist */}
            {deleteTarget.countWarning && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>{deleteTarget.countWarning}</p>
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center gap-2 text-[11px] text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>Tindakan ini permanen dan akan menghapus rekaman terkait dari sistem.</span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-delete"
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-delete"
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
