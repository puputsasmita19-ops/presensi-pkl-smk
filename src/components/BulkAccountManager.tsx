import React, { useState, useMemo } from 'react';
import { User, Siswa, GuruPembimbing, DUDI } from '../types';
import {
  Key,
  Lock,
  RefreshCw,
  Download,
  Printer,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Search,
  Sparkles,
  Users,
  GraduationCap,
  Building2,
  Copy,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Edit2,
  Check,
  X,
  Shield,
  HelpCircle,
} from 'lucide-react';
import {
  bulkResetPasswords,
  bulkResetUsernames,
  exportCredentialsToCsv,
  updateUserPassword,
  updateUserAccount,
  syncUsersWithEntities,
} from '../utils/userManagement';

interface BulkAccountManagerProps {
  usersList: User[];
  siswaList: Siswa[];
  guruList: GuruPembimbing[];
  dudiList: DUDI[];
  onUsersChange: (updated: User[]) => void;
}

export const BulkAccountManager: React.FC<BulkAccountManagerProps> = ({
  usersList,
  siswaList,
  guruList,
  dudiList,
  onUsersChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('Semua');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bulk Reset Modal State
  const [isBulkResetModalOpen, setIsBulkResetModalOpen] = useState(false);
  const [bulkResetMode, setBulkResetMode] = useState<'nis_nip' | 'custom' | 'default_role' | 'random'>('nis_nip');
  const [customPasswordInput, setCustomPasswordInput] = useState('smk2026');
  const [bulkActionSuccess, setBulkActionSuccess] = useState<string | null>(null);

  // Single Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsernameInput, setEditUsernameInput] = useState('');
  const [editPasswordInput, setEditPasswordInput] = useState('');
  const [editPhoneInput, setEditPhoneInput] = useState('');
  const [editShowPassword, setEditShowPassword] = useState(false);

  // Print Slip Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return usersList.filter((user) => {
      // Role match
      if (roleFilter !== 'Semua' && user.role !== roleFilter) {
        return false;
      }
      // Search match
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = user.nama_lengkap.toLowerCase().includes(q);
      const matchUser = user.username.toLowerCase().includes(q);
      const matchPhone = user.nomor_wa?.toLowerCase().includes(q);
      const matchId = user.id_user.toLowerCase().includes(q);

      // Match entity info (NIS / NIP / DUDI)
      let matchEntity = false;
      if (user.role === 'Siswa') {
        const s = siswaList.find((item) => item.id_user === user.id_user);
        matchEntity = !!(s?.nis?.toLowerCase().includes(q) || s?.kelas?.toLowerCase().includes(q));
      } else if (user.role === 'Guru Pembimbing') {
        const g = guruList.find((item) => item.id_user === user.id_user);
        matchEntity = !!(g?.nip?.toLowerCase().includes(q) || g?.siswa_bimbingan?.toLowerCase().includes(q));
      } else if (user.role === 'DUDI') {
        const d = dudiList.find((item) => item.id_dudi === user.id_dudi);
        matchEntity = !!(d?.nama_instansi?.toLowerCase().includes(q) || d?.id_dudi?.toLowerCase().includes(q));
      }

      return matchName || matchUser || matchPhone || matchId || matchEntity;
    });
  }, [usersList, roleFilter, searchQuery, siswaList, guruList, dudiList]);

  // Selection handlers
  const isAllSelected = filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length;
  const isSomeSelected = selectedUserIds.length > 0 && selectedUserIds.length < filteredUsers.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id_user));
    }
  };

  const handleToggleSelectUser = (id_user: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id_user) ? prev.filter((id) => id !== id_user) : [...prev, id_user]
    );
  };

  const handleSelectByRole = (role: string) => {
    const targetUsers = usersList.filter((u) => u.role === role);
    setSelectedUserIds(targetUsers.map((u) => u.id_user));
  };

  // Sync users with entities
  const handleSyncEntities = () => {
    const synced = syncUsersWithEntities(siswaList, guruList, dudiList);
    onUsersChange(synced);
    setBulkActionSuccess(`Berhasil menyinkronkan ${synced.length} akun dari Master Data!`);
    setTimeout(() => setBulkActionSuccess(null), 3000);
  };

  // Toggle reveal password
  const toggleRevealPassword = (id_user: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id_user]: !prev[id_user] }));
  };

  // Copy credential
  const handleCopyCredential = (user: User) => {
    const text = `Username: ${user.username}\nPassword: ${user.password_hash}\nNama: ${user.nama_lengkap} (${user.role})`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(user.id_user);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Execute Bulk Password Reset
  const handleExecuteBulkReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    const updated = bulkResetPasswords(
      selectedUserIds,
      bulkResetMode,
      customPasswordInput,
      siswaList,
      guruList
    );

    onUsersChange(updated);
    setIsBulkResetModalOpen(false);
    setBulkActionSuccess(
      `Berhasil memperbarui password untuk ${selectedUserIds.length} akun terpilih!`
    );
    setTimeout(() => setBulkActionSuccess(null), 4000);
  };

  // Quick reset single password to NIS/NIP
  const handleQuickResetToIdentitas = (user: User) => {
    const updated = bulkResetPasswords([user.id_user], 'nis_nip', undefined, siswaList, guruList);
    onUsersChange(updated);
    setBulkActionSuccess(`Password ${user.nama_lengkap} direset ke identitas (NIS/NIP)!`);
    setTimeout(() => setBulkActionSuccess(null), 3000);
  };

  // Open Edit User Modal
  const handleOpenEditUser = (user: User) => {
    setEditingUser(user);
    setEditUsernameInput(user.username);
    setEditPasswordInput(user.password_hash);
    setEditPhoneInput(user.nomor_wa || '');
    setEditShowPassword(false);
  };

  // Save Single User Edit
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUsernameInput.trim() || !editPasswordInput.trim()) return;

    const updated = updateUserAccount(editingUser.id_user, {
      username: editUsernameInput.trim().toLowerCase(),
      password_hash: editPasswordInput.trim(),
      nomor_wa: editPhoneInput.trim(),
    });

    onUsersChange(updated);
    setEditingUser(null);
    setBulkActionSuccess(`Akun ${editingUser.nama_lengkap} berhasil diperbarui!`);
    setTimeout(() => setBulkActionSuccess(null), 3000);
  };

  // Export CSV
  const handleExportCsv = () => {
    const exportList = selectedUserIds.length > 0
      ? usersList.filter((u) => selectedUserIds.includes(u.id_user))
      : filteredUsers;
    exportCredentialsToCsv(exportList, siswaList, guruList, dudiList);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {bulkActionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bulkActionSuccess}</span>
          </div>
          <button
            onClick={() => setBulkActionSuccess(null)}
            className="text-emerald-600 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Header Section */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Pengaturan Akun &amp; Kata Sandi Massal
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {usersList.length} Akun
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Atur atau reset kata sandi serentak untuk Siswa, Guru Pembimbing, Mitra DUDI, &amp; Admin.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSyncEntities}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Sinkronkan data siswa, guru & DUDI baru ke daftar akun"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
              <span>Sinkronkan Akun</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Unduh seluruh daftar akun & password dalam format Excel (.csv)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
              title="Cetak kartu / slip login akun siap bagikan ke siswa dan guru"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cetak Slip Akun</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Search, Role Filter, and Bulk Selection Actions */}
        <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, username, NIS, NIP..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto text-[11px] shrink-0">
            {['Semua', 'Siswa', 'Guru Pembimbing', 'DUDI', 'Admin'].map((r) => {
              const count = r === 'Semua' ? usersList.length : usersList.filter((u) => u.role === r).length;
              const isSelected = roleFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRoleFilter(r);
                    setSelectedUserIds([]);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span>{r === 'Guru Pembimbing' ? 'Guru' : r}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bulk Action Bar (Visible when accounts are selected) */}
        <div className="p-3 bg-amber-50/70 border-b border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-600" />
              ) : isSomeSelected ? (
                <div className="w-4 h-4 rounded bg-amber-600 flex items-center justify-center text-white text-[10px] font-bold">
                  -
                </div>
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>
                {selectedUserIds.length > 0
                  ? `${selectedUserIds.length} dari ${filteredUsers.length} Akun Terpilih`
                  : 'Pilih Semua Akun'}
              </span>
            </button>

            {/* Quick role selection shortcuts */}
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <span>Pilih Cepat:</span>
              <button
                type="button"
                onClick={() => handleSelectByRole('Siswa')}
                className="text-emerald-700 hover:underline font-semibold cursor-pointer"
              >
                Semua Siswa
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleSelectByRole('Guru Pembimbing')}
                className="text-purple-700 hover:underline font-semibold cursor-pointer"
              >
                Semua Guru
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleSelectByRole('DUDI')}
                className="text-blue-700 hover:underline font-semibold cursor-pointer"
              >
                Semua DUDI
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllPasswords(!showAllPasswords)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              {showAllPasswords ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{showAllPasswords ? 'Sembunyikan Semua Sandi' : 'Tampilkan Semua Sandi'}</span>
            </button>

            <button
              type="button"
              disabled={selectedUserIds.length === 0}
              onClick={() => setIsBulkResetModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition ${
                selectedUserIds.length > 0
                  ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-amber-600/20'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Atur Password Massal ({selectedUserIds.length})</span>
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 select-none">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="p-3">Peran &amp; Nama Lengkap</th>
                <th className="p-3">Identitas (NIS / NIP / DUDI)</th>
                <th className="p-3">Username Login</th>
                <th className="p-3">Kata Sandi (Password)</th>
                <th className="p-3">No. WhatsApp</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">Tidak ada akun yang sesuai dengan filter pencarian.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setRoleFilter('Semua');
                      }}
                      className="mt-2 text-xs text-sky-600 hover:underline font-bold"
                    >
                      Reset Filter
                    </button>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id_user);
                  const isRevealed = showAllPasswords || !!revealedPasswords[user.id_user];

                  // Resolve detailed info
                  let identitasLabel = '-';
                  let subDetail = '';
                  if (user.role === 'Siswa') {
                    const s = siswaList.find((item) => item.id_user === user.id_user);
                    identitasLabel = s?.nis || '-';
                    subDetail = s ? `${s.kelas} • ${s.jurusan}` : '';
                  } else if (user.role === 'Guru Pembimbing') {
                    const g = guruList.find((item) => item.id_user === user.id_user);
                    identitasLabel = g?.nip || '-';
                    subDetail = g?.siswa_bimbingan ? `Bimbingan: ${g.siswa_bimbingan}` : '';
                  } else if (user.role === 'DUDI') {
                    const d = dudiList.find((item) => item.id_dudi === user.id_dudi);
                    identitasLabel = user.id_dudi || '-';
                    subDetail = d ? d.nama_instansi : '';
                  } else {
                    identitasLabel = 'Admin PKL';
                    subDetail = 'Koordinator Sistem';
                  }

                  return (
                    <tr
                      key={user.id_user}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectUser(user.id_user)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* Role & Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                              user.role === 'Admin'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : user.role === 'Guru Pembimbing'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : user.role === 'DUDI'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {user.role === 'Guru Pembimbing' ? 'Guru' : user.role}
                          </span>
                          <div className="min-w-0">
                            <strong className="text-slate-800 block truncate font-bold">
                              {user.nama_lengkap}
                            </strong>
                            {subDetail && (
                              <span className="text-[10px] text-slate-500 truncate block">
                                {subDetail}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Identitas (NIS/NIP) */}
                      <td className="p-3">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                          {identitasLabel}
                        </span>
                      </td>

                      {/* Username */}
                      <td className="p-3">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-900 text-sky-300 text-xs font-semibold">
                          {user.username}
                        </span>
                      </td>

                      {/* Password */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-slate-800 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200 font-bold min-w-[70px]">
                            {isRevealed ? user.password_hash : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPassword(user.id_user)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                            title={isRevealed ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {user.nomor_wa || '-'}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy credential */}
                          <button
                            type="button"
                            onClick={() => handleCopyCredential(user)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition cursor-pointer"
                            title="Salin kredensial login (Username & Password)"
                          >
                            {copiedId === user.id_user ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Quick Reset to NIS/NIP */}
                          <button
                            type="button"
                            onClick={() => handleQuickResetToIdentitas(user)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                            title="Reset password ke NIS / NIP"
                          >
                            <RefreshCw className="w-3 h-3 text-slate-500" />
                            <span>Reset Default</span>
                          </button>

                          {/* Edit Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(user)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                            title="Ubah Username / Password Akun Ini"
                          >
                            <Edit2 className="w-3 h-3 text-amber-600" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Menampilkan {filteredUsers.length} dari total {usersList.length} akun pengguna</span>
          <span>Presensi PKL Multi-Role System</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL PENGATURAN PASSWORD MASSAL (BULK RESET PASSWORD MODAL) */}
      {/* ========================================================================= */}
      {isBulkResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Atur Kata Sandi Massal ({selectedUserIds.length} Akun Terpilih)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Terapkan kata sandi serentak untuk memudahkan distribusi akun ke siswa/guru.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkResetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleExecuteBulkReset} className="space-y-4 text-xs">
              
              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">
                  Pilih Skema Pembaruan Kata Sandi:
                </label>

                {/* Option 1: Sesuai Identitas (NIS/NIP) */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    bulkResetMode === 'nis_nip'
                      ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkResetMode"
                    value="nis_nip"
                    checked={bulkResetMode === 'nis_nip'}
                    onChange={() => setBulkResetMode('nis_nip')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <strong className="text-slate-900 block font-bold">
                      Format Pintar: Sesuai NIS / NIP / ID Entitas (Direkomendasikan)
                    </strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Password siswa diubah menjadi nomor NIS masing-masing, guru menjadi NIP, dan DUDI menjadi dudi123.
                    </p>
                  </div>
                </label>

                {/* Option 2: Password Kustom Seragam */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    bulkResetMode === 'custom'
                      ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkResetMode"
                    value="custom"
                    checked={bulkResetMode === 'custom'}
                    onChange={() => setBulkResetMode('custom')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <strong className="text-slate-900 block font-bold">
                      Kata Sandi Seragam (Kustom untuk Semua)
                    </strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Semua akun terpilih akan memiliki kata sandi yang sama persis (misal: smk2026, pklhebat).
                    </p>

                    {bulkResetMode === 'custom' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={customPasswordInput}
                          onChange={(e) => setCustomPasswordInput(e.target.value)}
                          placeholder="Masukkan password kustom..."
                          className="w-full p-2 bg-white border border-amber-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-amber-500"
                          required
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                </label>

                {/* Option 3: Default Role (siswa123, guru123, dudi123) */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    bulkResetMode === 'default_role'
                      ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkResetMode"
                    value="default_role"
                    checked={bulkResetMode === 'default_role'}
                    onChange={() => setBulkResetMode('default_role')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <strong className="text-slate-900 block font-bold">
                      Format Standar Peran (siswa123, guru123, dudi123)
                    </strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Siswa = siswa123, Guru = guru123, DUDI = dudi123, Admin = admin123.
                    </p>
                  </div>
                </label>

                {/* Option 4: Acak Unik (Random 6 Alfanumerik) */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    bulkResetMode === 'random'
                      ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="bulkResetMode"
                    value="random"
                    checked={bulkResetMode === 'random'}
                    onChange={() => setBulkResetMode('random')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <strong className="text-slate-900 block font-bold">
                      Generate Acak Unik (Keamanan Tinggi)
                    </strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Setiap akun akan mendapatkan 6 karakter password acak unik (misal: 7kx4p9).
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkResetModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Terapkan ke {selectedUserIds.length} Akun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT TUNGGAL (EDIT AKUN INDIVIDUAL) */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ubah Kredensial Akun</h3>
                  <p className="text-xs text-slate-500">
                    {editingUser.nama_lengkap} ({editingUser.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Username Login:</label>
                <input
                  type="text"
                  value={editUsernameInput}
                  onChange={(e) => setEditUsernameInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kata Sandi (Password):</label>
                <div className="relative">
                  <input
                    type={editShowPassword ? 'text' : 'password'}
                    value={editPasswordInput}
                    onChange={(e) => setEditPasswordInput(e.target.value)}
                    className="w-full p-2.5 pr-10 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setEditShowPassword(!editShowPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nomor WhatsApp:</label>
                <input
                  type="text"
                  value={editPhoneInput}
                  onChange={(e) => setEditPhoneInput(e.target.value)}
                  placeholder="08123456789"
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CETAK SLIP AKUN / KARTU LOGIN (PRINT VIEW) */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Cetak Kartu &amp; Slip Login Akun Presensi PKL
                  </h3>
                  <p className="text-xs text-slate-500">
                    Format kartu siap gunting untuk dibagikan langsung kepada Siswa dan Guru Pembimbing.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Cards Grid */}
            <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {(selectedUserIds.length > 0
                ? usersList.filter((u) => selectedUserIds.includes(u.id_user))
                : filteredUsers
              ).map((user) => {
                let idLabel = '-';
                let extra = '';
                if (user.role === 'Siswa') {
                  const s = siswaList.find((item) => item.id_user === user.id_user);
                  idLabel = s?.nis || '-';
                  extra = s ? `${s.kelas} • ${s.jurusan}` : '';
                } else if (user.role === 'Guru Pembimbing') {
                  const g = guruList.find((item) => item.id_user === user.id_user);
                  idLabel = g?.nip || '-';
                  extra = g?.siswa_bimbingan ? `Bimbingan: ${g.siswa_bimbingan}` : '';
                } else if (user.role === 'DUDI') {
                  const d = dudiList.find((item) => item.id_dudi === user.id_dudi);
                  idLabel = user.id_dudi || '-';
                  extra = d ? d.nama_instansi : '';
                }

                return (
                  <div
                    key={user.id_user}
                    className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col justify-between space-y-2.5 text-xs print:border-slate-400 print:break-inside-avoid"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <div className="font-extrabold text-slate-900 tracking-tight flex items-center gap-1">
                        <span>KARTU LOGIN PKL</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-300 text-slate-800">
                        {user.role}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 text-sm">{user.nama_lengkap}</div>
                      {extra && <div className="text-[10px] text-slate-500">{extra}</div>}
                    </div>

                    <div className="p-2 rounded-lg bg-white border border-slate-200 space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Username:</span>
                        <strong className="text-slate-900">{user.username}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Password:</span>
                        <strong className="text-slate-900">{user.password_hash}</strong>
                      </div>
                      {idLabel !== '-' && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">NIS / NIP:</span>
                          <span className="text-slate-700">{idLabel}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[9px] text-slate-400 text-center italic">
                      Simpan kartu ini dengan baik demi keamanan akun Anda.
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
