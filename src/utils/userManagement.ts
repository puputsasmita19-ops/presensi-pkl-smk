import { User, Siswa, GuruPembimbing, DUDI } from '../types';
import { INITIAL_USERS } from '../data/initialData';

const USERS_STORAGE_KEY = 'presensi_pkl_users_v2';
const ADMIN_CONTACT_KEY = 'presensi_pkl_admin_contact_v2';

export interface AdminContactSettings {
  adminPhone: string;
  adminName: string;
  defaultMessage: string;
}

const DEFAULT_ADMIN_CONTACT: AdminContactSettings = {
  adminPhone: '081234567891',
  adminName: 'Budi Santoso, S.Kom (Koordinator PKL)',
  defaultMessage: 'Halo Admin, saya butuh bantuan terkait akun login presensi PKL (Lupa password / kendala akun).',
};

/**
 * Get all stored users with persistent passwords
 */
export function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return INITIAL_USERS;
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error reading stored users:', err);
  }
  return INITIAL_USERS;
}

/**
 * Save users list to localStorage
 */
export function saveStoredUsers(users: User[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving stored users:', err);
  }
}

/**
 * Sinkronkan seluruh data Siswa, Guru, dan DUDI ke daftar Akun Login
 * Memastikan semua entitas memiliki akun tanpa menghapus password yang sudah diubah.
 */
export function syncUsersWithEntities(
  siswaList: Siswa[] = [],
  guruList: GuruPembimbing[] = [],
  dudiList: DUDI[] = []
): User[] {
  const currentUsers = getStoredUsers();
  const updatedUsers: User[] = [...currentUsers];

  // 1. Pastikan Admin selalu ada
  const hasAdmin = updatedUsers.some((u) => u.role === 'Admin');
  if (!hasAdmin) {
    const defaultAdmin = INITIAL_USERS.find((u) => u.role === 'Admin');
    if (defaultAdmin) {
      updatedUsers.unshift(defaultAdmin);
    }
  }

  // 2. Sinkronkan Siswa
  siswaList.forEach((siswa) => {
    const existingIndex = updatedUsers.findIndex(
      (u) => u.id_user === siswa.id_user || (siswa.nis && u.username === siswa.nis)
    );
    if (existingIndex >= 0) {
      // Perbarui nama & wa jika ada update
      updatedUsers[existingIndex] = {
        ...updatedUsers[existingIndex],
        nama_lengkap: siswa.nama_lengkap || updatedUsers[existingIndex].nama_lengkap,
        nomor_wa: siswa.nomor_wa || updatedUsers[existingIndex].nomor_wa,
      };
    } else {
      const cleanNis = siswa.nis ? siswa.nis.replace(/\s+/g, '') : '';
      const fallbackUser = cleanNis ? `siswa_${cleanNis}` : `siswa_${siswa.id_siswa.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      updatedUsers.push({
        id_user: siswa.id_user || `USR-SISWA-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username: fallbackUser,
        password_hash: cleanNis || 'siswa123',
        role: 'Siswa',
        nama_lengkap: siswa.nama_lengkap,
        nomor_wa: siswa.nomor_wa || '',
      });
    }
  });

  // 3. Sinkronkan Guru Pembimbing
  guruList.forEach((guru) => {
    const existingIndex = updatedUsers.findIndex((u) => u.id_user === guru.id_user);
    if (existingIndex >= 0) {
      updatedUsers[existingIndex] = {
        ...updatedUsers[existingIndex],
        nama_lengkap: guru.nama_guru || updatedUsers[existingIndex].nama_lengkap,
        nomor_wa: guru.nomor_wa || updatedUsers[existingIndex].nomor_wa,
      };
    } else {
      const cleanNip = guru.nip ? guru.nip.replace(/\s+/g, '') : '';
      const fallbackUser = cleanNip
        ? `guru_${cleanNip}`
        : `guru_${guru.id_guru.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      updatedUsers.push({
        id_user: guru.id_user || `USR-GURU-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username: fallbackUser,
        password_hash: cleanNip || 'guru123',
        role: 'Guru Pembimbing',
        nama_lengkap: guru.nama_guru,
        nomor_wa: guru.nomor_wa || '',
      });
    }
  });

  // 4. Sinkronkan DUDI
  dudiList.forEach((dudi) => {
    const existingIndex = updatedUsers.findIndex(
      (u) => u.id_dudi === dudi.id_dudi || u.id_user === `USR-DUDI-${dudi.id_dudi}`
    );
    if (existingIndex >= 0) {
      updatedUsers[existingIndex] = {
        ...updatedUsers[existingIndex],
        id_dudi: dudi.id_dudi,
        nama_lengkap: `Pembimbing DUDI ${dudi.nama_instansi}`,
      };
    } else {
      const cleanId = dudi.id_dudi.toLowerCase().replace(/[^a-z0-9]/g, '');
      updatedUsers.push({
        id_user: `USR-DUDI-${dudi.id_dudi}`,
        username: `dudi_${cleanId}`,
        password_hash: 'dudi123',
        role: 'DUDI',
        nama_lengkap: `Pembimbing DUDI ${dudi.nama_instansi}`,
        nomor_wa: '',
        id_dudi: dudi.id_dudi,
      });
    }
  });

  saveStoredUsers(updatedUsers);
  return updatedUsers;
}

/**
 * Update single user password
 */
export function updateUserPassword(id_user: string, newPassword: string): User[] {
  const users = getStoredUsers();
  const updated = users.map((u) => {
    if (u.id_user === id_user) {
      return { ...u, password_hash: newPassword };
    }
    return u;
  });
  saveStoredUsers(updated);
  return updated;
}

/**
 * Update single user username & details
 */
export function updateUserAccount(
  id_user: string,
  updatedData: Partial<Pick<User, 'username' | 'password_hash' | 'nama_lengkap' | 'nomor_wa'>>
): User[] {
  const users = getStoredUsers();
  const updated = users.map((u) => {
    if (u.id_user === id_user) {
      return { ...u, ...updatedData };
    }
    return u;
  });
  saveStoredUsers(updated);
  return updated;
}

/**
 * Reset kata sandi secara massal (Bulk Password Reset)
 */
export function bulkResetPasswords(
  userIds: string[],
  mode: 'custom' | 'nis_nip' | 'default_role' | 'random',
  customPassword?: string,
  siswaList: Siswa[] = [],
  guruList: GuruPembimbing[] = []
): User[] {
  const users = getStoredUsers();
  const idSet = new Set(userIds);

  const generateRandomPass = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const updated = users.map((u) => {
    if (!idSet.has(u.id_user)) {
      return u;
    }

    let newPass = u.password_hash;

    switch (mode) {
      case 'custom':
        newPass = customPassword && customPassword.trim() ? customPassword.trim() : 'smk123';
        break;

      case 'nis_nip': {
        if (u.role === 'Siswa') {
          const s = siswaList.find((item) => item.id_user === u.id_user);
          newPass = s?.nis?.trim() || 'siswa123';
        } else if (u.role === 'Guru Pembimbing') {
          const g = guruList.find((item) => item.id_user === u.id_user);
          newPass = g?.nip?.trim() || 'guru123';
        } else if (u.role === 'DUDI') {
          newPass = 'dudi123';
        } else {
          newPass = 'admin123';
        }
        break;
      }

      case 'default_role': {
        if (u.role === 'Siswa') newPass = 'siswa123';
        else if (u.role === 'Guru Pembimbing') newPass = 'guru123';
        else if (u.role === 'DUDI') newPass = 'dudi123';
        else newPass = 'admin123';
        break;
      }

      case 'random':
        newPass = generateRandomPass();
        break;

      default:
        break;
    }

    return { ...u, password_hash: newPass };
  });

  saveStoredUsers(updated);
  return updated;
}

/**
 * Reset username secara massal (misal siswa ke NIS, guru ke NIP / format standar)
 */
export function bulkResetUsernames(
  userIds: string[],
  mode: 'nis_nip' | 'standard_prefix',
  siswaList: Siswa[] = [],
  guruList: GuruPembimbing[] = []
): User[] {
  const users = getStoredUsers();
  const idSet = new Set(userIds);

  const updated = users.map((u) => {
    if (!idSet.has(u.id_user)) return u;

    let newUsername = u.username;
    if (mode === 'nis_nip') {
      if (u.role === 'Siswa') {
        const s = siswaList.find((item) => item.id_user === u.id_user);
        if (s?.nis) newUsername = s.nis.trim().toLowerCase();
      } else if (u.role === 'Guru Pembimbing') {
        const g = guruList.find((item) => item.id_user === u.id_user);
        if (g?.nip) newUsername = g.nip.trim().toLowerCase();
      }
    } else if (mode === 'standard_prefix') {
      if (u.role === 'Siswa') {
        const s = siswaList.find((item) => item.id_user === u.id_user);
        if (s?.nis) newUsername = `siswa_${s.nis.trim().toLowerCase()}`;
      } else if (u.role === 'Guru Pembimbing') {
        const g = guruList.find((item) => item.id_user === u.id_user);
        if (g?.nip) newUsername = `guru_${g.nip.trim().toLowerCase()}`;
      }
    }
    return { ...u, username: newUsername };
  });

  saveStoredUsers(updated);
  return updated;
}

/**
 * Ekspor kredensial akun ke file CSV siap cetak / buka di Excel
 */
export function exportCredentialsToCsv(
  users: User[],
  siswaList: Siswa[] = [],
  guruList: GuruPembimbing[] = [],
  dudiList: DUDI[] = []
): void {
  const headers = [
    'No',
    'Peran (Role)',
    'Nama Lengkap',
    'Username Login',
    'Kata Sandi (Password)',
    'Identitas (NIS/NIP/ID DUDI)',
    'Kelas / Instansi',
    'Nomor WhatsApp',
  ];

  const rows = users.map((u, idx) => {
    let identitas = '-';
    let infoTambahan = '-';

    if (u.role === 'Siswa') {
      const s = siswaList.find((item) => item.id_user === u.id_user);
      identitas = s?.nis || '-';
      infoTambahan = s ? `${s.kelas} - ${s.jurusan}` : '-';
    } else if (u.role === 'Guru Pembimbing') {
      const g = guruList.find((item) => item.id_user === u.id_user);
      identitas = g?.nip || '-';
      infoTambahan = g?.siswa_bimbingan ? `Bimbingan: ${g.siswa_bimbingan}` : 'Guru Pembimbing';
    } else if (u.role === 'DUDI') {
      const d = dudiList.find((item) => item.id_dudi === u.id_dudi);
      identitas = u.id_dudi || '-';
      infoTambahan = d ? d.nama_instansi : '-';
    } else {
      identitas = 'Admin PKL';
      infoTambahan = 'Administrator Sistem';
    }

    return [
      idx + 1,
      `"${(u.role || '').replace(/"/g, '""')}"`,
      `"${(u.nama_lengkap || '').replace(/"/g, '""')}"`,
      `"${(u.username || '').replace(/"/g, '""')}"`,
      `"${(u.password_hash || '').replace(/"/g, '""')}"`,
      `"${identitas.replace(/"/g, '""')}"`,
      `"${infoTambahan.replace(/"/g, '""')}"`,
      `"${(u.nomor_wa || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Daftar_Akun_Password_PKL_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get Admin contact settings (configured in Master Data)
 */
export function getAdminContactSettings(): AdminContactSettings {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_CONTACT;
  try {
    const raw = localStorage.getItem(ADMIN_CONTACT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        adminPhone: parsed.adminPhone || DEFAULT_ADMIN_CONTACT.adminPhone,
        adminName: parsed.adminName || DEFAULT_ADMIN_CONTACT.adminName,
        defaultMessage: parsed.defaultMessage || DEFAULT_ADMIN_CONTACT.defaultMessage,
      };
    }
  } catch (err) {
    console.error('Error reading admin contact settings:', err);
  }
  return DEFAULT_ADMIN_CONTACT;
}

/**
 * Save Admin contact settings from Master Data
 */
export function saveAdminContactSettings(settings: AdminContactSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_CONTACT_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving admin contact settings:', err);
  }
}

