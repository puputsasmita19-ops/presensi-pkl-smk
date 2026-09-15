import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { FonnteConfig } from '../types';
import { sendFonnteNotification } from '../utils/fonnte';

interface WhatsAppFonnteModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FonnteConfig;
  onSaveConfig: (cfg: FonnteConfig) => void;
}

export const WhatsAppFonnteModal: React.FC<WhatsAppFonnteModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [senderPhone, setSenderPhone] = useState(config.senderPhone);
  const [autoNotifyParent, setAutoNotifyParent] = useState(config.autoNotifyParentOnAbsence);
  const [autoNotifyCheckIn, setAutoNotifyCheckIn] = useState(config.autoNotifyOnCheckIn);
  const [autoNotifyDudiJournal, setAutoNotifyDudiJournal] = useState(
    config.autoNotifyDudiOnNewJournal !== false
  );

  // Test send state
  const [testPhone, setTestPhone] = useState('081399887766');
  const [testMessage, setTestMessage] = useState(
    '*UJI COBA NOTIFIKASI JURNAL KE PEMBIMBING DUDI*\n\nSiswa magang Reza Pratama baru saja mengunggah laporan logbook harian baru dan menunggu validasi.'
  );
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      apiKey,
      senderPhone,
      autoNotifyParentOnAbsence: autoNotifyParent,
      autoNotifyOnCheckIn: autoNotifyCheckIn,
      autoNotifyDudiOnNewJournal: autoNotifyDudiJournal,
    });
    alert('Konfigurasi integrasi Fonnte WhatsApp berhasil disimpan!');
    onClose();
  };

  const handleTestSend = async () => {
    if (!testPhone || !testMessage) return;
    setIsSending(true);
    setSendResult(null);

    const res = await sendFonnteNotification(testPhone, testMessage, apiKey);
    setIsSending(false);
    setSendResult({
      success: res.success,
      msg: res.responseMessage,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Integrasi WhatsApp API (Fonnte)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Kirim notifikasi otomatis ketidakhadiran & izin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {/* Info banner */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl space-y-1 text-emerald-950 dark:text-emerald-200">
            <p className="font-semibold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Notifikasi Otomatis Orang Tua & Guru
            </p>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
              Sistem akan memanggil endpoint <code>https://api.fonnte.com/send</code> saat siswa mengajukan status Izin/Sakit/Alpa atau konfirmasi absensi.
            </p>
          </div>

          {/* Config form */}
          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Fonnte API Token (Bearer Token):
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Misal: abcd1234efgh..."
                className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                Dapatkan token di dashboard resmi <strong>fonnte.com</strong>
              </span>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNotifyParent}
                  onChange={(e) => setAutoNotifyParent(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Kirim notifikasi otomatis ke nomor WA Wali/Orang Tua saat siswa Izin/Sakit/Alpa
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNotifyCheckIn}
                  onChange={(e) => setAutoNotifyCheckIn(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Kirim konfirmasi WhatsApp ke Siswa saat berhasil Absen Masuk
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoNotifyDudiJournal}
                  onChange={(e) => setAutoNotifyDudiJournal(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium text-emerald-700 dark:text-emerald-400 font-semibold">
                  Kirim notifikasi otomatis ke Pembimbing DUDI saat Siswa Mengisi Jurnal Baru (Menunggu Validasi)
                </span>
              </label>
            </div>
          </div>

          {/* Test Sender Sandbox */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Uji Coba Pengiriman Pesan WhatsApp:
            </h4>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Nomor Tujuan (Contoh: 0812xxxx atau 62812xxxx):
              </label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                Format Pesan WhatsApp:
              </label>
              <textarea
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-lg font-mono text-[11px] focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleTestSend}
              disabled={isSending}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Mengirim...' : 'Kirim Uji Coba Sekarang'}</span>
            </button>

            {sendResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                  sendResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
                }`}
              >
                {sendResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug">{sendResult.msg}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white font-bold cursor-pointer transition shadow-xs"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
