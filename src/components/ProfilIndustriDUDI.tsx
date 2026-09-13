import React from 'react';
import {
  Building2,
  MapPin,
  Clock,
  Users,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  UserCheck,
  Eye,
  Calendar,
  Layers,
} from 'lucide-react';
import { User, DUDI, Siswa, GuruPembimbing, Presensi } from '../types';

interface ProfilIndustriDUDIProps {
  currentUser: User;
  dudiList: DUDI[];
  siswaList: Siswa[];
  guruList: GuruPembimbing[];
  presensiList: Presensi[];
  onSelectSiswaDetail?: (siswa: Siswa) => void;
  onNavigateTab: (tab: string) => void;
}

export const ProfilIndustriDUDI: React.FC<ProfilIndustriDUDIProps> = ({
  currentUser,
  dudiList,
  siswaList,
  guruList,
  presensiList,
  onSelectSiswaDetail,
  onNavigateTab,
}) => {
  // Find matched DUDI for this mentor
  const activeDUDI =
    dudiList.find((d) => d.id_dudi === currentUser.id_dudi) ||
    dudiList.find((d) =>
      currentUser.nama_lengkap.toLowerCase().includes(d.nama_instansi.toLowerCase().slice(0, 8))
    ) ||
    dudiList[0];

  // Interns placed at this DUDI
  const internsAtDudi = siswaList.filter((s) => s.id_dudi === activeDUDI?.id_dudi);

  // Today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Map of today's attendance for interns
  const todayPresensiMap = new Map<string, Presensi>();
  presensiList.forEach((p) => {
    if (p.tanggal === todayStr) {
      todayPresensiMap.set(p.id_siswa, p);
    }
  });

  const googleMapsUrl = activeDUDI?.koordinat_lokasi
    ? `https://www.google.com/maps?q=${activeDUDI.koordinat_lokasi.latitude},${activeDUDI.koordinat_lokasi.longitude}`
    : null;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      {/* Banner Instansi DUDI */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 rounded-2xl p-5 border border-indigo-500/30 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold tracking-wider uppercase mb-1">
                <ShieldCheck className="w-3 h-3" /> Profil & Data Operasional DUDI
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {activeDUDI?.nama_instansi || 'Mitra Industri PKL'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Bidang: {activeDUDI?.bidang || 'Teknologi & Industri'} • Pembimbing:{' '}
                {currentUser.nama_lengkap}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('presensi')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95 shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verifikasi Presensi</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('jurnal')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Verifikasi Jurnal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Profil Lokasi & Shift Kerja */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Detail Lokasi & Geofence Radius */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Titik Koordinat & Geofence
              </h3>
            </div>
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Buka Google Maps</span>
              </a>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[11px]">Alamat Lengkap</span>
              <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed mt-0.5">
                {activeDUDI?.alamat || '-'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">Radius Presensi</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {activeDUDI?.koordinat_lokasi?.radius_meter || 100} meter
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">Koordinat GPS</span>
                <span className="text-[11px] font-mono text-slate-800 dark:text-slate-200 truncate block">
                  {activeDUDI?.koordinat_lokasi?.latitude.toFixed(5)},{' '}
                  {activeDUDI?.koordinat_lokasi?.longitude.toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Kerja Magang */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Shift Kerja & Jam Operasional
              </h3>
            </div>
            <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
              3 Shift Tersedia
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Shift Reguler / Normal</p>
                <p className="text-[10px] text-slate-400">Senin - Jumat • Toleransi 15 mnt</p>
              </div>
              <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                08:00 - 16:30
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Shift 1 (Pagi)</p>
                <p className="text-[10px] text-slate-400">Shift Pagi Operasional</p>
              </div>
              <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                07:00 - 15:00
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">Shift 2 (Siang)</p>
                <p className="text-[10px] text-slate-400">Shift Siang Operasional</p>
              </div>
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                14:00 - 22:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Siswa Magang Aktif di DUDI ini */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Daftar Siswa Magang Aktif ({internsAtDudi.length} Siswa)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Status Kehadiran Hari Ini: {todayStr}
          </span>
        </div>

        {internsAtDudi.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada siswa yang ditempatkan di DUDI ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {internsAtDudi.map((siswa) => {
              const presensiToday = todayPresensiMap.get(siswa.id_siswa);
              const guru = guruList.find((g) => g.id_guru === siswa.id_guru_pembimbing);

              return (
                <div
                  key={siswa.id_siswa}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5 transition hover:border-indigo-400 dark:hover:border-indigo-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {siswa.nama_lengkap}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        NIS: {siswa.nis} • {siswa.kelas} ({siswa.jurusan})
                      </p>
                    </div>

                    {presensiToday ? (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Hadir ({presensiToday.jam_masuk})</span>
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>Belum Hadir</span>
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <span>Guru Pembimbing:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {guru?.nama_guru || '-'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {onSelectSiswaDetail && (
                      <button
                        type="button"
                        onClick={() => onSelectSiswaDetail(siswa)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                      >
                        <Eye className="w-3 h-3 text-sky-500" />
                        <span>Profil Siswa</span>
                      </button>
                    )}

                    {siswa.nomor_wa && (
                      <a
                        href={`https://wa.me/${siswa.nomor_wa.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs active:scale-95 transition"
                        title="Chat WhatsApp Siswa"
                      >
                        <Phone className="w-3 h-3" />
                        <span>WA</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
