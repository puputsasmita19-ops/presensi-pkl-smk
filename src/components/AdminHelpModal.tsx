import React, { useState } from 'react';
import { X, MessageCircle, Copy, Check, Phone, ShieldCheck, UserCheck } from 'lucide-react';
import { getAdminContactSettings } from '../utils/userManagement';

interface AdminHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminHelpModal: React.FC<AdminHelpModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const contact = getAdminContactSettings();

  if (!isOpen) return null;

  // Format Indonesian phone to international wa.me format
  const cleanPhone = contact.adminPhone.replace(/\D/g, '');
  const waNumber = cleanPhone.startsWith('0')
    ? '62' + cleanPhone.slice(1)
    : cleanPhone.startsWith('62')
    ? cleanPhone
    : '62' + cleanPhone;

  const encodedMsg = encodeURIComponent(
    contact.defaultMessage || 'Halo Admin, saya mengalami kendala login di sistem Presensi PKL.'
  );
  const waUrl = `https://wa.me/${waNumber}?text=${encodedMsg}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(contact.adminPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Hubungi Admin Presensi
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bantuan akun & lupa kata sandi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Jika Anda lupa kata sandi atau akun belum terdaftar, silakan hubungi Administrator PKL sekolah melalui kontak WhatsApp resmi di bawah ini:
          </p>

          {/* Admin Contact Card */}
          <div className="p-4 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-400 tracking-wider uppercase">
                  Koordinator / Admin Sekolah
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {contact.adminName}
                </h4>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Aktif
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-sky-200/60 dark:border-sky-900/40">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                <Phone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>{contact.adminPhone}</span>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1"
                title="Salin nomor WhatsApp"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Format Pesan yang Dianjurkan:</p>
            <p>1. Nama Lengkap</p>
            <p>2. NIS (Siswa) / NIP (Guru)</p>
            <p>3. Kelas / Jurusan / Tempat PKL</p>
            <p>4. Kendala yang dialami</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Kirim WhatsApp ke Admin</span>
          </a>
        </div>
      </div>
    </div>
  );
};
