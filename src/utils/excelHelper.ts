import * as XLSX from 'xlsx';
import { Siswa, DUDI, GuruPembimbing, ShiftKerja, TipeJadwalKerja } from '../types';

// Helper to sanitize / clean strings
const cleanStr = (val: any): string => {
  if (val === undefined || val === null) return '';
  return String(val).trim();
};

// ==========================================
// EXPORT & TEMPLATE GENERATORS
// ==========================================

export const exportSiswaToExcel = (siswaList: Siswa[], dudiList: DUDI[], guruList: GuruPembimbing[], fileType: 'xlsx' | 'csv' = 'xlsx') => {
  const dudiMap = new Map(dudiList.map((d) => [d.id_dudi, d.nama_instansi]));
  const guruMap = new Map(guruList.map((g) => [g.id_guru, g.nama_guru]));

  const data = siswaList.map((s, idx) => ({
    'No': idx + 1,
    'ID Siswa': s.id_siswa,
    'Nama Lengkap': s.nama_lengkap,
    'NIS': s.nis,
    'Kelas': s.kelas,
    'Jurusan': s.jurusan,
    'Tempat PKL (DUDI)': dudiMap.get(s.id_dudi) || s.id_dudi,
    'ID DUDI': s.id_dudi,
    'Guru Pembimbing': guruMap.get(s.id_guru_pembimbing) || s.id_guru_pembimbing,
    'ID Guru': s.id_guru_pembimbing,
    'Nomor WA Siswa': s.nomor_wa,
    'Nomor WA Orang Tua': s.nomor_wa_ortu,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');

  const fileName = `Data_Siswa_PKL_${new Date().toISOString().slice(0, 10)}.${fileType}`;
  XLSX.writeFile(workbook, fileName, { bookType: fileType });
};

export const downloadSiswaTemplate = (dudiList: DUDI[], guruList: GuruPembimbing[], fileType: 'xlsx' | 'csv' = 'xlsx') => {
  const sampleDudi = dudiList[0]?.nama_instansi || 'PT Telkom Indonesia';
  const sampleGuru = guruList[0]?.nama_guru || 'Drs. Budi Santoso, M.Kom';

  const templateData = [
    {
      'Nama Lengkap': 'Ahmad Fauzi',
      'NIS': '20241001',
      'Kelas': 'XII RPL 1',
      'Jurusan': 'Rekayasa Perangkat Lunak',
      'Tempat PKL / DUDI': sampleDudi,
      'Guru Pembimbing': sampleGuru,
      'Nomor WA Siswa': '081234567890',
      'Nomor WA Orang Tua': '081298765432',
    },
    {
      'Nama Lengkap': 'Siti Nurhaliza',
      'NIS': '20241002',
      'Kelas': 'XII TKJ 2',
      'Jurusan': 'Teknik Komputer & Jaringan',
      'Tempat PKL / DUDI': dudiList[1]?.nama_instansi || sampleDudi,
      'Guru Pembimbing': guruList[1]?.nama_guru || sampleGuru,
      'Nomor WA Siswa': '082134567891',
      'Nomor WA Orang Tua': '082198765433',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Siswa');

  // Add reference sheet with valid DUDI & Guru names if XLSX
  if (fileType === 'xlsx') {
    const refData = [
      ...dudiList.map((d) => ({
        'Kategori': 'DUDI / Instansi',
        'ID': d.id_dudi,
        'Nama': d.nama_instansi,
        'Keterangan': d.bidang,
      })),
      ...guruList.map((g) => ({
        'Kategori': 'Guru Pembimbing',
        'ID': g.id_guru,
        'Nama': g.nama_guru,
        'Keterangan': `Siswa: ${g.siswa_bimbingan || '-'} | Jadwal: ${g.jadwal_kunjungan || '-'}`,
      })),
    ];
    if (refData.length > 0) {
      const refSheet = XLSX.utils.json_to_sheet(refData);
      XLSX.utils.book_append_sheet(workbook, refSheet, 'Referensi DUDI & Guru');
    }
  }

  const fileName = `Template_Import_Siswa.${fileType}`;
  XLSX.writeFile(workbook, fileName, { bookType: fileType });
};

export const exportDUDIToExcel = (dudiList: DUDI[], fileType: 'xlsx' | 'csv' = 'xlsx') => {
  const data = dudiList.map((d, idx) => {
    const shiftSummary = d.daftar_shift && d.daftar_shift.length > 0
      ? d.daftar_shift.map((s) => `${s.nama_shift}: ${s.jam_masuk}-${s.jam_pulang}`).join(' | ')
      : `${d.jam_masuk_standar}-${d.jam_pulang_standar}`;

    return {
      'No': idx + 1,
      'ID DUDI': d.id_dudi,
      'Nama Instansi': d.nama_instansi,
      'Bidang Usaha': d.bidang,
      'Nama Pembimbing / PIC': d.nama_pembimbing || '-',
      'No HP / WA Pembimbing': d.nomor_wa_pembimbing || '-',
      'Alamat': d.alamat,
      'Latitude': d.koordinat_lokasi.latitude,
      'Longitude': d.koordinat_lokasi.longitude,
      'Radius (Meter)': d.radius_meter,
      'Hari Kerja': d.hari_kerja ? d.hari_kerja.join(', ') : 'Senin, Selasa, Rabu, Kamis, Jumat',
      'Sistem Jadwal': d.tipe_jadwal || 'Reguler',
      'Jam Masuk Standar': d.jam_masuk_standar,
      'Jam Pulang Standar': d.jam_pulang_standar,
      'Rincian Shift': shiftSummary,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data DUDI');

  const fileName = `Data_DUDI_Mitra_${new Date().toISOString().slice(0, 10)}.${fileType}`;
  XLSX.writeFile(workbook, fileName, { bookType: fileType });
};

export const downloadDUDITemplate = (fileType: 'xlsx' | 'csv' = 'xlsx') => {
  const templateData = [
    {
      'Nama Instansi': 'PT Astra Honda Motor Service',
      'Bidang Usaha': 'Teknik Otomotif & Kendaraan Ringan',
      'Nama Pembimbing / PIC': 'Hendra Wijaya, S.T.',
      'No HP / WA Pembimbing': '081399887766',
      'Alamat': 'Jl. Ahmad Yani No. 88, Surabaya',
      'Latitude': -7.312543,
      'Longitude': 112.734211,
      'Radius Meter': 150,
      'Hari Kerja': 'Senin, Selasa, Rabu, Kamis, Jumat, Sabtu',
      'Sistem Jadwal': 'Reguler',
      'Jam Masuk': '08:00',
      'Jam Pulang': '17:00',
      'Rincian Shift (Opsional)': 'Pagi: 08:00-17:00',
    },
    {
      'Nama Instansi': 'PT Media Nusantara Citra (Studio)',
      'Bidang Usaha': 'Multimedia & Penyiaran Digital',
      'Nama Pembimbing / PIC': 'Bambang Irawan, M.Kom',
      'No HP / WA Pembimbing': '081399887767',
      'Alamat': 'Jl. Raya Darmo Permai III, Surabaya',
      'Latitude': -7.289123,
      'Longitude': 112.698342,
      'Radius Meter': 200,
      'Hari Kerja': 'Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu',
      'Sistem Jadwal': 'Shift',
      'Jam Masuk': '07:00',
      'Jam Pulang': '15:00',
      'Rincian Shift (Opsional)': 'Shift 1 Pagi: 07:00-15:00 | Shift 2 Siang: 15:00-23:00',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template DUDI');

  const fileName = `Template_Import_DUDI.${fileType}`;
  XLSX.writeFile(workbook, fileName, { bookType: fileType });
};

export const exportGuruToExcel = (guruList: GuruPembimbing[], fileType: 'xlsx' | 'csv' = 'xlsx') => {
  const data = guruList.map((g, idx) => ({
    'No': idx + 1,
    'ID Guru': g.id_guru,
    'Nama Lengkap': g.nama_guru,
    'Nama Siswa yang Dibimbing': g.siswa_bimbingan || '-',
    'Nomor WhatsApp': g.nomor_wa,
    'Jadwal Kunjungan ke Tempat DUDI': g.jadwal_kunjungan || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');

  const fileName = `Data_Guru_Pembimbing_${new Date().toISOString().slice(0, 10)}.${fileType}`;
  XLSX.writeFile(workbook, fileName, { bookType: fileType });
};

export const downloadGuruTemplate = (fileType: 'xlsx' | 'csv' = 'xlsx') => {
  const templateData = [
    {
      'Nama Lengkap': 'Drs. H. Bambang Sudarsono, M.Pd',
      'Nama Siswa yang Dibimbing': 'Ahmad Fauzi (XII RPL 1), Siti Nurhaliza (XII RPL 1)',
      'Nomor WhatsApp': '081234567801',
      'Jadwal Kunjungan ke Tempat DUDI': 'Setiap Selasa & Kamis (Pkl 10:00 WIB)',
    },
    {
      'Nama Lengkap': 'Endang Sri Wahyuni, S.Kom',
      'Nama Siswa yang Dibimbing': 'Rizky Pratama (XII TKJ 2), Doni Saputra (XII TKJ 2)',
      'Nomor WhatsApp': '081234567802',
      'Jadwal Kunjungan ke Tempat DUDI': 'Setiap Rabu & Jumat (Pkl 13:30 WIB)',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Guru');

  const fileName = `Template_Import_Guru.${fileType}`;
  XLSX.writeFile(workbook, fileName, { bookType: fileType });
};

// ==========================================
// FILE PARSER & DATA NORMALIZERS
// ==========================================

export interface ParseResult<T> {
  success: boolean;
  totalRows: number;
  validRows: T[];
  errors: string[];
}

export const readUploadedFileToJSON = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          resolve([]);
          return;
        }
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          resolve([]);
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(rawJson);
      } catch (err: any) {
        reject(new Error(err?.message || 'Gagal membaca file Excel/CSV'));
      }
    };

    reader.onerror = () => reject(new Error('Terjadi kesalahan saat membaca file'));
    reader.readAsArrayBuffer(file);
  });
};

// Parser for Siswa
export const parseSiswaImport = (
  rawRows: any[],
  existingSiswa: Siswa[],
  dudiList: DUDI[],
  guruList: GuruPembimbing[]
): ParseResult<Siswa> => {
  const validRows: Siswa[] = [];
  const errors: string[] = [];

  const dudiByName = new Map<string, string>();
  dudiList.forEach((d) => {
    dudiByName.set(d.nama_instansi.toLowerCase().trim(), d.id_dudi);
    dudiByName.set(d.id_dudi.toLowerCase().trim(), d.id_dudi);
  });

  const guruByName = new Map<string, string>();
  guruList.forEach((g) => {
    guruByName.set(g.nama_guru.toLowerCase().trim(), g.id_guru);
    guruByName.set(g.id_guru.toLowerCase().trim(), g.id_guru);
    if (g.nip) guruByName.set(g.nip.toLowerCase().trim(), g.id_guru);
  });

  let nextSiswaNum = existingSiswa.length + 1;

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1

    // Flexible column lookup (case insensitive / Indonesian variants)
    const getCol = (...keys: string[]) => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            const val = row[rowKey];
            if (val !== undefined && val !== null) return cleanStr(val);
          }
        }
      }
      return '';
    };

    const nama = getCol('Nama Lengkap', 'Nama', 'Nama Siswa');
    const nis = getCol('NIS', 'Nomor Induk Siswa', 'No Induk');
    const kelas = getCol('Kelas');
    const jurusan = getCol('Jurusan', 'Program Keahlian');
    const dudiRaw = getCol('Tempat PKL (DUDI)', 'Tempat PKL', 'DUDI', 'ID DUDI', 'Instansi');
    const guruRaw = getCol('Guru Pembimbing', 'Guru', 'ID Guru', 'NIP Guru');
    const nomorWa = getCol('Nomor WA Siswa', 'Nomor WA', 'No HP', 'No WhatsApp', 'Telepon');
    const nomorWaOrtu = getCol('Nomor WA Orang Tua', 'WA Orang Tua', 'No WA Ortu', 'No HP Ortu');
    const idSiswaExplicit = getCol('ID Siswa', 'ID');

    if (!nama) {
      errors.push(`Baris ${rowNum}: Kolom 'Nama Lengkap' wajib diisi.`);
      return;
    }

    // Resolve DUDI
    let idDudi = dudiList[0]?.id_dudi || 'DUD-001';
    if (dudiRaw) {
      const matched = dudiByName.get(dudiRaw.toLowerCase().trim());
      if (matched) {
        idDudi = matched;
      } else {
        // partial match
        const partialDudi = dudiList.find((d) => d.nama_instansi.toLowerCase().includes(dudiRaw.toLowerCase().trim()));
        if (partialDudi) idDudi = partialDudi.id_dudi;
      }
    }

    // Resolve Guru
    let idGuru = guruList[0]?.id_guru || 'GUR-001';
    if (guruRaw) {
      const matched = guruByName.get(guruRaw.toLowerCase().trim());
      if (matched) {
        idGuru = matched;
      } else {
        const partialGuru = guruList.find((g) => g.nama_guru.toLowerCase().includes(guruRaw.toLowerCase().trim()));
        if (partialGuru) idGuru = partialGuru.id_guru;
      }
    }

    const assignedIdSiswa = idSiswaExplicit || `SIS-${String(nextSiswaNum++).padStart(3, '0')}`;
    const assignedIdUser = `USR-${assignedIdSiswa}`;

    validRows.push({
      id_siswa: assignedIdSiswa,
      id_user: assignedIdUser,
      nama_lengkap: nama,
      nis: nis || `2024${String(1000 + nextSiswaNum)}`,
      kelas: kelas || 'XII RPL 1',
      jurusan: jurusan || 'Rekayasa Perangkat Lunak',
      id_dudi: idDudi,
      id_guru_pembimbing: idGuru,
      nomor_wa: nomorWa || '081234567890',
      nomor_wa_ortu: nomorWaOrtu || nomorWa || '081298765432',
    });
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
  };
};

// Parser for DUDI
export const parseDUDIImport = (rawRows: any[], existingDudi: DUDI[]): ParseResult<DUDI> => {
  const validRows: DUDI[] = [];
  const errors: string[] = [];

  let nextDudiNum = existingDudi.length + 1;

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;

    const getCol = (...keys: string[]) => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            const val = row[rowKey];
            if (val !== undefined && val !== null) return cleanStr(val);
          }
        }
      }
      return '';
    };

    const namaInstansi = getCol('Nama Instansi', 'Nama Perusahaan', 'Nama DUDI', 'Instansi');
    const bidang = getCol('Bidang Usaha', 'Bidang');
    const namaPembimbing = getCol('Nama Pembimbing / PIC', 'Nama Pembimbing', 'Pembimbing DUDI', 'Penanggung Jawab', 'PIC');
    const nomorWaPembimbing = getCol('No HP / WA Pembimbing', 'Nomor HP Pembimbing', 'No HP Pembimbing', 'WhatsApp Pembimbing', 'No WA Pembimbing', 'No HP', 'No WA', 'Telepon');
    const alamat = getCol('Alamat', 'Alamat Lengkap', 'Lokasi');
    const latRaw = getCol('Latitude', 'Lat');
    const lonRaw = getCol('Longitude', 'Lon', 'Long');
    const radiusRaw = getCol('Radius Meter', 'Radius (Meter)', 'Radius');
    const hariKerjaRaw = getCol('Hari Kerja', 'Hari');
    const tipeJadwalRaw = getCol('Sistem Jadwal', 'Tipe Jadwal', 'Jadwal');
    const jamMasuk = getCol('Jam Masuk', 'Jam Masuk Standar');
    const jamPulang = getCol('Jam Pulang', 'Jam Pulang Standar');
    const rincianShift = getCol('Rincian Shift', 'Rincian Shift (Opsional)', 'Shift');
    const idDudiExplicit = getCol('ID DUDI', 'ID');

    if (!namaInstansi) {
      errors.push(`Baris ${rowNum}: Kolom 'Nama Instansi' wajib diisi.`);
      return;
    }

    const assignedIdDudi = idDudiExplicit || `DUD-${String(nextDudiNum++).padStart(3, '0')}`;

    // Lat & Lon fallback to Surabaya central if invalid or empty
    const lat = parseFloat(latRaw) || -7.3055;
    const lon = parseFloat(lonRaw) || 112.7378;
    const radius = parseInt(radiusRaw, 10) || 150;

    // Parse hari kerja
    let hariKerja = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
    if (hariKerjaRaw) {
      if (hariKerjaRaw.toLowerCase().includes('semua')) {
        hariKerja = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      } else if (hariKerjaRaw.toLowerCase().includes('sabtu')) {
        hariKerja = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      } else {
        const split = hariKerjaRaw.split(/[,;\/|]+/).map((s) => s.trim()).filter(Boolean);
        if (split.length > 0) hariKerja = split;
      }
    }

    // Parse tipe jadwal
    let tipeJadwal: TipeJadwalKerja = 'Reguler';
    if (tipeJadwalRaw.toLowerCase().includes('shift')) {
      tipeJadwal = 'Shift';
    } else if (tipeJadwalRaw.toLowerCase().includes('kondisi')) {
      tipeJadwal = 'Kondisional';
    }

    const finalJamMasuk = jamMasuk || '08:00';
    const finalJamPulang = jamPulang || '17:00';

    // Parse shift or create default shift
    const shifts: ShiftKerja[] = [];
    if (rincianShift && rincianShift.includes(':')) {
      // e.g. "Shift 1 Pagi: 07:00-15:00 | Shift 2 Siang: 15:00-23:00"
      const shiftParts = rincianShift.split(/\||;/);
      shiftParts.forEach((part, sIdx) => {
        const [shiftName, hours] = part.split(':');
        if (shiftName && hours) {
          const [inH, outH] = hours.split('-');
          shifts.push({
            id_shift: `SHF-${assignedIdDudi}-${sIdx + 1}`,
            nama_shift: shiftName.trim(),
            jam_masuk: inH ? inH.trim() : finalJamMasuk,
            jam_pulang: outH ? outH.trim() : finalJamPulang,
            toleransi_keterlambatan_menit: 15,
          });
        }
      });
    }

    if (shifts.length === 0) {
      shifts.push({
        id_shift: `SHF-${assignedIdDudi}-01`,
        nama_shift: tipeJadwal === 'Shift' ? 'Shift 1' : 'Jam Kerja Standar',
        jam_masuk: finalJamMasuk,
        jam_pulang: finalJamPulang,
        toleransi_keterlambatan_menit: 15,
      });
    }

    validRows.push({
      id_dudi: assignedIdDudi,
      nama_instansi: namaInstansi,
      bidang: bidang || 'Teknologi & Industri',
      nama_pembimbing: namaPembimbing || undefined,
      nomor_wa_pembimbing: nomorWaPembimbing || undefined,
      alamat: alamat || 'Surabaya, Jawa Timur',
      koordinat_lokasi: { latitude: lat, longitude: lon },
      radius_meter: radius,
      hari_kerja: hariKerja,
      tipe_jadwal: tipeJadwal,
      jam_masuk_standar: finalJamMasuk,
      jam_pulang_standar: finalJamPulang,
      daftar_shift: shifts,
    });
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
  };
};

// Parser for Guru Pembimbing
export const parseGuruImport = (rawRows: any[], existingGuru: GuruPembimbing[]): ParseResult<GuruPembimbing> => {
  const validRows: GuruPembimbing[] = [];
  const errors: string[] = [];

  let nextGuruNum = existingGuru.length + 1;

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;

    const getCol = (...keys: string[]) => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            const val = row[rowKey];
            if (val !== undefined && val !== null) return cleanStr(val);
          }
        }
      }
      return '';
    };

    const namaGuru = getCol('Nama Lengkap', 'Nama Guru', 'Nama');
    const siswaBimbingan = getCol(
      'Nama Siswa yang Dibimbing',
      'Siswa yang Dibimbing',
      'Siswa Bimbingan',
      'Nama Siswa',
      'Siswa',
      'NIP'
    );
    const nomorWa = getCol('Nomor WhatsApp', 'Nomor WA', 'No HP', 'No WhatsApp', 'Telepon');
    const jadwalKunjungan = getCol(
      'Jadwal Kunjungan ke Tempat DUDI',
      'Jadwal Kunjungan DUDI',
      'Jadwal Kunjungan',
      'Jadwal Supervisi',
      'Jadwal',
      'Kunjungan',
      'Email'
    );
    const idGuruExplicit = getCol('ID Guru', 'ID');

    if (!namaGuru) {
      errors.push(`Baris ${rowNum}: Kolom 'Nama Lengkap' wajib diisi.`);
      return;
    }

    const assignedIdGuru = idGuruExplicit || `GUR-${String(nextGuruNum++).padStart(3, '0')}`;
    const assignedIdUser = `USR-${assignedIdGuru}`;

    validRows.push({
      id_guru: assignedIdGuru,
      id_user: assignedIdUser,
      nama_guru: namaGuru,
      siswa_bimbingan: siswaBimbingan || 'Belum ada siswa',
      nip: `198001012005011${String(nextGuruNum).padStart(3, '0')}`,
      nomor_wa: nomorWa || '081234567800',
      jadwal_kunjungan: jadwalKunjungan || 'Setiap Selasa & Kamis (Pkl 10:00 WIB)',
      email: `${namaGuru.toLowerCase().replace(/[^a-z0-9]/g, '')}@sekolah.sch.id`,
    });
  });

  return {
    success: validRows.length > 0,
    totalRows: rawRows.length,
    validRows,
    errors,
  };
};
