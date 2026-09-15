import { KopSuratConfig, PaperSize } from '../types';

export const STORAGE_KEY_KOP = 'pkl_kop_surat_config';
export const STORAGE_KEY_PAPER = 'pkl_print_paper_size';

export const DEFAULT_KOP_CONFIG: KopSuratConfig = {
  instansiInduk: 'PEMERINTAH PROVINSI JAWA TIMUR | DINAS PENDIDIKAN',
  namaSekolah: 'SMK NEGERI 1 INFORMATIKA & TEKNOLOGI',
  subJudul: 'BIDANG KEAHLIAN TEKNOLOGI INFORMASI & KOMUNIKASI',
  alamat: 'Jl. Pendidikan Vokasi No. 45, Surabaya 60237',
  kontak: 'Telp: (031) 8291000 | Email: pkl@smknegeri1.sch.id | Web: smkn1sby.sch.id',
  nomorSurat: '421.5/PKL-PRES/2026',
  logoKiri: '',
  logoKanan: '',
  showLogoKiri: true,
  showLogoKanan: true,
  tampilkanGarisGanda: true,
  namaKepalaSekolah: 'Drs. H. Mulyono, M.Pd',
  nipKepalaSekolah: 'NIP. 19710515 199802 1 004',
  namaPembimbingDudi: 'Hendra Wijaya, S.T.',
  nipPembimbingDudi: 'NIK. 3578011204850003',
  kotaSurat: 'Surabaya',
};

export function getSavedKopConfig(): KopSuratConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_KOP);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate legacy keys if present
      if (!parsed.namaPembimbingDudi && parsed.namaKoordinatorHubin) {
        parsed.namaPembimbingDudi = parsed.namaKoordinatorHubin;
      }
      if (!parsed.nipPembimbingDudi && parsed.nipKoordinatorHubin) {
        parsed.nipPembimbingDudi = parsed.nipKoordinatorHubin;
      }
      return { ...DEFAULT_KOP_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load kop config:', e);
  }
  return DEFAULT_KOP_CONFIG;
}

export function saveKopConfig(config: KopSuratConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_KOP, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save kop config:', e);
  }
}

export function getSavedPaperSize(): PaperSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PAPER);
    if (saved === 'F4' || saved === 'A4') {
      return saved;
    }
  } catch (e) {
    console.error('Failed to load paper size:', e);
  }
  return 'A4';
}

export function savePaperSize(size: PaperSize): void {
  try {
    localStorage.setItem(STORAGE_KEY_PAPER, size);
  } catch (e) {
    console.error('Failed to save paper size:', e);
  }
}
