export type Role = 'Admin' | 'Guru Pembimbing' | 'Siswa' | 'DUDI';

export interface User {
  id_user: string;
  username: string;
  password_hash: string;
  role: Role;
  nama_lengkap: string;
  nomor_wa: string;
  id_dudi?: string; // Hubungan DUDI untuk role DUDI
}

export interface Siswa {
  id_siswa: string;
  id_user: string;
  nama_lengkap: string;
  nis: string;
  kelas: string;
  jurusan: string;
  id_dudi: string;
  id_guru_pembimbing: string;
  nomor_wa: string;
  nomor_wa_ortu: string;
  foto_profil?: string;
  alamat?: string;
  email?: string;
}

export interface GuruPembimbing {
  id_guru: string;
  id_user: string;
  nama_guru: string;
  siswa_bimbingan: string; // Nama siswa yang dibimbing (pengganti NIP)
  nip?: string;
  nomor_wa: string;
  jadwal_kunjungan: string; // Jadwal kunjungan ke tempat DUDI (pengganti Email Institusi)
  email?: string;
}

export type HariKerja = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';

export type TipeJadwalKerja = 'Reguler' | 'Shift' | 'Kondisional';

export interface ShiftKerja {
  id_shift: string;
  nama_shift: string; // e.g. "Shift 1 Pagi", "Shift 2 Siang", "Reguler", "Kondisional Jumat"
  kode_shift?: string; // "PAGI" | "SIANG" | "MALAM" | "REGULER"
  jam_masuk: string; // "08:00"
  jam_pulang: string; // "16:30"
  hari_khusus?: string[]; // Jika shift berlaku spesifik untuk hari tertentu (misal: hanya Jumat)
  toleransi_keterlambatan_menit?: number; // e.g. 15 menit
  keterangan?: string;
}

export interface DUDI {
  id_dudi: string;
  nama_instansi: string;
  bidang: string;
  alamat: string;
  koordinat_lokasi: {
    latitude: number;
    longitude: number;
  };
  radius_meter: number; // radius toleransi absensi (misal 100m)
  hari_kerja: string[]; // e.g. ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']
  tipe_jadwal: TipeJadwalKerja; // 'Reguler' | 'Shift' | 'Kondisional'
  daftar_shift: ShiftKerja[];
  jam_masuk_standar: string; // e.g. "08:00" (fallback)
  jam_pulang_standar: string; // e.g. "16:30" (fallback)
}

export type StatusPresensi = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';

export type StatusKetepatan = 'Tepat Waktu' | 'Terlambat' | 'Tepat / Lebih Awal';

export type StatusPersetujuanDudi = 'Menunggu' | 'Disetujui' | 'Ditolak';

export interface Presensi {
  id_presensi: string;
  id_siswa: string;
  tanggal: string; // YYYY-MM-DD
  hari?: string; // e.g. "Senin", "Selasa"
  jam_masuk: string; // HH:mm:ss
  jam_pulang: string | null;
  status: StatusPresensi;
  foto_selfie: string;
  koordinat_absen: {
    latitude: number;
    longitude: number;
    jarak_meter: number;
    dalam_radius: boolean;
  };
  // Data Shift & Jam Kondisional
  id_shift?: string;
  nama_shift?: string;
  jadwal_masuk?: string; // e.g. "08:00"
  jadwal_pulang?: string; // e.g. "16:30"
  status_ketepatan?: StatusKetepatan;
  keterangan?: string;
  notifikasi_wa_terkirim?: boolean;
  is_offline_pending?: boolean;
  synced_to_db?: boolean;
  synced_to_firebase?: boolean; // deprecated, alias for synced_to_db
  synced_at?: string;
  drive_file_id?: string;
  drive_view_url?: string;

  // Persetujuan Presensi oleh Pembimbing DUDI
  status_persetujuan_dudi?: StatusPersetujuanDudi;
  catatan_dudi?: string;
  disetujui_dudi_pada?: string;
  nama_pembimbing_dudi?: string;
}

export type StatusValidasiJurnal = 'Menunggu' | 'Disetujui' | 'Perlu Revisi';

export interface JurnalHarian {
  id_jurnal: string;
  id_siswa: string;
  tanggal: string;
  deskripsi_kegiatan: string;
  kendala: string;
  solusi?: string;

  // Validasi Guru Pembimbing
  status_validasi_guru: StatusValidasiJurnal;
  catatan_guru?: string;
  validated_at?: string | null;
  nama_guru_penilai?: string;

  // Persetujuan / Validasi Pembimbing DUDI
  status_validasi_dudi?: StatusValidasiJurnal;
  catatan_dudi?: string;
  validated_dudi_at?: string | null;
  nama_dudi_penilai?: string;
}

export interface KunjunganGuru {
  id_kunjungan: string;
  id_guru: string;
  nama_guru: string;
  id_dudi: string;
  nama_dudi: string;
  tanggal: string; // YYYY-MM-DD
  jam_kunjungan: string; // HH:mm:ss
  tujuan_kunjungan: string;
  catatan_evaluasi: string;
  foto_kunjungan: string;
  koordinat: {
    latitude: number;
    longitude: number;
    jarak_meter: number;
    dalam_radius: boolean;
  };
  siswa_dikunjungi: string[];
  status_kunjungan: 'Selesai' | 'Berlangsung';
  drive_file_id?: string;
  drive_view_url?: string;
  synced_to_db?: boolean;
}

export interface FonnteConfig {
  apiKey: string;
  senderPhone: string;
  autoNotifyParentOnAbsence: boolean;
  autoNotifyOnCheckIn: boolean;
}

export type KategoriAktivitas =
  | 'Autentikasi'
  | 'Presensi'
  | 'Jurnal'
  | 'Master Data'
  | 'Google Drive'
  | 'WhatsApp'
  | 'Sistem';

export type StatusAktivitas = 'Sukses' | 'Peringatan' | 'Gagal' | 'Info';

export interface LogAktivitas {
  id_log: string;
  waktu: string; // ISO string / timestamp
  kategori: KategoriAktivitas;
  aksi: string;
  deskripsi: string;
  pengguna: string;
  role: Role;
  status: StatusAktivitas;
  ip_device?: string;
}

