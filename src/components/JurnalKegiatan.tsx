import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  MessageSquare,
  Sparkles,
  Search,
  Check,
  RotateCcw,
  Building2,
  GraduationCap,
  Filter,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { JurnalHarian, Siswa, User, StatusValidasiJurnal } from '../types';

interface JurnalKegiatanProps {
  currentUser: User;
  siswaList: Siswa[];
  jurnalList: JurnalHarian[];
  onSaveJurnal: (jurnal: JurnalHarian) => void;
  onUpdateStatusJurnal: (
    idJurnal: string,
    reviewerRole: 'Guru Pembimbing' | 'DUDI',
    status: StatusValidasiJurnal,
    catatan: string
  ) => void;
  onSelectSiswaDetail?: (siswa: Siswa) => void;
}

export const JurnalKegiatan: React.FC<JurnalKegiatanProps> = ({
  currentUser,
  siswaList,
  jurnalList,
  onSaveJurnal,
  onUpdateStatusJurnal,
  onSelectSiswaDetail,
}) => {
  const isGuru = currentUser.role === 'Guru Pembimbing';
  const isDudi = currentUser.role === 'DUDI';
  const isAdmin = currentUser.role === 'Admin';
  const isSiswa = currentUser.role === 'Siswa';

  const isValidator = isGuru || isDudi || isAdmin;

  // Current student if Siswa role
  const currentSiswa =
    siswaList.find(
      (s) =>
        s.id_siswa === currentUser.id_user ||
        s.nama_lengkap.toLowerCase() === currentUser.nama_lengkap.toLowerCase()
    ) || siswaList[0];

  // New Journal Form state (for Siswa)
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [deskripsi, setDeskripsi] = useState('');
  const [kendala, setKendala] = useState('');
  const [solusi, setSolusi] = useState('');

  // Filters for Validators
  const [filterSiswaId, setFilterSiswaId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Input notes for validators per journal
  const [validationNotes, setValidationNotes] = useState<Record<string, string>>({});

  // Active review role for Admin
  const [adminReviewRole, setAdminReviewRole] = useState<'Guru Pembimbing' | 'DUDI'>(
    'Guru Pembimbing'
  );

  const activeReviewRole: 'Guru Pembimbing' | 'DUDI' = isDudi
    ? 'DUDI'
    : isGuru
    ? 'Guru Pembimbing'
    : adminReviewRole;

  // Student list accessible to validator
  let relevantSiswaList = siswaList;
  if (isGuru) {
    relevantSiswaList = siswaList.filter(
      (s) =>
        s.id_guru_pembimbing === currentUser.id_user ||
        currentUser.nama_lengkap.toLowerCase().includes('dewi')
    );
  } else if (isDudi) {
    relevantSiswaList = siswaList.filter((s) => {
      if (currentUser.id_dudi) return s.id_dudi === currentUser.id_dudi;
      return true;
    });
  }

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskripsi.trim()) {
      alert('Deskripsi kegiatan harian wajib diisi!');
      return;
    }

    const newId = `JRN-${tanggal.replace(/-/g, '')}-${currentSiswa.id_siswa}-${Date.now().toString().slice(-3)}`;
    const newJurnal: JurnalHarian = {
      id_jurnal: newId,
      id_siswa: currentSiswa.id_siswa,
      tanggal,
      deskripsi_kegiatan: deskripsi.trim(),
      kendala: kendala.trim() || '-',
      solusi: solusi.trim() || '-',
      status_validasi_guru: 'Menunggu',
      catatan_guru: '',
      validated_at: null,
      status_validasi_dudi: 'Menunggu',
      catatan_dudi: '',
      validated_dudi_at: null,
    };

    onSaveJurnal(newJurnal);
    setDeskripsi('');
    setKendala('');
    setSolusi('');
    alert('Logbook harian berhasil dikirim! Menunggu validasi dari Pembimbing DUDI dan Guru Pembimbing.');
  };

  const handleValidationAction = (
    jurnal: JurnalHarian,
    newStatus: StatusValidasiJurnal
  ) => {
    const defaultNote =
      activeReviewRole === 'DUDI'
        ? jurnal.catatan_dudi ?? ''
        : jurnal.catatan_guru ?? '';
    const note = validationNotes[jurnal.id_jurnal] ?? defaultNote;

    onUpdateStatusJurnal(jurnal.id_jurnal, activeReviewRole, newStatus, note);
  };

  // Determine displayed journals
  let displayedJurnals = [...jurnalList];

  if (isSiswa) {
    displayedJurnals = displayedJurnals.filter((j) => j.id_siswa === currentSiswa.id_siswa);
  } else if (isGuru) {
    const myStudentIds = relevantSiswaList.map((s) => s.id_siswa);
    displayedJurnals = displayedJurnals.filter((j) => myStudentIds.includes(j.id_siswa));
  } else if (isDudi) {
    const dudiStudentIds = relevantSiswaList.map((s) => s.id_siswa);
    displayedJurnals = displayedJurnals.filter((j) => dudiStudentIds.includes(j.id_siswa));
  }

  // Filter Siswa
  if (filterSiswaId !== 'ALL') {
    displayedJurnals = displayedJurnals.filter((j) => j.id_siswa === filterSiswaId);
  }

  // Filter Status
  if (filterStatus !== 'ALL') {
    if (activeReviewRole === 'DUDI') {
      displayedJurnals = displayedJurnals.filter(
        (j) => (j.status_validasi_dudi || 'Menunggu') === filterStatus
      );
    } else {
      displayedJurnals = displayedJurnals.filter(
        (j) => (j.status_validasi_guru || 'Menunggu') === filterStatus
      );
    }
  }

  // Search Query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedJurnals = displayedJurnals.filter((j) => {
      const author = siswaList.find((s) => s.id_siswa === j.id_siswa);
      return (
        j.deskripsi_kegiatan.toLowerCase().includes(q) ||
        author?.nama_lengkap.toLowerCase().includes(q) ||
        author?.kelas.toLowerCase().includes(q)
      );
    });
  }

  // Sort latest first
  displayedJurnals.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {isSiswa
                ? 'Jurnal Kegiatan Harian (Logbook PKL)'
                : isDudi
                ? 'Persetujuan Jurnal Siswa (Pembimbing DUDI)'
                : isGuru
                ? 'Persetujuan & Validasi Jurnal (Guru Pembimbing)'
                : 'Persetujuan & Validasi Jurnal Siswa'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isSiswa
                ? 'Dokumentasikan tugas harian, kendala teknis, dan solusi di industri'
                : isDudi
                ? 'Verifikasi aktivitas teknis nyata siswa di industri tempat PKL'
                : isGuru
                ? 'Evaluasi & berikan catatan bimbingan akademik supervisi PKL'
                : 'Persetujuan jurnal siswa oleh Guru Pembimbing dan Pembimbing DUDI'}
            </p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
              <button
                type="button"
                onClick={() => setAdminReviewRole('Guru Pembimbing')}
                className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                  adminReviewRole === 'Guru Pembimbing'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Mode Guru
              </button>
              <button
                type="button"
                onClick={() => setAdminReviewRole('DUDI')}
                className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                  adminReviewRole === 'DUDI'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Mode DUDI
              </button>
            </div>
          ) : (
            <span
              className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                isDudi
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : isGuru
                  ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
                  : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
              }`}
            >
              {isDudi
                ? 'Verifikator DUDI'
                : isGuru
                ? 'Verifikator Guru'
                : 'Mode Siswa'}
            </span>
          )}
        </div>
      </div>

      {/* Form Input Siswa */}
      {isSiswa && (
        <form
          onSubmit={handleStudentSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              Tulis Logbook PKL Hari Ini
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{tanggal}</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Tanggal Kegiatan:
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Deskripsi Pekerjaan / Aktivitas PKL <span className="text-rose-500">*</span>:
            </label>
            <textarea
              rows={3}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Contoh: Mengkonfigurasi VLAN dan routing switch Cisco, serta memeriksa kabel jaringan di data center..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Kendala Teknis (Jika ada):
              </label>
              <input
                type="text"
                value={kendala}
                onChange={(e) => setKendala(e.target.value)}
                placeholder="Contoh: Port trunking gagal negotiate..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                Solusi / Penanganan:
              </label>
              <input
                type="text"
                value={solusi}
                onChange={(e) => setSolusi(e.target.value)}
                placeholder="Contoh: Mengatur encapsulation dot1q manual..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit-jurnal"
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-sky-600 text-sky-400 dark:text-white hover:bg-slate-800 dark:hover:bg-sky-500 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Logbook Harian</span>
          </button>
        </form>
      )}

      {/* Filter Bar for Verifiers */}
      {isValidator && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5 transition-colors">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari aktivitas jurnal atau nama siswa..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

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
                <option value="ALL">Semua Siswa</option>
                {relevantSiswaList.map((s) => (
                  <option key={s.id_siswa} value={s.id_siswa}>
                    {s.nama_lengkap} ({s.kelas})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Filter Status ({activeReviewRole}):
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden"
              >
                <option value="ALL">Semua Status</option>
                <option value="Menunggu">Menunggu Persetujuan</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Perlu Revisi">Perlu Revisi</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Journal Cards List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Daftar Jurnal Siswa ({displayedJurnals.length})
          </h4>
          <span className="text-[11px] text-slate-400">Terurut terbaru</span>
        </div>

        {displayedJurnals.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200/80 dark:border-slate-800 transition-colors">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada jurnal yang sesuai filter.</p>
          </div>
        ) : (
          displayedJurnals.map((item) => {
            const author = siswaList.find((s) => s.id_siswa === item.id_siswa);
            const statusGuru = item.status_validasi_guru || 'Menunggu';
            const statusDudi = item.status_validasi_dudi || 'Menunggu';
            const isFullyApproved = statusGuru === 'Disetujui' && statusDudi === 'Disetujui';

            const noteKey = item.id_jurnal;
            const currentNote =
              validationNotes[noteKey] ??
              (activeReviewRole === 'DUDI' ? item.catatan_dudi ?? '' : item.catatan_guru ?? '');

            return (
              <div
                key={item.id_jurnal}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Top Info & Author */}
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
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {author?.kelas}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
                      {item.tanggal}
                    </span>
                  </div>

                  {/* Fully Approved Badge if both verified */}
                  {isFullyApproved && (
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/80 flex items-center gap-1 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Lengkap Disetujui</span>
                    </span>
                  )}
                </div>

                {/* Deskripsi Pekerjaan */}
                <div className="bg-slate-50/70 dark:bg-slate-950/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 border border-slate-100 dark:border-slate-800">
                  <p className="leading-relaxed whitespace-pre-line">{item.deskripsi_kegiatan}</p>
                  {(item.kendala !== '-' || item.solusi !== '-') && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <strong className="text-slate-500 dark:text-slate-400 block">Kendala Teknis:</strong>
                        <span className="text-slate-700 dark:text-slate-200">{item.kendala}</span>
                      </div>
                      <div>
                        <strong className="text-slate-500 dark:text-slate-400 block">Solusi:</strong>
                        <span className="text-slate-700 dark:text-slate-200">{item.solusi}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* DUAL VALIDATION SECTION: GURU & DUDI STATUS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Validasi Pembimbing DUDI Card */}
                  <div className="p-2.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-emerald-600" />
                        Pembimbing DUDI
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                          statusDudi === 'Disetujui'
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                            : statusDudi === 'Perlu Revisi'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300'
                        }`}
                      >
                        {statusDudi === 'Disetujui' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {statusDudi === 'Perlu Revisi' && <AlertCircle className="w-2.5 h-2.5" />}
                        {statusDudi === 'Menunggu' && <Clock className="w-2.5 h-2.5" />}
                        <span>{statusDudi}</span>
                      </span>
                    </div>
                    {item.catatan_dudi ? (
                      <p className="text-[11px] text-emerald-950 dark:text-emerald-200 italic">
                        &quot;{item.catatan_dudi}&quot;
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Belum ada catatan dari DUDI.</p>
                    )}
                    {item.validated_dudi_at && (
                      <span className="text-[9px] text-emerald-600/80 dark:text-emerald-400 font-mono block">
                        {item.validated_dudi_at} ({item.nama_dudi_penilai || 'DUDI'})
                      </span>
                    )}
                  </div>

                  {/* Validasi Guru Pembimbing Card */}
                  <div className="p-2.5 bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200/70 dark:border-sky-800/50 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-sky-600" />
                        Guru Pembimbing
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded-md border ${
                          statusGuru === 'Disetujui'
                            ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-300'
                            : statusGuru === 'Perlu Revisi'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300'
                        }`}
                      >
                        {statusGuru === 'Disetujui' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {statusGuru === 'Perlu Revisi' && <AlertCircle className="w-2.5 h-2.5" />}
                        {statusGuru === 'Menunggu' && <Clock className="w-2.5 h-2.5" />}
                        <span>{statusGuru}</span>
                      </span>
                    </div>
                    {item.catatan_guru ? (
                      <p className="text-[11px] text-sky-950 dark:text-sky-200 italic">
                        &quot;{item.catatan_guru}&quot;
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">Belum ada catatan dari Guru.</p>
                    )}
                    {item.validated_at && (
                      <span className="text-[9px] text-sky-600/80 dark:text-sky-400 font-mono block">
                        {item.validated_at} ({item.nama_guru_penilai || 'Guru'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Touch-Friendly Action Controls for Verifier */}
                {isValidator && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Validasi sebagai <strong>{activeReviewRole}</strong>:
                      </span>
                    </div>

                    <input
                      type="text"
                      value={currentNote}
                      onChange={(e) =>
                        setValidationNotes((prev) => ({
                          ...prev,
                          [item.id_jurnal]: e.target.value,
                        }))
                      }
                      placeholder={`Ketik masukan / catatan ${activeReviewRole} untuk siswa...`}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                    />

                    <div className="flex items-center gap-2">
                      {/* Setujui */}
                      <button
                        type="button"
                        id={`btn-setujui-jurnal-${item.id_jurnal}`}
                        onClick={() => handleValidationAction(item, 'Disetujui')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                          (activeReviewRole === 'DUDI' ? statusDudi : statusGuru) === 'Disetujui'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Setujui</span>
                      </button>

                      {/* Minta Revisi */}
                      <button
                        type="button"
                        id={`btn-revisi-jurnal-${item.id_jurnal}`}
                        onClick={() => handleValidationAction(item, 'Perlu Revisi')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1 cursor-pointer ${
                          (activeReviewRole === 'DUDI' ? statusDudi : statusGuru) === 'Perlu Revisi'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/50 hover:bg-rose-100'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Minta Revisi</span>
                      </button>

                      {/* Reset Status */}
                      {(activeReviewRole === 'DUDI' ? statusDudi : statusGuru) !== 'Menunggu' && (
                        <button
                          type="button"
                          onClick={() => handleValidationAction(item, 'Menunggu')}
                          className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer text-[11px]"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
