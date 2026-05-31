import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LineChart, List, Target, PieChart, Settings, Rocket, TrendingUp, MoreHorizontal, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const MAIN_NAV = [
  { path: '/', label: 'หน้าแรก', icon: LayoutDashboard },
  { path: '/transactions', label: 'บันทึก', icon: List },
  { path: '/budgets', label: 'งบ', icon: PieChart },
  { path: '/goals', label: 'ออม', icon: Target },
];

const MORE_NAV = [
  { path: '/reports', label: 'รายงาน', icon: LineChart },
  { path: '/portfolio', label: 'ลงทุน', icon: TrendingUp },
  { path: '/wealth', label: 'Coach', icon: Rocket },
  { path: '/settings', label: 'ตั้งค่า', icon: Settings },
];

export const BottomNav = () => {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60] bg-slate-900/35 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
          <div className="absolute bottom-20 left-4 right-4 bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-lg p-4 shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[color:var(--text-primary)]">เมนูเพิ่มเติม</h3>
              <button onClick={() => setMoreOpen(false)} className="p-1 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MORE_NAV.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all",
                      isActive
                        ? "bg-blue-500/10 text-blue-600 border border-blue-500/25 shadow-sm"
                        : "bg-[color:var(--bg-card)] text-[color:var(--text-secondary)] border border-[color:var(--border-color)]"
                    )}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-bold">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-nav-shell md:hidden fixed bottom-0 left-0 w-full backdrop-blur-2xl border-t border-[color:var(--border-color)] shadow-[0_-12px_34px_rgba(15,23,42,0.08)] z-50 px-1 pb-safe">
        <div className="flex justify-around items-center h-16">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center min-w-0 flex-1 h-full transition-all duration-200",
                    isActive
                      ? "text-blue-600"
                      : "text-[color:var(--text-muted)] active:text-[color:var(--text-primary)]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "p-1.5 rounded-xl transition-all duration-300",
                      isActive ? "bg-blue-500/10 scale-105 shadow-sm" : "bg-transparent"
                    )}>
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform duration-300", isActive ? "scale-110" : "scale-100")} />
                    </div>
                    <span className={cn(
                      "text-[9px] font-semibold mt-0.5 transition-all duration-300 leading-tight",
                      isActive ? "opacity-100 text-blue-600" : "opacity-60"
                    )}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="absolute top-0 w-8 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-b-full" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center min-w-0 flex-1 h-full transition-all duration-200",
              moreOpen ? "text-blue-600" : "text-[color:var(--text-muted)]"
            )}
          >
            <div className={cn("p-1.5 rounded-xl transition-all duration-300", moreOpen ? "bg-blue-500/10 shadow-sm" : "bg-transparent")}>
              <MoreHorizontal size={18} />
            </div>
            <span className={cn("text-[9px] font-semibold mt-0.5 leading-tight", moreOpen ? "opacity-100 text-blue-600" : "opacity-60")}>
              เพิ่มเติม
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
