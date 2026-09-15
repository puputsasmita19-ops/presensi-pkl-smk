import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Printer,
  X,
  FileText,
  SlidersHorizontal,
  Upload,
  RotateCcw,
  Building2,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Presensi, Siswa, DUDI, GuruPembimbing, User, PaperSize, KopSuratConfig } from '../types';
import { exportPresensiToPDF } from '../utils/pdfExport';
import {
  DEFAULT_KOP_CONFIG,
  getSavedKopConfig,
  saveKopConfig,
  getSavedPaperSize,
  savePaperSize,
} from '../data/defaultKop';

interface ModalExportPDFProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  siswaList: Siswa[];
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  presensiList: Presensi[];
  selectedMonth: string;
  startDate: string;
  endDate: string;
  selectedSiswaId: string;
}

export const ModalExportPDF: React.FC<ModalExportPDFProps> = ({
  isOpen,
  onClose,
  currentUser,
  siswaList,
  dudiList,
  guruList,
  presensiList,
  selectedMonth,
  startDate,
  endDate,
  selectedSiswaId,
}) => {
  // Paper Size & Kop Settings state
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [kopConfig, setKopConfig] = useState<KopSuratConfig>(DEFAULT_KOP_CONFIG);
  const [showKopSettings, setShowKopSettings] = useState<boolean>(false);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser.role === 'Admin';
  const isGuru = currentUser.role === 'Guru Pembimbing';

  // Filter records
  let filtered = presensiList;
  if (selectedSiswaId && selectedSiswaId !== 'ALL') {
    filtered = filtered.filter((p) => p.id_siswa === selectedSiswaId);
  }
  if (startDate) {
    filtered = filtered.filter((p) => p.tanggal >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((p) => p.tanggal <= endDate);
  } else if (selectedMonth && !startDate && !endDate) {
    filtered = filtered.filter((p) => p.tanggal.startsWith(selectedMonth));
  }

  const targetSiswa =
    selectedSiswaId && selectedSiswaId !== 'ALL'
      ? siswaList.find((s) => s.id_siswa === selectedSiswaId)
      : null;

  const targetDUDI = targetSiswa
    ? dudiList.find((d) => d.id_dudi === targetSiswa.id_dudi) || null
    : currentUser.id_dudi
    ? dudiList.find((d) => d.id_dudi === currentUser.id_dudi) || null
    : filtered.length > 0
    ? (() => {
        const firstS = siswaList.find((s) => s.id_siswa === filtered[0]?.id_siswa);
        return firstS ? dudiList.find((d) => d.id_dudi === firstS.id_dudi) || null : null;
      })()
    : dudiList[0] || null;

  const targetGuru = targetSiswa
    ? guruList.find((g) => g.id_guru === targetSiswa.id_guru_pembimbing) || null
    : isGuru
    ? guruList.find((g) => g.nama_guru.toLowerCase() === currentUser.nama_lengkap.toLowerCase()) || guruList[0] || null
    : filtered.length > 0
    ? (() => {
        const firstS = siswaList.find((s) => s.id_siswa === filtered[0]?.id_siswa);
        return firstS ? guruList.find((g) => g.id_guru === firstS.id_guru_pembimbing) || null : null;
      })()
    : guruList[0] || null;

  // Initialize from storage on mount and auto-load supervisor from associated DUDI
  useEffect(() => {
    if (isOpen) {
      const savedKop = getSavedKopConfig();
      if (targetDUDI?.nama_pembimbing) {
        savedKop.namaPembimbingDudi = targetDUDI.nama_pembimbing;
      }
      setKopConfig(savedKop);
      setPaperSize(getSavedPaperSize());
    }
  }, [isOpen, selectedSiswaId, targetDUDI?.id_dudi]);

  if (!isOpen) return null;

  // Effective signatories
  const effectiveDudiSupervisorName =
    targetDUDI?.nama_pembimbing?.trim() ||
    kopConfig.namaPembimbingDudi?.trim() ||
    'Pembimbing Industri / DUDI';

  const effectiveDudiSupervisorNipNik =
    kopConfig.nipPembimbingDudi?.trim() ||
    (targetDUDI?.nomor_wa_pembimbing ? `No. Kontak: ${targetDUDI.nomor_wa_pembimbing}` : '');

  const effectiveGuruName =
    isGuru
      ? currentUser.nama_lengkap
      : targetGuru?.nama_guru || 'Dewi Lestari, M.Pd';

  const effectiveGuruNip =
    targetGuru?.nip ? `NIP. ${targetGuru.nip}` : 'NIP. 19850312 201101 2 018';

  // Summary counts
  const totalHari = filtered.length;
  const totalHadir = filtered.filter((p) => p.status === 'Hadir').length;
  const totalTepat = filtered.filter((p) => p.status_ketepatan === 'Tepat Waktu').length;
  const totalTerlambat = filtered.filter((p) => p.status_ketepatan === 'Terlambat').length;
  const totalIzin = filtered.filter((p) => p.status === 'Izin').length;
  const totalSakit = filtered.filter((p) => p.status === 'Sakit').length;
  const totalAlpa = filtered.filter((p) => p.status === 'Alpa').length;
  const persentaseHadir = totalHari > 0 ? Math.round((totalHadir / totalHari) * 100) : 0;

  const periodLabel =
    startDate && endDate
      ? `${startDate} s.d. ${endDate}`
      : startDate
      ? `Mulai ${startDate}`
      : endDate
      ? `Sampai ${endDate}`
      : selectedMonth
      ? `Bulan ${selectedMonth}`
      : 'Seluruh Periode PKL';

  // Handle Paper change
  const handleSelectPaperSize = (size: PaperSize) => {
    setPaperSize(size);
    savePaperSize(size);
  };

  // Handle Kop field change
  const handleUpdateKop = (field: keyof KopSuratConfig, value: any) => {
    setKopConfig((prev) => {
      const updated = { ...prev, [field]: value };
      saveKopConfig(updated);
      return updated;
    });
  };

  // Handle Logo Upload
  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>, position: 'kiri' | 'kanan') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih berkas gambar yang valid (PNG/JPEG).');
      return;
    }

    // Limit size to max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran berkas logo maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (position === 'kiri') {
        handleUpdateKop('logoKiri', dataUrl);
      } else {
        handleUpdateKop('logoKanan', dataUrl);
      }
      triggerToast(`Logo ${position === 'kiri' ? 'Kiri' : 'Kanan'} berhasil diunggah!`);
    };
    reader.readAsDataURL(file);
  };

  const handleResetKop = () => {
    if (window.confirm('Kembalikan seluruh pengaturan kop surat dan identitas sekolah ke nilai bawaan (default)?')) {
      setKopConfig(DEFAULT_KOP_CONFIG);
      saveKopConfig(DEFAULT_KOP_CONFIG);
      triggerToast('Pengaturan kop surat telah direset ke bawaan.');
    }
  };

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleDownloadPDF = () => {
    setIsExporting(true);
    try {
      exportPresensiToPDF({
        siswaList,
        presensiList,
        dudiList,
        guruList,
        selectedSiswaId,
        selectedMonth,
        startDate,
        endDate,
        schoolName: kopConfig.namaSekolah,
        userRole: currentUser.role,
        userName: currentUser.nama_lengkap,
        paperSize,
        kopConfig,
      });
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Paper dimension styles for screen preview:
  // A4: 210 x 297 mm
  // F4: 215 x 330 mm
  const isF4 = paperSize === 'F4';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      {/* Dynamic CSS Print Style to respect A4 vs F4 */}
      <style>{`
        @media print {
          @page {
            size: ${isF4 ? '215mm 330mm' : '210mm 297mm'};
            margin: 10mm 12mm;
          }
          body {
            visibility: hidden !important;
            background: white !important;
          }
          #printable-pdf-document, #printable-pdf-document * {
            visibility: visible !important;
          }
          #printable-pdf-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Bar */}
        <div className="p-4 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Pratinjau & Pengaturan Cetak Rekapitulasi Presensi
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {isF4 ? 'Format F4 / Folio' : 'Format A4'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Format resmi cetak langsung ke printer atau berkas PDF untuk {isAdmin ? 'Administrator PKL' : 'Guru Pembimbing'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Controls Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-100/90 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Paper Size & Setting Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => handleSelectPaperSize('A4')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  paperSize === 'A4'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Kertas A4 (210 x 297 mm) - Standar umum"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>A4</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectPaperSize('F4')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                  paperSize === 'F4'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Kertas F4 / Folio (215 x 330 mm) - Standar instansi & sekolah Indonesia"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>F4 (Folio)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowKopSettings(!showKopSettings)}
              className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer ${
                showKopSettings
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Pengaturan Kop & Identitas</span>
              {showKopSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300 select-none ml-2">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
              />
              <span>Tanda Tangan Pengesahan</span>
            </label>
          </div>

          {/* Action Print & Download */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
              title={`Cetak dokumen langsung ke printer dengan ukuran ${paperSize}`}
            >
              <Printer className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Cetak ({paperSize})</span>
            </button>
            <button
              id="btn-confirm-export-pdf"
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
              title={`Unduh dokumen PDF berukuran ${paperSize}`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Memproses PDF...' : `Unduh PDF (${paperSize})`}</span>
            </button>
          </div>
        </div>

        {/* Save confirmation toast */}
        {saveToast && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-1.5 flex items-center justify-center gap-1.5 font-medium shrink-0 animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* Expandable Kop Settings Accordion */}
        {showKopSettings && (
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[42vh] shrink-0 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Kustomisasi Kop Laporan & Berkas Dokumen
                </h4>
              </div>
              <button
                type="button"
                onClick={handleResetKop}
                className="px-2.5 py-1 text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 transition cursor-pointer font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Bawaan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Instansi Induk */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Instansi / Dinas Pendidikan:
                </label>
                <input
                  type="text"
                  value={kopConfig.instansiInduk}
                  onChange={(e) => handleUpdateKop('instansiInduk', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  placeholder="e.g. PEMERINTAH PROVINSI JAWA TIMUR | DINAS PENDIDIKAN"
                />
              </div>

              {/* Nama Sekolah */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nama Sekolah / Lembaga:
                </label>
                <input
                  type="text"
                  value={kopConfig.namaSekolah}
                  onChange={(e) => handleUpdateKop('namaSekolah', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  placeholder="e.g. SMK NEGERI 1 INFORMATIKA & TEKNOLOGI"
                />
              </div>

              {/* Sub Judul */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Sub Judul / Bidang Keahlian:
                </label>
                <input
                  type="text"
                  value={kopConfig.subJudul || ''}
                  onChange={(e) => handleUpdateKop('subJudul', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  placeholder="e.g. BIDANG KEAHLIAN TEKNOLOGI INFORMASI & KOMUNIKASI"
                />
              </div>

              {/* Alamat */}
              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Alamat Lengkap Sekolah:
                </label>
                <input
                  type="text"
                  value={kopConfig.alamat}
                  onChange={(e) => handleUpdateKop('alamat', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  placeholder="e.g. Jl. Pendidikan Vokasi No. 45 Surabaya 60237"
                />
              </div>

              {/* Kontak & Web */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Kontak (Telp, Email, Web):
                </label>
                <input
                  type="text"
                  value={kopConfig.kontak}
                  onChange={(e) => handleUpdateKop('kontak', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  placeholder="Telp / Email / Web"
                />
              </div>

              {/* Nomor Dokumen & Kota */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nomor Surat / Kode Laporan:
                </label>
                <input
                  type="text"
                  value={kopConfig.nomorSurat}
                  onChange={(e) => handleUpdateKop('nomorSurat', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  placeholder="421.5/PKL-PRES/2026"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Kota Pembuatan Surat:
                </label>
                <input
                  type="text"
                  value={kopConfig.kotaSurat}
                  onChange={(e) => handleUpdateKop('kotaSurat', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                  placeholder="Surabaya"
                />
              </div>

              {/* Garis Ganda Toggle */}
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={kopConfig.tampilkanGarisGanda}
                    onChange={(e) => handleUpdateKop('tampilkanGarisGanda', e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>Tampilkan Garis Ganda Pembatas Kop</span>
                </label>
              </div>
            </div>

            {/* Logo Settings */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Pengaturan Logo Surat (Kiri & Kanan)</span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo Kiri */}
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800 overflow-hidden shrink-0">
                    {kopConfig.logoKiri ? (
                      <img src={kopConfig.logoKiri} alt="Logo Kiri" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">SMK</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Logo Kiri (Sekolah)</span>
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={kopConfig.showLogoKiri}
                          onChange={(e) => handleUpdateKop('showLogoKiri', e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <span>Aktif</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputKiriRef}
                        accept="image/png, image/jpeg"
                        onChange={(e) => handleUploadLogo(e, 'kiri')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputKiriRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-md font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Logo</span>
                      </button>
                      {kopConfig.logoKiri && (
                        <button
                          type="button"
                          onClick={() => handleUpdateKop('logoKiri', '')}
                          className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-md transition cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logo Kanan */}
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-800 overflow-hidden shrink-0">
                    {kopConfig.logoKanan ? (
                      <img src={kopConfig.logoKanan} alt="Logo Kanan" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">PKL</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Logo Kanan (PKL / Mitra)</span>
                      <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={kopConfig.showLogoKanan}
                          onChange={(e) => handleUpdateKop('showLogoKanan', e.target.checked)}
                          className="rounded text-sky-600"
                        />
                        <span>Aktif</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputKananRef}
                        accept="image/png, image/jpeg"
                        onChange={(e) => handleUploadLogo(e, 'kanan')}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputKananRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-md font-medium flex items-center gap-1 transition cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload Logo</span>
                      </button>
                      {kopConfig.logoKanan && (
                        <button
                          type="button"
                          onClick={() => handleUpdateKop('logoKanan', '')}
                          className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-md transition cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Identitas Penandatangan */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Nama Kepala Sekolah:
                </label>
                <input
                  type="text"
                  value={kopConfig.namaKepalaSekolah}
                  onChange={(e) => handleUpdateKop('namaKepalaSekolah', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  NIP Kepala Sekolah:
                </label>
                <input
                  type="text"
                  value={kopConfig.nipKepalaSekolah}
                  onChange={(e) => handleUpdateKop('nipKepalaSekolah', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                    Nama Pembimbing DUDI:
                  </label>
                  {targetDUDI?.nama_pembimbing && (
                    <button
                      type="button"
                      onClick={() => handleUpdateKop('namaPembimbingDudi', targetDUDI.nama_pembimbing)}
                      className="text-[10px] text-sky-600 hover:text-sky-700 dark:text-sky-400 font-medium underline cursor-pointer"
                      title="Gunakan nama pembimbing dari data DUDI siswa"
                    >
                      Dari DUDI
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={kopConfig.namaPembimbingDudi}
                  onChange={(e) => handleUpdateKop('namaPembimbingDudi', e.target.value)}
                  placeholder="Nama Pembimbing Industri / DUDI"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  NIP / NIK / No. Identitas DUDI:
                </label>
                <input
                  type="text"
                  value={kopConfig.nipPembimbingDudi || ''}
                  onChange={(e) => handleUpdateKop('nipPembimbingDudi', e.target.value)}
                  placeholder="e.g. NIK. 3578... / ID / Kosongkan"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                  *Bisa diedit (NIK, NIP, ID, atau dikosongkan)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Printable Document Canvas (Sheet Preview) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/75 dark:bg-slate-950/85 flex justify-center">
          <div
            id="printable-pdf-document"
            style={{
              maxWidth: isF4 ? '215mm' : '210mm',
              minHeight: isF4 ? '330mm' : '297mm',
            }}
            className="bg-white text-slate-900 w-full p-6 sm:p-10 rounded-xl shadow-xl border border-slate-300 font-serif print:shadow-none print:border-none print:m-0 print:p-0 transition-all duration-300"
          >
            {/* Kop Surat Formal */}
            <div className="text-center pb-2 mb-1">
              <div className="flex items-center justify-between gap-3 mb-1">
                {/* Logo Kiri */}
                {kopConfig.showLogoKiri ? (
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                    {kopConfig.logoKiri ? (
                      <img
                        src={kopConfig.logoKiri}
                        alt="Logo Sekolah"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center font-sans font-bold text-[10px] text-slate-800">
                        SMK
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-14 shrink-0" />
                )}

                {/* Kop Text Tengah */}
                <div className="flex-1 px-2 text-center">
                  <p className="font-sans text-[10px] tracking-wider uppercase text-slate-700 font-bold">
                    {kopConfig.instansiInduk}
                  </p>
                  <h1 className="font-sans text-base sm:text-lg font-extrabold uppercase tracking-tight text-slate-950 leading-tight">
                    {kopConfig.namaSekolah}
                  </h1>
                  {kopConfig.subJudul && (
                    <p className="font-sans text-[10.5px] font-semibold text-slate-800 tracking-wide">
                      {kopConfig.subJudul}
                    </p>
                  )}
                  <p className="font-sans text-[10px] text-slate-600 mt-0.5 leading-normal">
                    {kopConfig.alamat}
                  </p>
                  <p className="font-sans text-[9.5px] text-slate-500 leading-tight">
                    {kopConfig.kontak}
                  </p>
                </div>

                {/* Logo Kanan */}
                {kopConfig.showLogoKanan ? (
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                    {kopConfig.logoKanan ? (
                      <img
                        src={kopConfig.logoKanan}
                        alt="Logo PKL"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center font-sans font-bold text-[10px] text-slate-800">
                        PKL
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-14 shrink-0" />
                )}
              </div>
            </div>

            {/* Line separator formal (Garis ganda atau tunggal) */}
            {kopConfig.tampilkanGarisGanda ? (
              <div className="mb-4">
                <div className="border-b-2 border-slate-900 mb-0.5"></div>
                <div className="border-b border-slate-900"></div>
              </div>
            ) : (
              <div className="border-b-2 border-slate-900 mb-4"></div>
            )}

            {/* Document Title */}
            <div className="text-center mb-4">
              <h2 className="font-sans text-sm sm:text-base font-bold uppercase tracking-wider underline text-slate-900">
                {targetSiswa
                  ? 'KARTU REKAPITULASI PRESENSI KEHADIRAN SISWA PKL'
                  : isGuru
                  ? 'LAPORAN REKAPITULASI PRESENSI SISWA BIMBINGAN PKL'
                  : 'LAPORAN REKAPITULASI PRESENSI SISWA PRAKTIK KERJA LAPANGAN (PKL)'}
              </h2>
              <p className="font-sans text-[11px] text-slate-600 mt-1">
                Nomor: {kopConfig.nomorSurat} • Periode: {periodLabel} • Kertas: {paperSize} ({isF4 ? '215 x 330 mm' : '210 x 297 mm'})
              </p>
            </div>

            {/* Metadata Section */}
            {targetSiswa ? (
              <div className="font-sans text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 grid grid-cols-2 gap-2 leading-relaxed">
                <div>
                  <p><strong>Nama Lengkap:</strong> {targetSiswa.nama_lengkap}</p>
                  <p><strong>NIS / Kelas:</strong> {targetSiswa.nis} / {targetSiswa.kelas}</p>
                  <p><strong>Kompetensi:</strong> {targetSiswa.jurusan}</p>
                </div>
                <div>
                  <p><strong>Mitra Industri (DUDI):</strong> {targetDUDI?.nama_instansi || '-'}</p>
                  <p><strong>Jam Kerja DUDI:</strong> {targetDUDI?.jam_masuk_standar || '08:00'} - {targetDUDI?.jam_pulang_standar || '17:00'} WIB</p>
                  <p><strong>Guru Pembimbing:</strong> {targetGuru?.nama_guru || '-'}</p>
                </div>
              </div>
            ) : (
              <div className="font-sans text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800">Cakupan Rekapitulasi:</span>{' '}
                  <span className="text-slate-600">
                    {isGuru ? `Siswa Bimbingan (${currentUser.nama_lengkap})` : 'Seluruh Siswa Peserta PKL SMK'}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-slate-800">Total Catatan:</span>{' '}
                  <span className="text-slate-600">{filtered.length} Hari Kehadiran</span>
                </div>
                <div>
                  <span className="font-bold text-slate-800">Status Validasi:</span>{' '}
                  <span className="text-emerald-700 font-semibold">Tervalidasi Cloud Database & GPS</span>
                </div>
              </div>
            )}

            {/* Attendance Table */}
            <div className="font-sans overflow-x-auto mb-4">
              <table className="w-full text-[11px] border-collapse border border-slate-400">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                    <th className="border border-slate-400 px-2 py-1 text-center w-8">No</th>
                    <th className="border border-slate-400 px-2 py-1 text-center w-20">Tanggal</th>
                    <th className="border border-slate-400 px-2 py-1 text-left">Nama Siswa</th>
                    <th className="border border-slate-400 px-2 py-1 text-left">Mitra DUDI</th>
                    <th className="border border-slate-400 px-2 py-1 text-center w-14">Masuk</th>
                    <th className="border border-slate-400 px-2 py-1 text-center w-14">Pulang</th>
                    <th className="border border-slate-400 px-2 py-1 text-center w-20">Status</th>
                    <th className="border border-slate-400 px-2 py-1 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-slate-400 p-4 text-center text-slate-500 italic">
                        Tidak ada data presensi pada rentang filter ini.
                      </td>
                    </tr>
                  ) : (
                    filtered.slice(0, isF4 ? 40 : 35).map((p, idx) => {
                      const s = siswaList.find((x) => x.id_siswa === p.id_siswa);
                      const d = s ? dudiList.find((x) => x.id_dudi === s.id_dudi) : null;
                      return (
                        <tr key={p.id_presensi} className="border-b border-slate-300 hover:bg-slate-50">
                          <td className="border border-slate-300 px-2 py-1 text-center">{idx + 1}</td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono text-[10px]">
                            {p.tanggal}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-800">
                            {s?.nama_lengkap || p.id_siswa}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-600 truncate max-w-[140px]">
                            {d?.nama_instansi || '-'}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono text-[10px]">
                            {p.jam_masuk || '-'}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-mono text-[10px]">
                            {p.jam_pulang || '-'}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-semibold">
                            <span
                              className={
                                p.status === 'Hadir'
                                  ? 'text-emerald-800'
                                  : p.status === 'Izin'
                                  ? 'text-sky-800'
                                  : 'text-rose-800'
                              }
                            >
                              {p.status}
                              {p.status_ketepatan === 'Terlambat' && ' (T)'}
                            </span>
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-slate-600 text-[10px] truncate max-w-[150px]">
                            {p.keterangan || (p.koordinat_absen?.dalam_radius ? 'Tervalidasi GPS' : 'Sesuai Prosedur')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {filtered.length > (isF4 ? 40 : 35) && (
                <p className="font-sans text-[10px] text-slate-500 mt-1 italic text-right">
                  * Pratinjau menampilkan {isF4 ? 40 : 35} dari {filtered.length} baris. Seluruh baris lengkap tercetak di dokumen PDF unduhan.
                </p>
              )}
            </div>

            {/* Recap Box */}
            <div className="font-sans text-xs bg-slate-100 border border-slate-300 rounded-lg p-3 mb-6">
              <h4 className="font-bold text-slate-800 mb-1">Ringkasan Statistik Kehadiran:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
                <div>Total Hari: <strong>{totalHari}</strong></div>
                <div>Hadir: <strong className="text-emerald-700">{totalHadir}</strong> ({totalTepat} Tepat, {totalTerlambat} Terlambat)</div>
                <div>Izin: <strong className="text-sky-700">{totalIzin}</strong> | Sakit: <strong className="text-purple-700">{totalSakit}</strong></div>
                <div>Alpa: <strong className="text-rose-700">{totalAlpa}</strong> | Rata-rata: <strong>{persentaseHadir}%</strong></div>
              </div>
            </div>

            {/* Formal Signatures Sheet (Atas: Pembimbing DUDI & Guru Pembimbing PKL, Bawah Tengah: Kepala Sekolah) */}
            {includeSignatures && (
              <div className="font-sans text-xs pt-4 border-t border-slate-200 space-y-6">
                {/* Baris Atas: 2 Kolom (Kiri: Pembimbing Industri, Kanan: Guru Pembimbing) */}
                <div className="grid grid-cols-2 gap-8">
                  {/* 1. Kolom Kiri: Pembimbing Industri (DUDI) */}
                  <div className="text-center">
                    <p className="text-slate-600">Menyetujui,</p>
                    <p className="font-bold text-slate-800">
                      Pembimbing Industri / DUDI
                    </p>
                    <p className="text-[11px] text-slate-500 mb-12 truncate">
                      {targetDUDI?.nama_instansi || 'Mitra DUDI'}
                    </p>
                    <p className="font-bold underline text-slate-900 truncate">
                      {effectiveDudiSupervisorName}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {effectiveDudiSupervisorNipNik || 'Tanda Tangan & Cap DUDI'}
                    </p>
                  </div>

                  {/* 2. Kolom Kanan: Guru Pembimbing PKL */}
                  <div className="text-center">
                    <p className="text-slate-600">
                      {kopConfig.kotaSurat}, {new Date().toLocaleDateString('id-ID')}
                    </p>
                    <p className="font-bold text-slate-800">
                      Guru Pembimbing PKL
                    </p>
                    <p className="text-[11px] text-slate-500 mb-12 truncate">
                      {kopConfig.namaSekolah}
                    </p>
                    <p className="font-bold underline text-slate-900 truncate">
                      {effectiveGuruName}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {effectiveGuruNip}
                    </p>
                  </div>
                </div>

                {/* Baris Bawah: Bagian Tengah (Kepala Sekolah) */}
                <div className="flex justify-center pt-2">
                  <div className="text-center w-64 sm:w-80">
                    <p className="text-slate-600">Mengesahkan,</p>
                    <p className="font-bold text-slate-800">
                      Kepala {kopConfig.namaSekolah}
                    </p>
                    <div className="h-12 flex items-center justify-center">
                      <span className="text-[10px] text-slate-300 italic">( Tanda Tangan & Stempel )</span>
                    </div>
                    <p className="font-bold underline text-slate-900 truncate">
                      {kopConfig.namaKepalaSekolah}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {kopConfig.nipKepalaSekolah ? (kopConfig.nipKepalaSekolah.startsWith('NIP') ? kopConfig.nipKepalaSekolah : `NIP. ${kopConfig.nipKepalaSekolah}`) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
