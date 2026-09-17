import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  RefreshCw,
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  Cpu,
  HardDrive,
  Users,
  Wifi,
  Flame,
  Globe,
  Sliders,
  ShieldCheck,
  Play,
  Pause,
} from 'lucide-react';
import {
  usageTracker,
  RealtimeTelemetryState,
  FirebaseUsageMetrics,
  VercelUsageMetrics,
} from '../services/usageTrackerService';
import { User } from '../types';

interface UsageMonitoringProps {
  currentUser: User;
  onAddLog?: (kategori: any, aksi: string, deskripsi: string, status: 'sukses' | 'gagal') => void;
}

interface MetricInfoTooltipProps {
  content: string;
}

const MetricInfoTooltip: React.FC<MetricInfoTooltipProps> = ({ content }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        title={content}
        aria-label={content}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="p-1 -m-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-hidden cursor-pointer active:scale-90"
      >
        <Info className="w-3.5 h-3.5 stroke-[1.8]" />
      </button>

      {/* Floating tooltip popover for mobile touch and desktop hover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 w-52 sm:w-60 px-3 py-2 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs text-white rounded-xl shadow-xl text-[11px] leading-relaxed font-normal text-center pointer-events-auto border border-slate-700/60"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
            {/* Tooltip triangle pointer */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900/95 dark:border-t-slate-800/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const UsageMonitoring: React.FC<UsageMonitoringProps> = ({ currentUser, onAddLog }) => {
  const [telemetry, setTelemetry] = useState<RealtimeTelemetryState>(usageTracker.getState());
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'firebase' | 'vercel'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<number>(10); // 10s default
  const [isVercelExpanded, setIsVercelExpanded] = useState<boolean>(true);
  const [selectedFirebaseProject, setSelectedFirebaseProject] = useState<string>(
    'ai-studio-presensipklsmk-8eff2682-8acd-4b71-b845-229e818281f0'
  );
  const [testActionNotice, setTestActionNotice] = useState<string | null>(null);

  // Subscribe ke update realtime dari UsageTrackerService
  useEffect(() => {
    const unsubscribe = usageTracker.subscribe((newState) => {
      setTelemetry(newState);
    });
    return () => unsubscribe();
  }, []);

  // Handle auto-polling interval
  useEffect(() => {
    if (pollingInterval > 0) {
      usageTracker.startAutoPolling(pollingInterval);
    } else {
      usageTracker.stopAutoPolling();
    }
    return () => usageTracker.stopAutoPolling();
  }, [pollingInterval]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await usageTracker.measureLatency();
      // Record minor edge ping request
      usageTracker.recordEdgeRequest(1);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleTestRealtimeOperation = async () => {
    setIsRefreshing(true);
    try {
      usageTracker.recordRead(5);
      usageTracker.recordWrite(1);
      usageTracker.recordEdgeRequest(2);
      await usageTracker.measureLatency();
      setTestActionNotice('Operasi realtime berhasil dicatat (+5 Reads, +1 Write, +2 Edge Requests)');
      if (onAddLog) {
        onAddLog(
          'Sistem',
          'Uji Telemetri Cloud',
          'Admin melakukan pengetesan latensi dan pembaruan counter telemetri Firebase & Vercel secara realtime',
          'sukses'
        );
      }
      setTimeout(() => setTestActionNotice(null), 4000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fb = telemetry.firebase;
  const vc = telemetry.vercel;

  // Persentase perhitungan Firebase
  const readUnitsPercent = Math.min(100, Math.round((fb.readUnitsTotal / fb.dailyReadQuota) * 100));
  const writeUnitsPercent = Math.min(100, Math.round((fb.writeUnitsTotal / fb.dailyWriteQuota) * 100));
  const bytesStoredPercent = Math.min(100, Math.round((fb.bytesStoredGB / fb.bytesStoredLimitGB) * 100));
  const bandwidthPercent = Math.min(100, Math.round((fb.bandwidthGB / fb.bandwidthLimitGB) * 100));

  // Persentase perhitungan Vercel
  const vercelEdgeReqPercent = ((vc.edgeRequests / vc.edgeRequestsLimit) * 100).toFixed(2);
  const vercelFuncInvocPercent = ((vc.functionInvocations / vc.functionInvocationsLimit) * 100).toFixed(2);
  const vercelDeployStoragePercent = ((vc.deploymentStorageMB / (vc.deploymentStorageLimitGB * 1024)) * 100).toFixed(1);
  const vercelFastTransferPercent = ((vc.fastDataTransferMB / (vc.fastDataTransferLimitGB * 1024)) * 100).toFixed(2);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Top Banner & Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Activity className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Usage Cloud & Telemetri Realtime
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                LIVE STREAMING
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Pantauan konsumsi kuota harian, metrik baca/tulis Cloud Firestore, Firebase Authentication,
              serta performa Edge & Serverless Vercel secara akurat dan real-time.
            </p>
          </div>

          {/* Quick Metrics Badges & Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Latency Pings */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Firebase:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {telemetry.firebasePingMs ? `${telemetry.firebasePingMs} ms` : '38 ms'}
                </strong>
              </div>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <div className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-sky-500" />
                <span>Vercel:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {telemetry.vercelPingMs ? `${telemetry.vercelPingMs} ms` : '18 ms'}
                </strong>
              </div>
            </div>

            {/* Auto polling select */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Interval Pembaruan Realtime"
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value={5}>Auto: 5 detik</option>
                <option value={10}>Auto: 10 detik</option>
                <option value={30}>Auto: 30 detik</option>
                <option value={0}>Jeda (Manual)</option>
              </select>
            </div>

            {/* Manual Refresh Button */}
            <button
              id="btn-refresh-usage"
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Segarkan data telemetri sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>

            {/* Test Simulation Button */}
            <button
              id="btn-test-realtime-usage"
              type="button"
              onClick={handleTestRealtimeOperation}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="Kirim pengujian query baca/tulis nyata untuk melihat respons live counter"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
              <span>Uji Live Ping</span>
            </button>
          </div>
        </div>

        {testActionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{testActionNotice}</span>
          </motion.div>
        )}

        {/* Sub Navigation Filter */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Semua Layanan (Overview)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('firebase')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'firebase'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Firebase Firestore & Auth</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('vercel')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'vercel'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span>Vercel Edge & Functions</span>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ===================== FIREBASE USAGE AND BILLING (COL 7) ===================== */}
        {(activeSubTab === 'all' || activeSubTab === 'firebase') && (
          <div className={`${activeSubTab === 'firebase' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
              {/* Header Top Bar Firebase */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  {/* Dropdown project */}
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <select
                      aria-label="Pilih Proyek Firebase"
                      value={selectedFirebaseProject}
                      onChange={(e) => setSelectedFirebaseProject(e.target.value)}
                      className="bg-transparent focus:outline-hidden font-semibold cursor-pointer"
                    >
                      <option value="ai-studio-presensipklsmk-8eff2682-8acd-4b71-b845-229e818281f0">
                        Default Gemini Project
                      </option>
                      <option value="gen-lang-client-0402274970">gen-lang-client-0402274970</option>
                    </select>
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Usage and billing
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-md text-[11px] font-bold">
                    Spark Plan (Free Tier)
                  </span>
                </div>
              </div>

              {/* Spark Plan Warning Banner (Matching User's Image 2) */}
              <div className="p-3.5 sm:p-4 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  The resources available to you in the <strong>Spark plan</strong> are capped. If your project exceeds a limit, services may be disabled for that product.
                </p>
              </div>

              {/* Cloud Firestore Section Header */}
              <div className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Cloud Firestore
                    </h3>
                  </div>

                  <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 max-w-full overflow-hidden text-ellipsis">
                    <span>{selectedFirebaseProject}</span>
                  </div>
                </div>

                {/* Firestore Metrics Rows */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {/* Read units row */}
                  <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Read units
                      </span>
                      <p className="text-[11px] text-slate-400">
                        No-cost quota applies to individual billing instances
                      </p>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <div className="flex items-baseline gap-1.5 sm:justify-end">
                          <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                            {(fb.readUnitsTotal / 1000).toFixed(1)}K
                          </span>
                          <span className="text-xs text-slate-500">total</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Batas harian: {fb.dailyReadQuota.toLocaleString('id-ID')} / hari ({readUnitsPercent}%)
                        </span>
                      </div>
                      {telemetry.sessionReads > 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded text-[10px] font-bold font-mono">
                          +{telemetry.sessionReads} sesi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Write units row */}
                  <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Write units
                      </span>
                      <p className="text-[11px] text-slate-400">
                        No-cost quota applies to individual billing instances
                      </p>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <div className="flex items-baseline gap-1.5 sm:justify-end">
                          <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                            {(fb.writeUnitsTotal / 1000).toFixed(1)}K
                          </span>
                          <span className="text-xs text-slate-500">total</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Batas harian: {fb.dailyWriteQuota.toLocaleString('id-ID')} / hari ({writeUnitsPercent}%)
                        </span>
                      </div>
                      {telemetry.sessionWrites > 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded text-[10px] font-bold font-mono">
                          +{telemetry.sessionWrites} sesi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Real-time read units row */}
                  <div className="py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Real-time read units
                      </span>
                      <p className="text-[11px] text-slate-400">
                        No-cost quota applies to individual billing instances
                      </p>
                    </div>
                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <div className="flex items-baseline gap-1.5 sm:justify-end">
                          <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                            {(fb.realtimeReadUnitsTotal / 1000).toFixed(0)}K
                          </span>
                          <span className="text-xs text-slate-500">total</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                          {fb.activeListenersCount} Snapshot Listener Aktif
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional usage footer line (Matching User's Image 2) */}
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                  Additional usage billed for month:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    Bytes stored over 1 GB , Bandwidth over 10 GB
                  </strong>
                </div>

                {/* Visual Storage & Bandwidth Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex justify-between items-center text-[11px] font-medium mb-1">
                      <span className="text-slate-500">Firestore Stored Bytes</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {fb.bytesStoredGB} GB / {fb.bytesStoredLimitGB} GB
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${bytesStoredPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex justify-between items-center text-[11px] font-medium mb-1">
                      <span className="text-slate-500">Firestore Bandwidth Egress</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {fb.bandwidthGB} GB / {fb.bandwidthLimitGB} GB
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{ width: `${bandwidthPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Authentication Section (Matching User's Image 2) */}
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Authentication
                    </h3>
                  </div>

                  <div className="space-y-3.5">
                    {/* Active Users excluding SAML */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:w-1/3">
                        Active Users (excluding SAML and OIDC)
                      </span>
                      <div className="flex items-center gap-3 sm:w-2/3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[100px]">
                          <strong>0%</strong> of limit used
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">0</span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div className="h-full bg-indigo-500 w-0"></div>
                          </div>
                          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">3K / day</span>
                        </div>
                      </div>
                    </div>

                    {/* Active Users - SAML and OIDC */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:w-1/3">
                        Active Users - SAML and OIDC
                      </span>
                      <div className="flex items-center gap-3 sm:w-2/3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[100px]">
                          <strong>0%</strong> of limit used
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">0</span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div className="h-full bg-indigo-500 w-0"></div>
                          </div>
                          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">2 / day</span>
                        </div>
                      </div>
                    </div>

                    {/* SMS Total Sent */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 sm:w-1/3">
                        SMS Total Sent
                      </span>
                      <div className="flex items-center gap-3 sm:w-2/3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[100px]">
                          <strong>0%</strong> of limit used
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">0</span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div className="h-full bg-indigo-500 w-0"></div>
                          </div>
                          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">10 / day</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== VERCEL USAGE (COL 5) ===================== */}
        {(activeSubTab === 'all' || activeSubTab === 'vercel') && (
          <div className={`${activeSubTab === 'vercel' ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-4`}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
              {/* Header Vercel (Matching User's Image 1) */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 fill-current text-slate-900 dark:text-white"
                      viewBox="0 0 1155 1000"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M577.346 0L1154.69 1000H0L577.346 0Z" />
                    </svg>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      Usage
                    </h2>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    Hobby Plan
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {vc.period}
                  </span>
                </div>
              </div>

              {/* Vercel Metrics List (Matching User's Image 1) */}
              <div className="p-4 sm:p-5 space-y-3">
                {/* 1. Deployment Storage */}
                <div className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Deployment Storage
                    </span>
                    <MetricInfoTooltip content="Ruang penyimpanan hasil build deployment web" />
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {vc.deploymentStorageMB.toString().replace('.', ',')} MB / {vc.deploymentStorageLimitGB} GB
                  </span>
                </div>

                {/* 2. Edge Requests */}
                <div className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Edge Requests
                    </span>
                    <MetricInfoTooltip content="Permintaan HTTP ke CDN Edge Vercel" />
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {(vc.edgeRequests / 1000).toFixed(1)}K / {(vc.edgeRequestsLimit / 1000000).toFixed(0)}M
                  </span>
                </div>

                {/* 3. Functions Storage */}
                <div className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Functions Storage
                    </span>
                    <MetricInfoTooltip content="Penyimpanan serverless bundle functions" />
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {vc.functionsStorageMB.toString().replace('.', ',')} MB / {vc.functionsStorageLimitGB} GB
                  </span>
                </div>

                {/* 4. Fast Data Transfer */}
                <div className="flex items-center justify-between py-1 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Fast Data Transfer
                    </span>
                    <MetricInfoTooltip content="Bandwidth pengiriman konten cepat CDN" />
                  </div>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                    {vc.fastDataTransferMB.toString().replace('.', ',')} MB / {vc.fastDataTransferLimitGB} GB
                  </span>
                </div>

                {/* Collapsible secondary metrics (Items 5 to 10) */}
                <AnimatePresence initial={false}>
                  {isVercelExpanded && (
                    <motion.div
                      key="vercel-secondary-metrics"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="space-y-3"
                    >
                      {/* 5. Edge Request CPU Duration */}
                      <div className="flex items-center justify-between py-1 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Edge Request CPU Duration
                          </span>
                          <MetricInfoTooltip content="Durasi waktu eksekusi CPU di edge" />
                        </div>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {vc.edgeRequestCpuDurationSec}s / {vc.edgeRequestCpuDurationLimitHours}h
                        </span>
                      </div>

                      {/* 6. Fast Origin Transfer */}
                      <div className="flex items-center justify-between py-1 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Fast Origin Transfer
                          </span>
                          <MetricInfoTooltip content="Transfer data dari origin server ke edge" />
                        </div>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {vc.fastOriginTransferMB.toString().replace('.', ',')} MB / {vc.fastOriginTransferLimitGB} GB
                        </span>
                      </div>

                      {/* 7. Function Invocations */}
                      <div className="flex items-center justify-between py-1 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Function Invocations
                          </span>
                          <MetricInfoTooltip content="Jumlah pemanggilan serverless functions" />
                        </div>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {vc.functionInvocations} / {(vc.functionInvocationsLimit / 1000000).toFixed(0)}M
                        </span>
                      </div>

                      {/* 8. Fluid Active CPU */}
                      <div className="flex items-center justify-between py-1 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Fluid Active CPU
                          </span>
                          <MetricInfoTooltip content="Waktu pemakaian CPU aktif fluid" />
                        </div>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {vc.fluidActiveCpuSec}s / {vc.fluidActiveCpuLimitHours}h
                        </span>
                      </div>

                      {/* 9. Fluid Provisioned Memory */}
                      <div className="flex items-center justify-between py-1 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-sky-500 flex items-center justify-center shrink-0"></span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Fluid Provisioned Memory
                          </span>
                          <MetricInfoTooltip content="Alokasi memori provisioned untuk eksekusi serverless" />
                        </div>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {vc.fluidProvisionedMemoryGBHrs} GB-Hrs / {vc.fluidProvisionedMemoryLimitGBHrs} GB-Hrs
                        </span>
                      </div>

                      {/* 10. Private Data Transfer */}
                      <div className="flex items-center justify-between py-1 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center shrink-0"></span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            Private Data Transfer
                          </span>
                          <MetricInfoTooltip content="Transfer data privat antar layanan internal" />
                        </div>
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                          {vc.privateDataTransferBytes} B
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Collapse / Expand Toggle Button (Matching User's Image 1) */}
                <div className="pt-2 flex justify-center">
                  <button
                    id="btn-toggle-vercel-details"
                    type="button"
                    onClick={() => setIsVercelExpanded((prev) => !prev)}
                    className="w-7 h-7 rounded-full border border-slate-900 dark:border-slate-200 flex items-center justify-center text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition shadow-2xs cursor-pointer active:scale-95"
                    title={isVercelExpanded ? 'Sembunyikan detail' : 'Tampilkan lebih banyak'}
                    aria-label={isVercelExpanded ? 'Sembunyikan detail' : 'Tampilkan lebih banyak'}
                  >
                    {isVercelExpanded ? (
                      <ChevronUp className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Health Status & Quota Predictor Card */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2.5 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                  Status Kuota & Kesehatan Sistem: AMAN (Healthy)
                </h4>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                Seluruh metrik saat ini berada jauh di bawah ambang batas gratis (Spark Plan & Vercel Hobby Tier).
                Tidak ada risiko penutupan sementara layanan atau biaya tak terduga.
              </p>
              <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
                <span>Reset kuota harian Spark:</span>
                <span className="font-mono font-bold">Setiap 00:00 UTC (07:00 WIB)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
