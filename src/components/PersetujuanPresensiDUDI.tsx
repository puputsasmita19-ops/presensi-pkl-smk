import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  Building2,
  UserCheck,
  Search,
  Filter,
  Eye,
  MapPin,
  Calendar,
  Layers,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { User, Siswa, DUDI, Presensi, StatusPersetujuanDudi } from '../types';
import { formatDistance } from '../utils/geo';

interface PersetujuanPresensiDUDIProps {
  currentUser: User;
  dudiList: DUDI[];
  siswaList: Siswa[];
  presensiList: Presensi[];
  onApprovePresensi: (
    idPresensi: string,
    status: StatusPersetujuanDudi,
    catatanDudi: string
  ) => void;
  onSelectSiswaDetail?: (siswa: Siswa) => void;
}

export const PersetujuanPresensiDUDI: React.FC<PersetujuanPresensiDUDIProps> = ({
  currentUser,
  dudiList,
  siswaList,
  presensiList,
  onApprovePresensi,
  onSelectSiswaDetail,
}) => {
  // Find which DUDI this mentor is associated with
  const matchedDUDI =
    dudiList.find((d) => d.id_dudi === currentUser.id_dudi) ||
    dudiList.find((d) =>
      currentUser.nama_lengkap.toLowerCase().includes(d.nama_instansi.toLowerCase().slice(0, 8))
    ) ||
    dudiList[0];

  const [selectedDudiId, setSelectedDudiId] = useState<string>(matchedDUDI?.id_dudi || '');
  const activeDUDI = dudiList.find((d) => d.id_dudi === selectedDudiId) || matchedDUDI;

  // Filter students belonging to this DUDI
  const studentsAtDUDI = siswaList.filter((s) => s.id_dudi === activeDUDI?.id_dudi);
  const studentIdsAtDUDI = studentsAtDUDI.map((s) => s.id_siswa);

  // Filter States
  const [filterDate, setFilterDate] = useState<string>('ALL'); // 'ALL' or 'TODAY' or specific YYYY-MM-DD
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // 'ALL' | 'Menunggu' | 'Disetujui' | 'Ditolak'
  const [filterSiswaId, setFilterSiswaId] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Local state for notes per attendance item
  const [dudiNotes, setDudiNotes] = useState<Record<string, string>>({});
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Base list of presensi for this DUDI's students
  let filteredPresensi = presensiList.filter((p) => studentIdsAtDUDI.includes(p.id_siswa));

  // Date filter
  if (filterDate === 'TODAY') {
    filteredPresensi = filteredPresensi.filter((p) => p.tanggal === todayStr);
  } else if (filterDate !== 'ALL') {
    filteredPresensi = filteredPresensi.filter((p) => p.tanggal === filterDate);
  }

  // Status approval filter
  if (filterStatus !== 'ALL') {
    filteredPresensi = filteredPresensi.filter((p) => {
      const currentApproval = p.status_persetujuan_dudi || 'Menunggu';
      return currentApproval === filterStatus;
    });
  }

  // Siswa filter
  if (filterSiswaId !== 'ALL') {
    filteredPresensi = filteredPresensi.filter((p) => p.id_siswa === filterSiswaId);
  }

  // Search keyword (name or NIS)
  if (searchKeyword.trim()) {
    const kw = searchKeyword.toLowerCase();
    filteredPresensi = filteredPresensi.filter((p) => {
      const author = siswaList.find((s) => s.id_siswa === p.id_siswa);
      return (
        author?.nama_lengkap.toLowerCase().includes(kw) ||
        author?.nis?.toLowerCase().includes(kw) ||
        p.id_presensi.toLowerCase().includes(kw)
      );
    });
  }

  // Stats Counters
  const allForDudi = presensiList.filter((p) => studentIdsAtDUDI.includes(p.id_siswa));
  const countMenunggu = allForDudi.filter((p) => (p.status_persetujuan_dudi || 'Menunggu') === 'Menunggu').length;
  const countDisetujui = allForDudi.filter((p) => p.status_persetujuan_dudi === 'Disetujui').length;
  const countDitolak = allForDudi.filter((p) => p.status_persetujuan_dudi === 'Ditolak').length;

  const handleApprove = (item: Presensi, status: StatusPersetujuanDudi) => {
    const note = dudiNotes[item.id_presensi] ?? item.catatan_dudi ?? '';
    onApprovePresensi(item.id_presensi, status, note);
  };

  const handleBulkApproveToday = () => {
    const pendingToday = filteredPresensi.filter(
      (p) => (p.status_persetujuan_dudi || 'Menunggu') === 'Menunggu'
    );
    if (pendingToday.length === 0) {
      alert('Tidak ada presensi yang berstatus "Menunggu" pada filter saat ini.');
      return;
    }
    if (
      window.confirm(
        `Setujui ${pendingToday.length} presensi siswa sekaligus dengan status Disetujui DUDI?`
      )
    ) {
      pendingToday.forEach((p) => {
        onApprovePresensi(
          p.id_presensi,
          'Disetujui',
          dudiNotes[p.id_presensi] || 'Kehadiran terverifikasi oleh Pembimbing DUDI.'
        );
      });
      alert(`Berhasil menyetujui ${pendingToday.length} presensi siswa!`);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Persetujuan Presensi Siswa PKL
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Validasi dan konfirmasi kehadiran harian siswa oleh Pembimbing Industri ({activeDUDI?.nama_instansi})
            </p>
          </div>
        </div>

        {/* DUDI Selector if multi or admin */}
        {dudiList.length > 1 && currentUser.role === 'Admin' && (
          <select
            value={selectedDudiId}
            onChange={(e) => setSelectedDudiId(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden shrink-0"
          >
            {dudiList.map((d) => (
              <option key={d.id_dudi} value={d.id_dudi}>
                {d.nama_instansi}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div
          onClick={() => setFilterStatus('Menunggu')}
          className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
            filterStatus === 'Menunggu'
              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
            Menunggu
          </span>
          <span className="text-lg font-bold text-amber-900 dark:text-amber-200 font-mono">
            {countMenunggu}
          </span>
        </div>

        <div
          onClick={() => setFilterStatus('Disetujui')}
          className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
            filterStatus === 'Disetujui'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
            Disetujui
          </span>
          <span className="text-lg font-bold text-emerald-900 dark:text-emerald-200 font-mono">
            {countDisetujui}
          </span>
        </div>

        <div
          onClick={() => setFilterStatus('Ditolak')}
          className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
            filterStatus === 'Ditolak'
              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
            Ditolak
          </span>
          <span className="text-lg font-bold text-rose-900 dark:text-rose-200 font-mono">
            {countDitolak}
          </span>
        </div>
      </div>

      {/* Filter & Action Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari nama siswa atau NIS..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Quick Date Selector */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterDate('ALL')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                filterDate === 'ALL'
                  ? 'bg-slate-900 dark:bg-sky-600 text-white border-transparent'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Semua Tanggal
            </button>
            <button
              type="button"
              onClick={() => setFilterDate('TODAY')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                filterDate === 'TODAY'
                  ? 'bg-slate-900 dark:bg-sky-600 text-white border-transparent'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Hari Ini
            </button>
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Filter Siswa:
            </label>
            <select
              value={filterSiswaId}
              onChange={(e) => setFilterSiswaId(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden"
            >
              <option value="ALL">Semua Siswa di DUDI</option>
              {studentsAtDUDI.map((s) => (
                <option key={s.id_siswa} value={s.id_siswa}>
                  {s.nama_lengkap} ({s.kelas})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Status Persetujuan:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="Menunggu">Menunggu Persetujuan</option>
              <option value="Disetujui">Disetujui</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Bulk Action */}
        {countMenunggu > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Terdapat <strong>{countMenunggu}</strong> presensi menunggu verifikasi DUDI.
            </span>
            <button
              type="button"
              onClick={handleBulkApproveToday}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Setujui Semua</span>
            </button>
          </div>
        )}
      </div>

      {/* Attendance List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Daftar Presensi ({filteredPresensi.length})
          </h4>
          <span className="text-[11px] text-slate-400">Terurut terbaru</span>
        </div>

        {filteredPresensi.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200/80 dark:border-slate-800 transition-colors">
            <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tidak ada presensi siswa yang cocok dengan filter.
            </p>
          </div>
        ) : (
          filteredPresensi.map((item) => {
            const author = siswaList.find((s) => s.id_siswa === item.id_siswa);
            const approvalStatus: StatusPersetujuanDudi =
              item.status_persetujuan_dudi || 'Menunggu';
            const currentNote = dudiNotes[item.id_presensi] ?? item.catatan_dudi ?? '';

            return (
              <div
                key={item.id_presensi}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Top Info Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {author && onSelectSiswaDetail ? (
                        <button
                          type="button"
                          onClick={() => onSelectSiswaDetail(author)}
                          className="text-xs font-bold text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer text-left"
                        >
                          {author.nama_lengkap}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {author?.nama_lengkap || item.id_siswa}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {author?.nis} ({author?.kelas})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      <span>{item.hari ? `${item.hari}, ` : ''}{item.tanggal}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.nama_shift || 'Shift Reguler'}
                      </span>
                    </div>
                  </div>

                  {/* Status Persetujuan Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                      approvalStatus === 'Disetujui'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        : approvalStatus === 'Ditolak'
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                    }`}
                  >
                    {approvalStatus === 'Disetujui' && <CheckCircle2 className="w-3 h-3" />}
                    {approvalStatus === 'Ditolak' && <AlertCircle className="w-3 h-3" />}
                    {approvalStatus === 'Menunggu' && <Clock className="w-3 h-3" />}
                    <span>{approvalStatus} DUDI</span>
                  </span>
                </div>

                {/* Details Section: Photo, Time, Geofence */}
                <div className="flex flex-col sm:flex-row gap-3 bg-slate-50/70 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-xs">
                  {/* Selfie Photo Thumbnail */}
                  {item.foto_selfie ? (
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(item.foto_selfie)}
                      className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-slate-700 group cursor-pointer"
                      title="Klik untuk memperbesar foto selfie kehadiran"
                    >
                      <img
                        src={item.foto_selfie}
                        alt="Selfie Presensi"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 text-[10px] text-center p-1 font-semibold">
                      Tanpa Foto ({item.status})
                    </div>
                  )}

                  {/* Metadata Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.status === 'Hadir'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        }`}
                      >
                        Status: {item.status}
                      </span>
                      {item.status_ketepatan && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.status_ketepatan}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                      <div>
                        <span className="text-slate-400">Masuk:</span>{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-mono">
                          {item.jam_masuk}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Pulang:</span>{' '}
                        <strong className="text-slate-800 dark:text-slate-200 font-mono">
                          {item.jam_pulang || 'Belum Pulang'}
                        </strong>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-0.5">
                      <MapPin className="w-3 h-3 text-sky-600" />
                      <span>
                        Jarak GPS: <strong>{formatDistance(item.koordinat_absen.jarak_meter)}</strong> (
                        {item.koordinat_absen.dalam_radius ? 'Dalam Radius' : 'Di Luar Radius'})
                      </span>
                    </div>

                    {item.keterangan && (
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 italic pt-1 border-t border-slate-200/50 dark:border-slate-800">
                        &quot;{item.keterangan}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Catatan Sebelumnya jika sudah disetujui */}
                {item.catatan_dudi && (
                  <div className="p-2 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                        Catatan Pembimbing DUDI:
                      </span>
                      <p>{item.catatan_dudi}</p>
                      {item.disetujui_dudi_pada && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 block">
                          Disetujui: {item.disetujui_dudi_pada} ({item.nama_pembimbing_dudi || 'DUDI'})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Controls for DUDI Approval */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <input
                    type="text"
                    value={currentNote}
                    onChange={(e) =>
                      setDudiNotes((prev) => ({
                        ...prev,
                        [item.id_presensi]: e.target.value,
                      }))
                    }
                    placeholder="Tulis catatan persetujuan kehadiran siswa..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Aksi DUDI:
                    </span>

                    {/* Setujui */}
                    <button
                      type="button"
                      id={`btn-approve-presensi-${item.id_presensi}`}
                      onClick={() => handleApprove(item, 'Disetujui')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                        approvalStatus === 'Disetujui'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui Kehadiran</span>
                    </button>

                    {/* Tolak */}
                    <button
                      type="button"
                      id={`btn-reject-presensi-${item.id_presensi}`}
                      onClick={() => handleApprove(item, 'Ditolak')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                        approvalStatus === 'Ditolak'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50 hover:bg-rose-100'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>

                    {/* Reset */}
                    {approvalStatus !== 'Menunggu' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(item, 'Menunggu')}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer text-[11px]"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Zoom Foto Selfie */}
      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 p-4 rounded-2xl max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Bukti Foto Selfie Kehadiran Siswa
              </h4>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <img
                src={previewPhoto}
                alt="Foto Bukti Kehadiran"
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="w-full py-2 bg-slate-800 text-slate-200 font-bold text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
