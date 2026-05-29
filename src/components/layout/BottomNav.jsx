import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, LineChart, List, Target, PieChart, Settings } from 'lucide-react';
import { cn } from '../../utils/cn';

const NAV_ITEMS = [
  { path: '/', label: 'ภาพรวม', icon: LayoutDashboard },
  { path: '/transactions', label: 'รายการ', icon: List },
  { path: '/budgets', label: 'งบประมาณ', icon: PieChart },
  { path: '/goals', label: 'เป้าหมาย', icon: Target },
  { path: '/reports', label: 'รายงาน', icon: LineChart },
  { path: '/settings', label: 'ตั้งค่า', icon: Settings },
];

export const BottomNav = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[color:var(--bg-secondary)]/90 backdrop-blur-xl border-t border-[color:var(--border-color)] z-50 px-2 pb-safe">
      <div className="flex justify-around items-center h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center min-w-0 flex-1 h-full space-y-1 transition-all duration-200",
                  isActive 
                    ? "text-blue-400" 
                    : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all duration-300",
                    isActive ? "bg-blue-500/20" : "bg-transparent"
                  )}>
                    <Icon size={20} className={cn("transition-transform duration-300", isActive ? "scale-110" : "scale-100")} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-70"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
