import React from 'react';
import {
  Building2,
  GraduationCap,
  MapPin,
  Clock,
  Phone,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import { Siswa, DUDI, GuruPembimbing, Presensi, User } from '../types';

interface InfoPKLSiswaProps {
  currentUser: User;
  siswaList: Siswa[];
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  presensiList: Presensi[];
  onNavigateTab: (tab: string) => void;
}

export const InfoPKLSiswa: React.FC<InfoPKLSiswaProps> = ({
  currentUser,
  siswaList,
  dudiList,
  guruList,
  presensiList,
  onNavigateTab,
}) => {
  // Find current student object
  const currentSiswa =
    siswaList.find(
      (s) =>
        s.id_siswa === currentUser.id_user ||
        s.nama_lengkap.toLowerCase() === currentUser.nama_lengkap.toLowerCase()
    ) || siswaList[0];

  // Find assigned DUDI
  const assignedDudi = dudiList.find((d) => d.id_dudi === currentSiswa?.id_dudi);

  // Find assigned Guru Pembimbing
  const assignedGuru = guruList.find(
    (g) => g.id_guru === currentSiswa?.id_guru_pembimbing
  );

  // Find today's attendance status
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPresensi = presensiList.find(
    (p) => p.id_siswa === currentSiswa?.id_siswa && p.tanggal === todayStr
  );

  // Google Maps URL
  const googleMapsUrl = assignedDudi?.koordinat_lokasi
    ? `https://www.google.com/maps?q=${assignedDudi.koordinat_lokasi.latitude},${assignedDudi.koordinat_lokasi.longitude}`
    : null;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Banner Header Info Penempatan PKL */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 rounded-2xl p-5 border border-emerald-500/30 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase mb-1">
                <ShieldCheck className="w-3 h-3" /> Data Penempatan Resmi PKL
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {currentSiswa?.nama_lengkap}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                NIS: {currentSiswa?.nis} • Kelas: {currentSiswa?.kelas} • Jurusan: {currentSiswa?.jurusan}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('presensi')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Buka Presensi</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('jurnal')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Tulis Jurnal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Informasi Utama Penempatan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kartu DUDI Instansi Tempat Magang */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Instansi Mitra DUDI
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              Tempat Praktik
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Nama Instansi / Perusahaan</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {assignedDudi?.nama_instansi || 'Belum Terploting'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Bidang Usaha</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {assignedDudi?.bidang || '-'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Alamat Lengkap</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{assignedDudi?.alamat || '-'}</span>
              </p>
            </div>

            {assignedDudi?.koordinat_lokasi && (
              <div className="pt-1.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Radius Presensi:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {assignedDudi.koordinat_lokasi.radius_meter} meter
                  </strong>
                </span>
                {googleMapsUrl && (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Petunjuk Arah (Maps)</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Kartu Guru Pembimbing Sekolah */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Guru Pembimbing Sekolah
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
              Monitoring & Bimbingan
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Nama Guru Pembimbing</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {assignedGuru?.nama_guru || 'Belum Ditugaskan'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Jadwal Kunjungan Supervisi</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>{assignedGuru?.jadwal_kunjungan || 'Setiap 2 Pekan Sekali'}</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Nomor WhatsApp Pembimbing</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>{assignedGuru?.nomor_wa || '-'}</span>
              </p>
            </div>

            {assignedGuru?.nomor_wa && (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${assignedGuru.nomor_wa.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Hubungi Guru via WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Baris Status Presensi Hari Ini & Jam Kerja */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Shift Kerja & Status Presensi Hari Ini ({todayStr})
            </h3>
          </div>
          {todayPresensi ? (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Sudah Presensi ({todayPresensi.status})
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Belum Presensi Masuk
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Jam Masuk Kerja</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">08:00 WIB</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Toleransi s/d 08:15 WIB</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Jam Pulang Kerja</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">16:30 WIB</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Check-Out Wajib Foto</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Verifikasi Industri (DUDI)</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {todayPresensi?.persetujuan_dudi?.status || 'Menunggu'}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Diperiksa Instruktur</span>
          </div>
        </div>
      </div>

      {/* Pedoman Tata Tertib & Hak Kewajiban */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-400 leading-relaxed">
        <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-sky-500" />
          Tata Tertib & Kewajiban Peserta PKL:
        </p>
        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
          <li>Melakukan presensi mandiri saat tiba dan sebelum meninggalkan tempat magang di dalam radius lokasi DUDI.</li>
          <li>Mengenakan pakaian seragam sekolah / seragam PKL rapi serta ID Card saat mengambil foto selfie bukti presensi.</li>
          <li>Mengisi jurnal kegiatan harian setiap hari kerja sebelum pukul 21:00 WIB untuk diverifikasi oleh Pembimbing DUDI dan Guru Pembimbing.</li>
          <li>Apabila berhalangan hadir karena sakit atau izin mendesak, segera laporkan ke Pembimbing DUDI dan Guru Pembimbing serta unggah surat keterangan.</li>
        </ul>
      </div>
    </div>
  );
};
