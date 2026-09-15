import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presensi, Siswa, DUDI, GuruPembimbing, Role, PaperSize, KopSuratConfig } from '../types';
import { DEFAULT_KOP_CONFIG } from '../data/defaultKop';

export interface ExportPDFParams {
  siswaList: Siswa[];
  presensiList: Presensi[];
  dudiList: DUDI[];
  guruList: GuruPembimbing[];
  selectedSiswaId?: string;
  selectedMonth?: string; // e.g. "2026-09"
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  schoolName?: string;
  userRole?: Role;
  userName?: string;
  paperSize?: PaperSize; // 'A4' | 'F4'
  kopConfig?: Partial<KopSuratConfig>;
}

export function exportPresensiToPDF({
  siswaList,
  presensiList,
  dudiList,
  guruList,
  selectedSiswaId,
  selectedMonth,
  startDate,
  endDate,
  searchQuery,
  schoolName,
  userRole = 'Admin',
  userName,
  paperSize = 'A4',
  kopConfig,
}: ExportPDFParams) {
  // Merge kop configuration
  const effectiveKop: KopSuratConfig = {
    ...DEFAULT_KOP_CONFIG,
    ...(schoolName ? { namaSekolah: schoolName } : {}),
    ...(kopConfig || {}),
  };

  const isF4 = paperSize === 'F4';
  const pageWidth = isF4 ? 215 : 210; // F4 = 215 x 330 mm, A4 = 210 x 297 mm
  const pageHeight = isF4 ? 330 : 297;
  const centerX = pageWidth / 2;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const rightX = pageWidth - marginX;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: isF4 ? [215, 330] : 'a4',
  });

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
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter((p) => {
      const s = siswaList.find((x) => x.id_siswa === p.id_siswa);
      const name = s?.nama_lengkap.toLowerCase() || '';
      const nis = s?.nis.toLowerCase() || '';
      const kelas = s?.kelas.toLowerCase() || '';
      return name.includes(q) || nis.includes(q) || kelas.includes(q);
    });
  }

  // Target Siswa info if single selected
  const targetSiswa =
    selectedSiswaId && selectedSiswaId !== 'ALL'
      ? siswaList.find((s) => s.id_siswa === selectedSiswaId)
      : null;

  let targetDUDI = targetSiswa
    ? dudiList.find((d) => d.id_dudi === targetSiswa.id_dudi) || null
    : null;

  if (!targetDUDI && userRole === 'DUDI' && userName) {
    targetDUDI =
      dudiList.find(
        (d) =>
          d.nama_pembimbing?.toLowerCase() === userName.toLowerCase() ||
          d.nama_instansi.toLowerCase().includes(userName.toLowerCase())
      ) || null;
  }

  if (!targetDUDI && filtered.length > 0) {
    const firstStudent = siswaList.find((s) => s.id_siswa === filtered[0]?.id_siswa);
    if (firstStudent) {
      targetDUDI = dudiList.find((d) => d.id_dudi === firstStudent.id_dudi) || null;
    }
  }

  if (!targetDUDI && dudiList.length > 0) {
    targetDUDI = dudiList[0];
  }

  let targetGuru = targetSiswa
    ? guruList.find((g) => g.id_guru === targetSiswa.id_guru_pembimbing) || null
    : null;

  if (!targetGuru && userRole === 'Guru Pembimbing' && userName) {
    targetGuru = guruList.find((g) => g.nama_guru.toLowerCase() === userName.toLowerCase()) || null;
  }

  if (!targetGuru && filtered.length > 0) {
    const firstStudent = siswaList.find((s) => s.id_siswa === filtered[0]?.id_siswa);
    if (firstStudent) {
      targetGuru = guruList.find((g) => g.id_guru === firstStudent.id_guru_pembimbing) || null;
    }
  }

  if (!targetGuru && guruList.length > 0) {
    targetGuru = guruList[0];
  }

  // Render Logos
  // Left Logo
  if (effectiveKop.showLogoKiri) {
    let logoDrawn = false;
    if (effectiveKop.logoKiri && effectiveKop.logoKiri.startsWith('data:image')) {
      try {
        doc.addImage(effectiveKop.logoKiri, 'PNG', marginX, 10, 16, 16);
        logoDrawn = true;
      } catch (err) {
        console.warn('Could not add custom left logo to PDF, falling back to seal:', err);
      }
    }
    if (!logoDrawn) {
      doc.setFillColor(241, 245, 249);
      doc.circle(marginX + 8, 18, 7.5, 'F');
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.35);
      doc.circle(marginX + 8, 18, 7.5, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text('SMK', marginX + 8, 20, { align: 'center' });
    }
  }

  // Right Logo
  if (effectiveKop.showLogoKanan) {
    const rightLogoX = rightX - 16;
    let logoDrawn = false;
    if (effectiveKop.logoKanan && effectiveKop.logoKanan.startsWith('data:image')) {
      try {
        doc.addImage(effectiveKop.logoKanan, 'PNG', rightLogoX, 10, 16, 16);
        logoDrawn = true;
      } catch (err) {
        console.warn('Could not add custom right logo to PDF, falling back to seal:', err);
      }
    }
    if (!logoDrawn) {
      doc.setFillColor(241, 245, 249);
      doc.circle(rightLogoX + 8, 18, 7.5, 'F');
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.35);
      doc.circle(rightLogoX + 8, 18, 7.5, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text('PKL', rightLogoX + 8, 20, { align: 'center' });
    }
  }

  // Header / Kop Surat Resmi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(effectiveKop.instansiInduk.toUpperCase(), centerX, 12, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(effectiveKop.namaSekolah.toUpperCase(), centerX, 17.5, { align: 'center' });

  let headerNextY = 21.5;
  if (effectiveKop.subJudul && effectiveKop.subJudul.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(effectiveKop.subJudul, centerX, headerNextY, { align: 'center' });
    headerNextY += 3.8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(effectiveKop.alamat, centerX, headerNextY, { align: 'center' });
  headerNextY += 3.5;
  doc.text(effectiveKop.kontak, centerX, headerNextY, { align: 'center' });
  headerNextY += 3.5;

  // Formal Kop Lines
  if (effectiveKop.tampilkanGarisGanda) {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(marginX, headerNextY, rightX, headerNextY);
    doc.setLineWidth(0.25);
    doc.line(marginX, headerNextY + 0.9, rightX, headerNextY + 0.9);
    headerNextY += 4.5;
  } else {
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(marginX, headerNextY, rightX, headerNextY);
    headerNextY += 4;
  }

  // Document Title based on Role & Context
  let docTitle = 'LAPORAN REKAPITULASI PRESENSI SISWA PKL';
  let docSubTitle = 'Tahun Pelajaran 2026/2027';

  if (targetSiswa) {
    docTitle = 'KARTU REKAPITULASI KEHADIRAN SISWA PKL';
    docSubTitle = `Siswa: ${targetSiswa.nama_lengkap} (${targetSiswa.nis})`;
  } else if (userRole === 'Guru Pembimbing') {
    docTitle = 'LAPORAN REKAPITULASI PRESENSI SISWA BIMBINGAN PKL';
    docSubTitle = `Guru Pembimbing: ${userName || 'Dewi Lestari, M.Pd'}`;
  } else if (userRole === 'Admin') {
    docTitle = 'LAPORAN REKAPITULASI PRESENSI SISWA PRAKTIK KERJA LAPANGAN (PKL)';
    docSubTitle = 'Dokumen Rekapitulasi Presensi Formal Terintegrasi Cloud & GPS Geofencing';
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, centerX, headerNextY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(docSubTitle, centerX, headerNextY + 8.5, { align: 'center' });

  // Period text
  const periodText =
    startDate && endDate
      ? `Rentang Tanggal: ${startDate} s.d. ${endDate}`
      : startDate
      ? `Mulai Tanggal: ${startDate}`
      : endDate
      ? `Sampai Tanggal: ${endDate}`
      : selectedMonth
      ? `Periode Bulan: ${selectedMonth}`
      : 'Semua Periode';

  doc.text(
    `Nomor: ${effectiveKop.nomorSurat} | ${periodText} | Kertas: ${paperSize} (${isF4 ? '215 x 330 mm' : '210 x 297 mm'})`,
    centerX,
    headerNextY + 12.5,
    { align: 'center' }
  );

  // Metadata block
  let currentY = headerNextY + 17;
  if (targetSiswa) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginX, currentY, contentWidth, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`Nama Siswa    : ${targetSiswa.nama_lengkap}`, marginX + 4, currentY + 6);
    doc.text(`NIS / Kelas    : ${targetSiswa.nis} / ${targetSiswa.kelas}`, marginX + 4, currentY + 12);
    doc.text(`Kompetensi : ${targetSiswa.jurusan}`, marginX + 4, currentY + 18);

    doc.text(`Tempat PKL / DUDI : ${targetDUDI?.nama_instansi || '-'}`, centerX + 3, currentY + 6);
    doc.text(
      `Sistem Jadwal / Jam : ${targetDUDI?.tipe_jadwal || 'Reguler'} (${targetDUDI?.jam_masuk_standar || '08:00'} - ${targetDUDI?.jam_pulang_standar || '17:00'})`,
      centerX + 3,
      currentY + 12
    );
    doc.text(`Guru Pembimbing    : ${targetGuru?.nama_guru || userName || '-'}`, centerX + 3, currentY + 18);

    currentY += 26;
  } else {
    // Summary info strip for Admin and Guru
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, currentY, contentWidth, 12, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, contentWidth, 12, 1.5, 1.5, 'S');

    const totalStudentsInRecords = new Set(filtered.map((p) => p.id_siswa)).size;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`Cakupan Data: Rekapitulasi Presensi Seluruh Siswa Terdaftar`, marginX + 4, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Jumlah Siswa: ${totalStudentsInRecords} Orang | Total Catatan: ${filtered.length} Hari Presensi | Status Validasi: Cloud Realtime Database`,
      marginX + 4,
      currentY + 9.5
    );

    currentY += 16;
  }

  // Summary statistics
  const totalHadir = filtered.filter((p) => p.status === 'Hadir').length;
  const totalSakit = filtered.filter((p) => p.status === 'Sakit').length;
  const totalIzin = filtered.filter((p) => p.status === 'Izin').length;
  const totalAlpa = filtered.filter((p) => p.status === 'Alpa').length;
  const totalTepat = filtered.filter((p) => p.status_ketepatan === 'Tepat Waktu').length;
  const totalTerlambat = filtered.filter((p) => p.status_ketepatan === 'Terlambat').length;
  const totalHari = filtered.length;
  const persentaseHadir = totalHari > 0 ? Math.round((totalHadir / totalHari) * 100) : 0;

  // Prepare table data
  const tableRows = filtered.map((item, index) => {
    const s = siswaList.find((x) => x.id_siswa === item.id_siswa);
    const d = s ? dudiList.find((x) => x.id_dudi === s.id_dudi) : null;
    const hariTgl = item.hari ? `${item.hari}\n${item.tanggal}` : item.tanggal;
    const shiftInfo = item.nama_shift ? `${d?.nama_instansi || '-'}\n[${item.nama_shift}]` : d?.nama_instansi || '-';
    const masukInfo = item.jadwal_masuk ? `${item.jam_masuk}\n(${item.jadwal_masuk})` : item.jam_masuk || '-';
    const statusInfo =
      item.status_ketepatan && item.status === 'Hadir'
        ? `${item.status}\n(${item.status_ketepatan})`
        : item.status;

    return [
      String(index + 1),
      hariTgl,
      s?.nama_lengkap || item.id_siswa,
      shiftInfo,
      masukInfo,
      item.jam_pulang || '-',
      statusInfo,
      item.koordinat_absen?.jarak_meter !== undefined ? `${item.koordinat_absen.jarak_meter}m` : '-',
      item.keterangan || (item.koordinat_absen?.dalam_radius ? 'Tervalidasi GPS' : 'Sesuai Prosedur'),
    ];
  });

  // Render Table
  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        'No',
        'Hari & Tgl',
        'Nama Siswa',
        'DUDI & Shift',
        'Jam Masuk',
        'Pulang',
        'Status',
        'Jarak',
        'Keterangan',
      ],
    ],
    body:
      tableRows.length > 0
        ? tableRows
        : [['-', '-', 'Tidak ada data presensi pada rentang filter ini', '-', '-', '-', '-', '-', '-']],
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [15, 23, 42], // Slate-900 formal
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 23 },
      2: { cellWidth: 32 },
      3: { cellWidth: 34 },
      4: { halign: 'center', cellWidth: 17 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 14 },
      8: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageNumber = data.pageNumber;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Sistem Presensi PKL ${effectiveKop.namaSekolah} | Halaman ${pageNumber} | Format Kertas: ${paperSize}`,
        centerX,
        pageHeight - 6.5,
        { align: 'center' }
      );
    },
  });

  // Calculate final Y position after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;

  // Summary box
  let summaryY = finalY + 6;
  if (summaryY > pageHeight - 65) {
    doc.addPage();
    summaryY = 20;
  }

  // Summary statistics box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginX, summaryY, contentWidth, 12, 1.5, 1.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, summaryY, contentWidth, 12, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Rekapitulasi Kehadiran: Total ${totalHari} Catatan | Hadir: ${totalHadir} (${totalTepat} Tepat Waktu, ${totalTerlambat} Terlambat) | Izin: ${totalIzin} | Sakit: ${totalSakit} | Alpa: ${totalAlpa}`,
    marginX + 4,
    summaryY + 5
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Tingkat Persentase Kehadiran Siswa: ${persentaseHadir}% | Status Rekapitulasi: Dokumen Resmi Terverifikasi Sistem`,
    marginX + 4,
    summaryY + 9.5
  );

  // Signatures Section (Atas: Pembimbing DUDI & Guru Pembimbing, Bawah Tengah: Kepala Sekolah)
  const signY = summaryY + 16;
  if (signY + 74 > pageHeight - 14) {
    doc.addPage();
  }

  const effectiveSignY = signY + 74 > pageHeight - 14 ? 24 : signY;

  // Horizontal centers
  const colLeftX = marginX + contentWidth * 0.22;
  const colRightX = pageWidth - marginX - contentWidth * 0.22;

  // Subtle separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, effectiveSignY - 4, rightX, effectiveSignY - 4);

  // Pembimbing DUDI Name and Identifier (diambil dari data DUDI terkait)
  const dudiSupervisorName =
    targetDUDI?.nama_pembimbing?.trim() ||
    effectiveKop.namaPembimbingDudi?.trim() ||
    'Pembimbing Industri / DUDI';

  const dudiSupervisorNipNik =
    effectiveKop.nipPembimbingDudi?.trim() ||
    (targetDUDI?.nomor_wa_pembimbing ? `Kontak: ${targetDUDI.nomor_wa_pembimbing}` : '');

  const dudiCompany = targetDUDI?.nama_instansi
    ? targetDUDI.nama_instansi.length > 30
      ? targetDUDI.nama_instansi.substring(0, 28) + '...'
      : targetDUDI.nama_instansi
    : 'Mitra DUDI';

  const schoolShort =
    effectiveKop.namaSekolah.length > 32
      ? effectiveKop.namaSekolah.substring(0, 30) + '...'
      : effectiveKop.namaSekolah;

  const guruName =
    userRole === 'Guru Pembimbing' && userName
      ? userName
      : targetGuru?.nama_guru || 'Dewi Lestari, M.Pd';

  const guruNip = targetGuru?.nip ? `NIP. ${targetGuru.nip}` : 'NIP. 19850312 201101 2 018';

  // --- 1. Baris Atas Kiri: Pembimbing Industri / DUDI (Menyetujui) ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Menyetujui,', colLeftX, effectiveSignY, { align: 'center' });
  doc.text('Pembimbing Industri / DUDI,', colLeftX, effectiveSignY + 4.5, { align: 'center' });
  doc.text(dudiCompany, colLeftX, effectiveSignY + 9, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(dudiSupervisorName, colLeftX, effectiveSignY + 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    dudiSupervisorNipNik ? dudiSupervisorNipNik : 'Tanda Tangan & Cap DUDI',
    colLeftX,
    effectiveSignY + 33,
    { align: 'center' }
  );

  // --- 2. Baris Atas Kanan: Guru Pembimbing PKL (Mengetahui) + Titimangsa ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${effectiveKop.kotaSurat}, ${new Date().toLocaleDateString('id-ID')}`, colRightX, effectiveSignY, { align: 'center' });
  doc.text('Mengetahui,', colRightX, effectiveSignY + 4.5, { align: 'center' });
  doc.text('Guru Pembimbing PKL,', colRightX, effectiveSignY + 9, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(guruName, colRightX, effectiveSignY + 28, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(guruNip, colRightX, effectiveSignY + 33, { align: 'center' });

  // --- 3. Baris Bawah Tengah: Kepala Sekolah (Mengesahkan) ---
  const signBottomY = effectiveSignY + 40;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Mengesahkan,', centerX, signBottomY, { align: 'center' });
  doc.text(`Kepala ${schoolShort},`, centerX, signBottomY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(effectiveKop.namaKepalaSekolah, centerX, signBottomY + 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    effectiveKop.nipKepalaSekolah
      ? effectiveKop.nipKepalaSekolah.startsWith('NIP')
        ? effectiveKop.nipKepalaSekolah
        : `NIP. ${effectiveKop.nipKepalaSekolah}`
      : '-',
    centerX,
    signBottomY + 29,
    { align: 'center' }
  );

  // Save / Download PDF
  const filename = targetSiswa
    ? `Laporan_PKL_${targetSiswa.nama_lengkap.replace(/\s+/g, '_')}_${paperSize}_${selectedMonth || '2026-09'}.pdf`
    : userRole === 'Guru Pembimbing'
    ? `Rekap_Presensi_Bimbingan_${(userName || 'Guru').replace(/\s+/g, '_')}_${paperSize}_${selectedMonth || '2026-09'}.pdf`
    : `Rekapitulasi_Presensi_PKL_${paperSize}_${selectedMonth || '2026-09'}.pdf`;

  doc.save(filename);
}
