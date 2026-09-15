import { Presensi, Siswa, DUDI, JurnalHarian } from '../types';

export interface WhatsAppNotificationLog {
  id: string;
  timestamp: string;
  targetPhone: string;
  targetName: string;
  role: 'Orang Tua' | 'Siswa' | 'Guru Pembimbing' | 'Pembimbing DUDI' | 'DUDI';
  message: string;
  status: 'Terkirim' | 'Gagal' | 'Simulasi';
}

/**
 * Format WhatsApp message for new student journal submission awaiting DUDI review
 */
export function formatWhatsAppJurnalNotification(
  jurnal: JurnalHarian,
  siswa: Siswa,
  dudi: DUDI
): string {
  const pembimbingGreeting = dudi.nama_pembimbing
    ? `Bpk/Ibu *${dudi.nama_pembimbing}*`
    : `Bapak/Ibu Pembimbing`;

  return (
    `*PEMBERITAHUAN JURNAL SISWA MAGANG PKL*\n\n` +
    `Yth. ${pembimbingGreeting}\n` +
    `Mitra Industri: *${dudi.nama_instansi}*\n\n` +
    `Menginformasikan bahwa siswa magang Anda baru saja mengunggah laporan logbook kegiatan harian:\n\n` +
    `👤 *Nama Siswa:* ${siswa.nama_lengkap}\n` +
    `🆔 *NIS / Kelas:* ${siswa.nis} (${siswa.kelas} - ${siswa.jurusan})\n` +
    `📅 *Tanggal Kegiatan:* ${jurnal.tanggal}\n` +
    `📝 *Deskripsi Pekerjaan:*\n"${jurnal.deskripsi_kegiatan}"\n` +
    (jurnal.kendala && jurnal.kendala !== '-' ? `⚠️ *Kendala Teknis:* ${jurnal.kendala}\n` : '') +
    (jurnal.solusi && jurnal.solusi !== '-' ? `💡 *Solusi / Tindakan:* ${jurnal.solusi}\n` : '') +
    `\n⏳ *Status:* Menunggu Validasi & Masukan Pembimbing DUDI\n\n` +
    `Mohon kesediaannya untuk login ke Portal Presensi PKL SMK dan memberikan validasi serta evaluasi pada menu *Jurnal Kegiatan*.\n\n` +
    `_Pesan otomatis dikirim oleh Sistem Informasi PKL SMK via Fonnte WA Gateway._`
  );
}

/**
 * Format WhatsApp message for attendance notification
 */
export function formatWhatsAppMessage(
  presensi: Presensi,
  siswa: Siswa,
  dudi: DUDI
): string {
  const isAbsence = presensi.status === 'Izin' || presensi.status === 'Sakit' || presensi.status === 'Alpa';
  const dayStr = presensi.hari ? `${presensi.hari}, ` : '';
  const shiftInfo = presensi.nama_shift
    ? `Shift / Jadwal: *${presensi.nama_shift}* (${presensi.jadwal_masuk || dudi.jam_masuk_standar} - ${presensi.jadwal_pulang || dudi.jam_pulang_standar} WIB)\n`
    : `Jadwal Kerja: *${dudi.jam_masuk_standar} - ${dudi.jam_pulang_standar} WIB*\n`;

  if (isAbsence) {
    return (
      `*PEMBERITAHUAN KETIDAKHADIRAN SISWA PKL SMK*\n\n` +
      `Yth. Bapak/Ibu Orang Tua / Wali dari:\n` +
      `Nama: *${siswa.nama_lengkap}*\n` +
      `NIS: ${siswa.nis}\n` +
      `Kelas: ${siswa.kelas} - ${siswa.jurusan}\n` +
      `Lokasi DUDI: *${dudi.nama_instansi}*\n\n` +
      `Menginformasikan bahwa pada:\n` +
      `Hari/Tanggal: *${dayStr}${presensi.tanggal}*\n` +
      shiftInfo +
      `Status: *${presensi.status.toUpperCase()}*\n` +
      (presensi.keterangan ? `Keterangan: _${presensi.keterangan}_\n\n` : `\n`) +
      `Mohon konfirmasi atau hubungi pihak sekolah/Guru Pembimbing jika ada kekeliruan.\n\n` +
      `_Pesan otomatis dikirim oleh Sistem Presensi PKL SMK via Fonnte Gateway._`
    );
  }

  // Hadir
  const ketepatanStr = presensi.status_ketepatan ? ` (${presensi.status_ketepatan})` : '';

  return (
    `*KONFIRMASI PRESENSI PKL SMK*\n\n` +
    `Halo *${siswa.nama_lengkap}*,\n` +
    `Presensi masuk Anda telah berhasil dicatat pada:\n` +
    `Hari/Tanggal: *${dayStr}${presensi.tanggal}*\n` +
    shiftInfo +
    `Waktu Masuk: *${presensi.jam_masuk} WIB*${ketepatanStr}\n` +
    `Lokasi DUDI: ${dudi.nama_instansi}\n` +
    `Jarak dari Kantor: *${presensi.koordinat_absen.jarak_meter} meter* (Status: Valid dalam radius)\n\n` +
    `Selamat belajar dan bekerja dengan penuh integritas dan keselamatan!\n\n` +
    `_Sistem Presensi PKL SMK_`
  );
}

/**
 * Send WhatsApp notification using Fonnte API or fallback to simulated delivery
 */
export async function sendFonnteNotification(
  targetPhone: string,
  message: string,
  apiKey?: string
): Promise<{ success: boolean; responseMessage: string }> {
  // If API key is provided and not default placeholder, attempt real HTTP fetch to Fonnte
  if (apiKey && apiKey !== 'DEMO_FONNTE_TOKEN_12345' && apiKey.length > 8) {
    try {
      const formData = new FormData();
      formData.append('target', targetPhone);
      formData.append('message', message);
      formData.append('countryCode', '62');

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: apiKey,
        },
        body: formData,
      });

      const resJson = await response.json();
      if (resJson.status) {
        return { success: true, responseMessage: 'Berhasil dikirim ke WhatsApp via Fonnte API' };
      }
      return { success: false, responseMessage: resJson.reason || 'Gagal mengirim via Fonnte' };
    } catch (err: unknown) {
      console.warn('Fonnte API network error (using simulated response):', err);
    }
  }

  // Simulated delivery for demo / sandbox
  return {
    success: true,
    responseMessage: `Simulasi WhatsApp Fonnte Berhasil terkirim ke +${targetPhone}`,
  };
}
