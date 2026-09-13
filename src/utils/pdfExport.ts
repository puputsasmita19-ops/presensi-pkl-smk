import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Presensi, Siswa, DUDI, GuruPembimbing } from '../types';

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
  schoolName = 'SMK NEGERI 1 INFORMATIKA & TEKNOLOGI',
}: ExportPDFParams) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
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

  const targetDUDI = targetSiswa
    ? dudiList.find((d) => d.id_dudi === targetSiswa.id_dudi)
    : null;

  const targetGuru = targetSiswa
    ? guruList.find((g) => g.id_guru === targetSiswa.id_guru_pembimbing)
    : null;

  // Header / Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(schoolName, 105, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(
    'Jl. Pendidikan Vokasi No. 45, Kota Surabaya, Jawa Timur | Telp: (031) 8291000 | Website: smknegeri.sch.id',
    105,
    24,
    { align: 'center' }
  );

  // Line separator
  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.setLineWidth(0.8);
  doc.line(14, 28, 196, 28);
  doc.setLineWidth(0.2);
  doc.line(14, 29.2, 196, 29.2);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Dark slate
  doc.text('LAPORAN PRESENSI PRAKTIK KERJA LAPANGAN (PKL)', 105, 38, { align: 'center' });

  // Period
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
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

  doc.text(`${periodText} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 105, 43, {
    align: 'center',
  });

  // Metadata block
  let currentY = 50;
  if (targetSiswa) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, 182, 22, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 182, 22, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`Nama Siswa : ${targetSiswa.nama_lengkap}`, 18, currentY + 6);
    doc.text(`NIS / Kelas : ${targetSiswa.nis} / ${targetSiswa.kelas}`, 18, currentY + 12);
    doc.text(`Jurusan       : ${targetSiswa.jurusan}`, 18, currentY + 18);

    doc.text(`Tempat PKL / DUDI : ${targetDUDI?.nama_instansi || '-'}`, 110, currentY + 6);
    doc.text(`Sistem Kerja / Hari : ${targetDUDI?.tipe_jadwal || 'Reguler'} (${targetDUDI?.hari_kerja?.slice(0, 3).join(', ') || 'Senin-Jumat'}...)`, 110, currentY + 12);
    doc.text(`Guru Pembimbing    : ${targetGuru?.nama_guru || '-'}`, 110, currentY + 18);

    currentY += 28;
  } else {
    currentY += 4;
  }

  // Summary statistics
  const totalHadir = filtered.filter((p) => p.status === 'Hadir').length;
  const totalSakit = filtered.filter((p) => p.status === 'Sakit').length;
  const totalIzin = filtered.filter((p) => p.status === 'Izin').length;
  const totalAlpa = filtered.filter((p) => p.status === 'Alpa').length;
  const totalTepat = filtered.filter((p) => p.status_ketepatan === 'Tepat Waktu').length;
  const totalTerlambat = filtered.filter((p) => p.status_ketepatan === 'Terlambat').length;
  const totalHari = filtered.length;

  // Prepare table data
  const tableRows = filtered.map((item, index) => {
    const s = siswaList.find((x) => x.id_siswa === item.id_siswa);
    const d = s ? dudiList.find((x) => x.id_dudi === s.id_dudi) : null;
    const hariTgl = item.hari ? `${item.hari}\n${item.tanggal}` : item.tanggal;
    const shiftInfo = item.nama_shift ? `${d?.nama_instansi || '-'}\n[${item.nama_shift}]` : (d?.nama_instansi || '-');
    const masukInfo = item.jadwal_masuk ? `${item.jam_masuk}\n(${item.jadwal_masuk})` : (item.jam_masuk || '-');
    const statusInfo = item.status_ketepatan && item.status === 'Hadir' ? `${item.status}\n(${item.status_ketepatan})` : item.status;

    return [
      String(index + 1),
      hariTgl,
      s?.nama_lengkap || item.id_siswa,
      shiftInfo,
      masukInfo,
      item.jam_pulang || '-',
      statusInfo,
      item.koordinat_absen?.jarak_meter !== undefined ? `${item.koordinat_absen.jarak_meter}m` : '-',
      item.keterangan || (item.koordinat_absen?.dalam_radius ? 'Valid Geofence' : 'Sesuai Prosedur'),
    ];
  });

  // Render Table
  autoTable(doc, {
    startY: currentY,
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
    body: tableRows.length > 0 ? tableRows : [['-', '-', 'Tidak ada data presensi', '-', '-', '-', '-', '-', '-']],
    styles: {
      fontSize: 8,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 41, 59], // Dark Slate
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 23 },
      2: { cellWidth: 28 },
      3: { cellWidth: 34 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'center', cellWidth: 21 },
      7: { halign: 'center', cellWidth: 14 },
      8: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Calculate final Y position after table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;

  // Summary box
  let summaryY = finalY + 8;
  if (summaryY > 230) {
    doc.addPage();
    summaryY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Rekapitulasi: Total ${totalHari} Hari | Hadir: ${totalHadir} (${totalTepat} Tepat, ${totalTerlambat} Terlambat) | Sakit: ${totalSakit} | Izin: ${totalIzin} | Alpa: ${totalAlpa}`,
    14,
    summaryY
  );

  // Signatures Section
  const signY = summaryY + 18;
  if (signY + 45 > 285) {
    doc.addPage();
  }

  const effectiveSignY = signY + 45 > 285 ? 25 : signY;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  // Left Signature (Pembimbing DUDI)
  doc.text('Mengetahui,', 25, effectiveSignY);
  doc.text('Pembimbing Industri / DUDI', 25, effectiveSignY + 5);
  doc.text('( ................................................ )', 25, effectiveSignY + 30);
  doc.text('Tanda Tangan & Cap DUDI', 25, effectiveSignY + 35);

  // Right Signature (Guru Pembimbing SMK)
  doc.text(`Surabaya, ${new Date().toLocaleDateString('id-ID')}`, 135, effectiveSignY);
  doc.text('Guru Pembimbing PKL,', 135, effectiveSignY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(targetGuru ? targetGuru.nama_guru : 'Dewi Lestari, M.Pd', 135, effectiveSignY + 30);
  doc.setFont('helvetica', 'normal');
  const guruSubText = targetGuru?.nip
    ? `NIP. ${targetGuru.nip}`
    : targetGuru?.jadwal_kunjungan
    ? `Monitoring: ${targetGuru.jadwal_kunjungan}`
    : `ID: ${targetGuru?.id_guru || 'GUR-001'}`;
  doc.text(guruSubText, 135, effectiveSignY + 35);

  // Save / Download PDF
  const filename = targetSiswa
    ? `Laporan_PKL_${targetSiswa.nama_lengkap.replace(/\s+/g, '_')}_${selectedMonth}.pdf`
    : `Laporan_Presensi_PKL_Semua_Siswa_${selectedMonth}.pdf`;

  doc.save(filename);
}
