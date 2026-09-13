import React, { useEffect, useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      alert('Aplikasi ini mendukung PWA. Buka menu peramban (ikon titik tiga) lalu pilih "Tambahkan ke Layar Utama" / "Install App".');
    }
  };

  if (isInstalled) {
    return (
      <span
        className="inline-flex items-center justify-center gap-1 h-8 sm:h-9 px-1.5 sm:px-2.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0"
        title="Aplikasi PWA telah terpasang di perangkat ini"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="hidden sm:inline">PWA Terpasang</span>
        <span className="sm:hidden font-bold">PWA</span>
      </span>
    );
  }

  return (
    <>
      <button
        id="btn-install-pwa"
        onClick={handleInstallClick}
        className="inline-flex items-center justify-center gap-1 h-8 sm:h-9 px-2 sm:px-2.5 text-[10px] sm:text-xs font-semibold rounded-lg bg-slate-800/90 hover:bg-slate-700 text-sky-400 hover:text-white transition-all shadow-xs border border-slate-700 active:scale-95 shrink-0 cursor-pointer"
        title="Pasang aplikasi di layar utama smartphone atau desktop (PWA)"
        aria-label="Pasang PWA"
      >
        {isIOS ? (
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        ) : (
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        )}
        <span className="hidden sm:inline">Pasang PWA</span>
        <span className="sm:hidden font-bold">PWA</span>
      </button>

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-5 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Pasang di iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>1. Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas) di toolbar Safari.</p>
              <p>2. Geser ke bawah lalu pilih menu <strong>Add to Home Screen</strong> (Tambah ke Layar Utama).</p>
              <p>3. Ketuk <strong>Add</strong> di pojok kanan atas untuk menyelesaikan pemasangan.</p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full py-2 text-xs font-bold rounded-lg bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white cursor-pointer transition shadow-xs"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
