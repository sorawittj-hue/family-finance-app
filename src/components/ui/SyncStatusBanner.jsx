import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

const formatSyncTime = (value) => {
  if (!value) return 'ยังไม่ได้ซิงก์';
  try {
    return new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    console.warn('Failed to format sync time.', error);
    return 'เพิ่งซิงก์';
  }
};

export const SyncStatusBanner = () => {
  const { user, isOnline, syncing, syncError, realtimeStatus, lastSyncedAt, refreshFromCloud } = useFinance();
  const [refreshing, setRefreshing] = useState(false);

  if (!user) return null;

  const isHealthy = !syncError && realtimeStatus === 'SUBSCRIBED';
  const statusText = syncError
    ? syncError
    : isHealthy
      ? `ซิงก์พร้อมใช้งานล่าสุด ${formatSyncTime(lastSyncedAt)}`
      : 'กำลังเชื่อมต่อ cloud sync...';

  const handleRefresh = async () => {
    if (refreshing || syncing) return;
    setRefreshing(true);
    try {
      await refreshFromCloud();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={`mb-6 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
      syncError
        ? 'border-rose-500/25 bg-rose-500/10 text-rose-100'
        : isHealthy
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
          : 'border-blue-500/20 bg-blue-500/10 text-blue-100'
    }`}>
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">
          {!isOnline ? <WifiOff size={18} /> : syncError ? <AlertTriangle size={18} /> : isHealthy ? <CheckCircle2 size={18} /> : <Cloud size={18} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Cloud sync เปิดอยู่</p>
          <p className="text-xs opacity-80 break-words">{statusText}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing || syncing}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {refreshing || syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        รีเฟรชข้อมูล
      </button>
    </div>
  );
};
