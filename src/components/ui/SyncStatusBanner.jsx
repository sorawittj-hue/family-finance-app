import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, Loader2, RefreshCw, WifiOff, HardDrive } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { supabaseAvailable } from '../../utils/supabaseClient';

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

  // Show local-only mode banner when Supabase key is invalid
  if (!supabaseAvailable) {
    return (
      <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-100 px-4 py-3 flex items-start gap-3">
        <HardDrive size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">โหมดออฟไลน์ — ข้อมูลเก็บในเครื่องเท่านั้น</p>
          <p className="text-xs opacity-80 mt-1">
            Supabase API key ไม่ถูกต้อง ข้อมูลจะเก็บใน browser นี้เท่านั้น 
            ไม่ซิงก์ข้ามเครื่อง ถ้าล้าง browser data ข้อมูลจะหาย
          </p>
          <p className="text-xs opacity-60 mt-1">
            แก้ไข: ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน Vercel Environment Variables
          </p>
        </div>
      </div>
    );
  }

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
