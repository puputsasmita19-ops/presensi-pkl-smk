import { User } from '../types';
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
 * Update user password
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
