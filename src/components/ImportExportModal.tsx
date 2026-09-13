import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
  Building2,
  GraduationCap,
  Users,
  Check,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { Siswa, DUDI, GuruPembimbing } from '../types';
import {
  readUploadedFileToJSON,
  parseSiswaImport,
  parseDUDIImport,
  parseGuruImport,
  exportSiswaToExcel,
  downloadSiswaTemplate,
  exportDUDIToExcel,
  downloadDUDITemplate,
  exportGuruToExcel,
  downloadGuruTemplate,
  ParseResult,
} from '../utils/excelHelper';

export type MasterDataType = 'dudi' | 'siswa' | 'guru';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: MasterDataType;
  initialMode?: 'import' | 'export';
  siswaList: Siswa[];
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  onImportSiswa: (newItems: Siswa[]) => void;
  onImportDUDI: (newItems: DUDI[]) => void;
  onImportGuru: (newItems: GuruPembimbing[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  type,
  initialMode = 'import',
  siswaList,
  dudiList,
  guruList,
  onImportSiswa,
  onImportDUDI,
  onImportGuru,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(initialMode);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Parsed results
  const [siswaParseResult, setSiswaParseResult] = useState<ParseResult<Siswa> | null>(null);
  const [dudiParseResult, setDudiParseResult] = useState<ParseResult<DUDI> | null>(null);
  const [guruParseResult, setGuruParseResult] = useState<ParseResult<GuruPembimbing> | null>(null);

  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const getEntityTitle = () => {
    switch (type) {
      case 'dudi':
        return { label: 'Data DUDI / Industri', icon: Building2, count: dudiList.length };
      case 'siswa':
        return { label: 'Data Siswa Magang', icon: GraduationCap, count: siswaList.length };
      case 'guru':
        return { label: 'Data Guru Pembimbing', icon: Users, count: guruList.length };
    }
  };

  const entity = getEntityTitle();
  const IconComponent = entity.icon;

  const handleFileChange = async (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      setErrorMessage('Format file tidak didukung. Harap unggah file dengan format .xlsx, .xls, atau .csv');
      return;
    }

    setErrorMessage(null);
    setImportSuccessMessage(null);
    setSelectedFileName(file.name);
    setIsProcessing(true);

    try {
      const rawRows = await readUploadedFileToJSON(file);
      if (rawRows.length === 0) {
        setErrorMessage('File kosong atau tidak memiliki baris data yang valid.');
        setIsProcessing(false);
        return;
      }

      if (type === 'siswa') {
        const parsed = parseSiswaImport(rawRows, siswaList, dudiList, guruList);
        setSiswaParseResult(parsed);
      } else if (type === 'dudi') {
        const parsed = parseDUDIImport(rawRows, dudiList);
        setDudiParseResult(parsed);
      } else if (type === 'guru') {
        const parsed = parseGuruImport(rawRows, guruList);
        setGuruParseResult(parsed);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Gagal memproses file. Pastikan format tabel sesuai template.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (type === 'siswa' && siswaParseResult && siswaParseResult.validRows.length > 0) {
      onImportSiswa(siswaParseResult.validRows);
      setImportSuccessMessage(`Berhasil mengimpor ${siswaParseResult.validRows.length} data Siswa.`);
      setSiswaParseResult(null);
      setSelectedFileName(null);
      setTimeout(() => {
        onClose();
      }, 1400);
    } else if (type === 'dudi' && dudiParseResult && dudiParseResult.validRows.length > 0) {
      onImportDUDI(dudiParseResult.validRows);
      setImportSuccessMessage(`Berhasil mengimpor ${dudiParseResult.validRows.length} data DUDI.`);
      setDudiParseResult(null);
      setSelectedFileName(null);
      setTimeout(() => {
        onClose();
      }, 1400);
    } else if (type === 'guru' && guruParseResult && guruParseResult.validRows.length > 0) {
      onImportGuru(guruParseResult.validRows);
      setImportSuccessMessage(`Berhasil mengimpor ${guruParseResult.validRows.length} data Guru Pembimbing.`);
      setGuruParseResult(null);
      setSelectedFileName(null);
      setTimeout(() => {
        onClose();
      }, 1400);
    }
  };

  const handleDownloadTemplate = (fileType: 'xlsx' | 'csv') => {
    if (type === 'siswa') downloadSiswaTemplate(dudiList, guruList, fileType);
    else if (type === 'dudi') downloadDUDITemplate(fileType);
    else if (type === 'guru') downloadGuruTemplate(fileType);
  };

  const handleExportData = (fileType: 'xlsx' | 'csv') => {
    if (type === 'siswa') exportSiswaToExcel(siswaList, dudiList, guruList, fileType);
    else if (type === 'dudi') exportDUDIToExcel(dudiList, fileType);
    else if (type === 'guru') exportGuruToExcel(guruList, fileType);
  };

  const currentResult =
    type === 'siswa'
      ? siswaParseResult
      : type === 'dudi'
      ? dudiParseResult
      : guruParseResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 my-auto max-h-[92vh] flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-800/50">
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Impor & Ekspor {entity.label}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kelola data massal dengan mudah menggunakan spreadsheet Excel (.xlsx) atau CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Import vs Export */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mt-3 shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor Data Massal (Excel / CSV)</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Data ({entity.count} Terdaftar)</span>
          </button>
        </div>

        {/* Success Alert */}
        {importSuccessMessage && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{importSuccessMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-fadeIn shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-4 text-xs">
          {activeTab === 'import' && (
            <>
              {/* Template Download Prompt */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold block text-xs">
                      Belum memiliki format file?
                    </strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Unduh template resmi berikut yang sudah disesuaikan dengan struktur kolom sistem PKL:
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] rounded-lg border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1 transition shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Template Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition shadow-2xs cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40'
                    : 'border-slate-300 dark:border-slate-700 hover:border-sky-400 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-sky-50/20 dark:hover:bg-sky-950/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                <div className="w-10 h-10 mx-auto rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>

                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedFileName ? (
                    <span className="text-sky-700 dark:text-sky-400">File terpilih: {selectedFileName}</span>
                  ) : (
                    'Klik untuk memilih file atau seret file ke area ini'
                  )}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Mendukung file Microsoft Excel (.xlsx, .xls) dan CSV (.csv)
                </p>

                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-sky-600 dark:text-sky-400 font-semibold text-xs">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menganalisis dan memvalidasi baris data...</span>
                  </div>
                )}
              </div>

              {/* Column Guidelines Card */}
              <div className="p-3 bg-sky-50/60 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-300 text-xs">
                  <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Panduan Pengisian Kolom Spreadsheet:</span>
                </div>
                {type === 'siswa' && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <li>
                      <strong>Nama Lengkap</strong>: Wajib diisi.
                    </li>
                    <li>
                      <strong>Tempat PKL / DUDI</strong>: Bisa diisi Nama Perusahaan (misal:{' '}
                      <em>{dudiList[0]?.nama_instansi || 'PT Telkom'}</em>) atau ID DUDI. Sistem otomatis mencocokkannya.
                    </li>
                    <li>
                      <strong>Guru Pembimbing</strong>: Bisa diisi Nama Guru (misal:{' '}
                      <em>{guruList[0]?.nama_guru || 'Drs. Budi'}</em>) atau NIP atau ID Guru.
                    </li>
                    <li>
                      <strong>NIS, Kelas, Jurusan, Nomor WA</strong>: Opsional, akan diisi nilai standar jika kosong.
                    </li>
                  </ul>
                )}
                {type === 'dudi' && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <li>
                      <strong>Nama Instansi</strong>: Wajib diisi.
                    </li>
                    <li>
                      <strong>Latitude & Longitude</strong>: Koordinat kantor untuk geofence validasi radius (misal: -7.3055, 112.7378).
                    </li>
                    <li>
                      <strong>Hari Kerja</strong>: Contoh: <em>Senin, Selasa, Rabu, Kamis, Jumat</em> atau <em>Semua Hari</em>.
                    </li>
                    <li>
                      <strong>Sistem Jadwal</strong>: Pilih antara <em>Reguler</em>, <em>Shift</em>, atau <em>Kondisional</em>.
                    </li>
                  </ul>
                )}
                {type === 'guru' && (
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <li>
                      <strong>Nama Lengkap</strong>: Wajib diisi (sertakan gelar bila ada).
                    </li>
                    <li>
                      <strong>Nama Siswa yang Dibimbing</strong>: Tuliskan nama siswa yang dibimbing (misal: <em>Budi Santoso (XII RPL 1), Siti Rahma</em>).
                    </li>
                    <li>
                      <strong>Nomor WhatsApp</strong>: Kontak WhatsApp guru untuk notifikasi monitoring siswa.
                    </li>
                    <li>
                      <strong>Jadwal Kunjungan ke Tempat DUDI</strong>: Agenda supervisi ke tempat magang (misal: <em>Setiap Selasa & Kamis (Pkl 10:00 WIB)</em>).
                    </li>
                  </ul>
                )}
              </div>

              {/* Data Preview Table */}
              {currentResult && currentResult.validRows.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs space-y-2">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Hasil Validasi: Siap Impor {currentResult.validRows.length} Baris Data</span>
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Total baris dibaca: {currentResult.totalRows}
                    </span>
                  </div>

                  {currentResult.errors.length > 0 && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 border-b border-amber-100 dark:border-amber-800/50 text-amber-900 dark:text-amber-300 text-[11px] space-y-1">
                      <strong className="block">Perhatian (Baris dilewati / perlu perbaikan):</strong>
                      <ul className="list-disc list-inside space-y-0.5 text-[10px] text-amber-800 dark:text-amber-300 max-h-24 overflow-y-auto">
                        {currentResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="max-h-48 overflow-y-auto overflow-x-auto text-[11px]">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-100 dark:border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2">No</th>
                          <th className="p-2">Nama / Instansi</th>
                          {type === 'siswa' && (
                            <>
                              <th className="p-2">NIS & Kelas</th>
                              <th className="p-2">Tempat DUDI</th>
                              <th className="p-2">Pembimbing</th>
                            </>
                          )}
                          {type === 'dudi' && (
                            <>
                              <th className="p-2">Bidang</th>
                              <th className="p-2">Hari & Sistem</th>
                              <th className="p-2">Jam Kerja</th>
                            </>
                          )}
                          {type === 'guru' && (
                            <>
                              <th className="p-2">Siswa yang Dibimbing</th>
                              <th className="p-2">WhatsApp</th>
                              <th className="p-2">Jadwal Kunjungan DUDI</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {type === 'siswa' &&
                          siswaParseResult?.validRows.map((s, idx) => {
                            const d = dudiList.find((x) => x.id_dudi === s.id_dudi);
                            const g = guruList.find((x) => x.id_guru === s.id_guru_pembimbing);
                            return (
                              <tr key={s.id_siswa || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                <td className="p-2 text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                                <td className="p-2 font-bold text-slate-800 dark:text-slate-100">{s.nama_lengkap}</td>
                                <td className="p-2 text-slate-600 dark:text-slate-300">
                                  {s.nis} ({s.kelas})
                                </td>
                                <td className="p-2 text-sky-700 dark:text-sky-400 font-medium">
                                  {d?.nama_instansi || s.id_dudi}
                                </td>
                                <td className="p-2 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                                  {g?.nama_guru || s.id_guru_pembimbing}
                                </td>
                              </tr>
                            );
                          })}

                        {type === 'dudi' &&
                          dudiParseResult?.validRows.map((d, idx) => (
                            <tr key={d.id_dudi || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="p-2 text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-800 dark:text-slate-100">{d.nama_instansi}</td>
                              <td className="p-2 text-slate-600 dark:text-slate-300">{d.bidang}</td>
                              <td className="p-2">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                                  {d.tipe_jadwal}
                                </span>
                              </td>
                              <td className="p-2 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                                {d.jam_masuk_standar} - {d.jam_pulang_standar}
                              </td>
                            </tr>
                          ))}

                        {type === 'guru' &&
                          guruParseResult?.validRows.map((g, idx) => (
                            <tr key={g.id_guru || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="p-2 text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                              <td className="p-2 font-bold text-slate-800 dark:text-slate-100">{g.nama_guru}</td>
                              <td className="p-2 text-slate-700 dark:text-slate-300 text-[11px]">{g.siswa_bimbingan || '-'}</td>
                              <td className="p-2 text-emerald-700 dark:text-emerald-400 font-mono text-[11px]">{g.nomor_wa}</td>
                              <td className="p-2 text-amber-800 dark:text-amber-300 text-[11px]">{g.jadwal_kunjungan || '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <IconComponent className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <strong className="text-slate-800 dark:text-slate-200 font-bold text-sm">
                    Ekspor Seluruh {entity.label}
                  </strong>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs">
                  Unduh data aktif yang tersimpan saat ini ({entity.count} entitas) ke dalam format tabel spreadsheet untuk keperluan arsip, laporan sekolah, atau backup.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleExportData('xlsx')}
                  className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-left transition flex items-start gap-3 group shadow-2xs cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-emerald-950 dark:text-emerald-300 font-bold block text-xs group-hover:text-emerald-800 dark:group-hover:text-emerald-200">
                      Ekspor Excel (.xlsx)
                    </strong>
                    <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 mt-0.5">
                      Format spreadsheet lengkap dengan styling kolom dan referensi relasi.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportData('csv')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-left transition flex items-start gap-3 group shadow-2xs cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-slate-900 dark:text-white font-bold block text-xs group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      Ekspor CSV (.csv)
                    </strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Format standar teks terpisah koma untuk integrasi sistem database lain.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 mt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Tutup
          </button>

          {activeTab === 'import' && (
            <button
              type="button"
              disabled={!currentResult || currentResult.validRows.length === 0}
              onClick={handleConfirmImport}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-sky-600 text-sky-400 dark:text-white hover:bg-slate-800 dark:hover:bg-sky-500 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-40 disabled:pointer-events-none shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>
                Simpan & Impor {currentResult?.validRows.length || 0} Data {type.toUpperCase()}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
