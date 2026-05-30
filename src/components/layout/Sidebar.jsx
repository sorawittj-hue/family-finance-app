import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LineChart, List, Target, PieChart, Settings, Rocket } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useFinance } from '../../context/FinanceContext';

const NAV_ITEMS = [
  { path: '/', label: 'ภาพรวมสถานะการเงิน', icon: LayoutDashboard },
  { path: '/transactions', label: 'รายการเคลื่อนไหว', icon: List },
  { path: '/budgets', label: 'งบประมาณรายเดือน', icon: PieChart },
  { path: '/goals', label: 'เป้าหมายการออม', icon: Target },
  { path: '/reports', label: 'รายงานสุขภาพการเงิน', icon: LineChart },
  { path: '/wealth', label: 'Wealth Coach', icon: Rocket },
  { path: '/settings', label: 'ตั้งค่าระบบ', icon: Settings },
];

export const Sidebar = () => {
  const { user, isOnline } = useFinance();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[color:var(--bg-secondary)]/80 border-r border-[color:var(--border-color)] z-50">
      <div className="p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-extrabold text-[color:var(--text-primary)] tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-[color:var(--text-primary)] text-lg">💸</span>
            </div>
            Money Nitro
          </h1>
          
          {/* Cloud Sync Status Badge */}
          <div className="flex items-center mt-0.5">
            {!user ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                โหมดใช้งานในเครื่อง (Local)
              </span>
            ) : isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute inline-flex h-1.5 w-1.5"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                เชื่อมต่อคลาวด์แล้ว (Sync)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                ออฟไลน์ชั่วคราว (Offline)
              </span>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "text-blue-400 font-bold bg-blue-500/10 shadow-inner" 
                    : "text-[color:var(--text-secondary)] font-medium hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-md transition-transform duration-300",
                    isActive ? "scale-y-100" : "scale-y-0"
                  )} />
                  <Icon 
                    size={20} 
                    className={cn(
                      "transition-all duration-300",
                      isActive ? "scale-110" : "group-hover:scale-110 opacity-70 group-hover:opacity-100"
                    )} 
                  />
                  <span className="relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-6">
        <div className="bg-[color:var(--bg-primary)] rounded-xl p-4 border border-[color:var(--border-color)]">
          <p className="text-xs text-[color:var(--text-secondary)] font-medium">เวอร์ชัน 2.0.0</p>
          <p className="text-[10px] text-[color:var(--text-muted)] mt-1">อัปเดตล่าสุด: วันนี้</p>
        </div>
      </div>
    </aside>
  );
};
