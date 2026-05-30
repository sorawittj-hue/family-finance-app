import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LineChart, List, Target, PieChart, Settings, Rocket, TrendingUp } from 'lucide-react';
import { cn } from '../../utils/cn';

const NAV_ITEMS = [
  { path: '/', label: 'ภาพรวม', icon: LayoutDashboard, shortLabel: 'หน้าแรก' },
  { path: '/transactions', label: 'รายการ', icon: List, shortLabel: 'บันทึก' },
  { path: '/budgets', label: 'งบประมาณ', icon: PieChart, shortLabel: 'งบ' },
  { path: '/goals', label: 'เป้าหมาย', icon: Target, shortLabel: 'ออม' },
  { path: '/reports', label: 'รายงาน', icon: LineChart, shortLabel: 'รายงาน' },
  { path: '/portfolio', label: 'พอร์ต', icon: TrendingUp, shortLabel: 'ลงทุน' },
  { path: '/wealth', label: 'Coach', icon: Rocket, shortLabel: 'Coach' },
  { path: '/settings', label: 'ตั้งค่า', icon: Settings, shortLabel: 'ตั้งค่า' },
];

export const BottomNav = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[color:var(--bg-secondary)]/95 backdrop-blur-xl border-t border-[color:var(--border-color)] z-50 px-1 pb-safe">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
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
                    ? "text-blue-400" 
                    : "text-[color:var(--text-muted)] active:text-[color:var(--text-primary)]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-300",
                    isActive ? "bg-blue-500/20 scale-105" : "bg-transparent"
                  )}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform duration-300", isActive ? "scale-110" : "scale-100")} />
                  </div>
                  <span className={cn(
                    "text-[9px] font-semibold mt-0.5 transition-all duration-300 leading-tight",
                    isActive ? "opacity-100 text-blue-400" : "opacity-60"
                  )}>
                    {item.shortLabel}
                  </span>
                  {isActive && (
                    <div className="absolute top-0 w-8 h-0.5 bg-blue-500 rounded-b-full" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
