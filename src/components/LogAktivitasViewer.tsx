import React, { useState, useMemo } from 'react';
import {
  LogAktivitas,
  KategoriAktivitas,
  StatusAktivitas,
  Role,
} from '../types';
import {
  Activity,
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Clock,
  User,
  Shield,
  Smartphone,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';

interface LogAktivitasViewerProps {
  logs: LogAktivitas[];
  onClearLogs?: () => void;
  onAddLog?: (log: Omit<LogAktivitas, 'id_log' | 'waktu'>) => void;
}

export const LogAktivitasViewer: React.FC<LogAktivitasViewerProps> = ({
  logs,
  onClearLogs,
  onAddLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<KategoriAktivitas | 'Semua'>('Semua');
  const [selectedStatus, setSelectedStatus] = useState<StatusAktivitas | 'Semua'>('Semua');
  const [selectedRole, setSelectedRole] = useState<Role | 'Semua'>('Semua');
  const [isExporting, setIsExporting] = useState(false);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchKategori = selectedKategori === 'Semua' || log.kategori === selectedKategori;
      const matchStatus = selectedStatus === 'Semua' || log.status === selectedStatus;
      const matchRole = selectedRole === 'Semua' || log.role === selectedRole;

      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        log.aksi.toLowerCase().includes(q) ||
        log.deskripsi.toLowerCase().includes(q) ||
        log.pengguna.toLowerCase().includes(q) ||
        log.waktu.toLowerCase().includes(q) ||
        (log.ip_device && log.ip_device.toLowerCase().includes(q));

      return matchKategori && matchStatus && matchRole && matchSearch;
    });
  }, [logs, selectedKategori, selectedStatus, selectedRole, searchTerm]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const sukses = logs.filter((l) => l.status === 'Sukses').length;
    const peringatan = logs.filter((l) => l.status === 'Peringatan' || l.status === 'Gagal').length;
    const presensi = logs.filter((l) => l.kategori === 'Presensi').length;
    const jurnal = logs.filter((l) => l.kategori === 'Jurnal').length;
    return { total, sukses, peringatan, presensi, jurnal };
  }, [logs]);

  // Export to CSV
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['ID Log', 'Waktu', 'Kategori', 'Aksi', 'Pengguna', 'Role', 'Status', 'Perangkat/Keterangan', 'Deskripsi'];
      const rows = filteredLogs.map((l) => [
        `"${l.id_log}"`,
        `"${l.waktu}"`,
        `"${l.kategori}"`,
        `"${l.aksi.replace(/"/g, '""')}"`,
        `"${l.pengguna.replace(/"/g, '""')}"`,
        `"${l.role}"`,
        `"${l.status}"`,
        `"${(l.ip_device || '-').replace(/"/g, '""')}"`,
        `"${l.deskripsi.replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `log_aktivitas_pkl_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export log error:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 400);
    }
  };

  const getKategoriBadge = (kategori: KategoriAktivitas) => {
    switch (kategori) {
      case 'Autentikasi':
        return 'bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/50';
      case 'Presensi':
        return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50';
      case 'Jurnal':
        return 'bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/50';
      case 'Master Data':
        return 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50';
      case 'Google Drive':
        return 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50';
      case 'WhatsApp':
        return 'bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800/50';
      case 'Sistem':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusIcon = (status: StatusAktivitas) => {
    switch (status) {
      case 'Sukses':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Peringatan':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'Gagal':
        return <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'Info':
      default:
        return <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Metric Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-sky-950/80 text-white flex items-center justify-center shadow-xs border dark:border-sky-800/60">
              <Activity className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                Log Aktivitas Aplikasi PKL
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catatan riwayat audit aktivitas sistem, presensi geofence, jurnal, dan notifikasi
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Ekspor CSV</span>
            </button>

            {onClearLogs && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Yakin ingin mengosongkan riwayat log aktivitas?')) {
                    onClearLogs();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Log</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Aktivitas</span>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Sukses Berjalan</span>
            <div className="text-lg font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">{stats.sukses}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60">
            <span className="text-[11px] text-sky-700 dark:text-sky-400 font-medium">Aktivitas Presensi</span>
            <div className="text-lg font-bold text-sky-800 dark:text-sky-300 mt-0.5">{stats.presensi}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60">
            <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium">Aktivitas Jurnal</span>
            <div className="text-lg font-bold text-indigo-800 dark:text-indigo-300 mt-0.5">{stats.jurnal}</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari aksi, pengguna, atau kata kunci log..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-sky-500 focus:outline-hidden transition"
            />
          </div>

          {/* Filters Select */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Kategori Filter */}
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Autentikasi">Autentikasi</option>
              <option value="Presensi">Presensi</option>
              <option value="Jurnal">Jurnal</option>
              <option value="Master Data">Master Data</option>
              <option value="Google Drive">Google Drive</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Sistem">Sistem</option>
            </select>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              <option value="Semua">Semua Peran</option>
              <option value="Admin">Admin</option>
              <option value="Guru Pembimbing">Guru Pembimbing</option>
              <option value="Siswa">Siswa</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              <option value="Semua">Semua Status</option>
              <option value="Sukses">Sukses</option>
              <option value="Info">Info</option>
              <option value="Peringatan">Peringatan</option>
              <option value="Gagal">Gagal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log List View (Table on Desktop, Cards on Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <Activity className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tidak ada log aktivitas yang cocok</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Coba sesuaikan kata kunci pencarian atau filter yang dipilih.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Waktu</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Aktivitas & Keterangan</th>
                  <th className="py-3 px-3">Pengguna</th>
                  <th className="py-3 px-3">Perangkat / Sumber</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id_log} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    {/* Timestamp */}
                    <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{log.waktu}</span>
                      </div>
                    </td>

                    {/* Kategori Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold ${getKategoriBadge(
                          log.kategori
                        )}`}
                      >
                        {log.kategori}
                      </span>
                    </td>

                    {/* Aksi & Deskripsi */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{log.aksi}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {log.deskripsi}
                      </div>
                    </td>

                    {/* Pengguna & Role */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{log.pengguna}</span>
                      </div>
                      <span className="inline-block text-[10px] text-slate-400 dark:text-slate-400 font-medium">
                        {log.role}
                      </span>
                    </td>

                    {/* Device / Channel */}
                    <td className="py-3 px-3 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate max-w-[150px]">{log.ip_device || 'Web Client'}</span>
                      </div>
                    </td>

                    {/* Status Icon */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                        {getStatusIcon(log.status)}
                        <span>{log.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
