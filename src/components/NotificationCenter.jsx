import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, BellRing, CheckCheck, Info, ShieldAlert, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { cn } from '../utils/cn';

const severityStyle = {
  danger: {
    icon: ShieldAlert,
    tone: 'text-rose-300 bg-rose-500/10 border-rose-500/25',
    dot: 'bg-rose-400',
  },
  warning: {
    icon: AlertTriangle,
    tone: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
    dot: 'bg-amber-400',
  },
  info: {
    icon: Info,
    tone: 'text-blue-300 bg-blue-500/10 border-blue-500/25',
    dot: 'bg-blue-400',
  },
};

export const NotificationCenter = () => {
  const {
    activeAlerts,
    unreadAlertCount,
    dismissAlert,
    markAlertRead,
    markAllAlertsRead,
  } = useFinance();
  const [isOpen, setIsOpen] = useState(false);

  const topAlerts = useMemo(() => activeAlerts.slice(0, 8), [activeAlerts]);
  const hasAlerts = topAlerts.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open);
          if (!isOpen) markAllAlertsRead();
        }}
        className="fixed bottom-20 right-24 md:bottom-6 md:right-24 w-14 h-14 rounded-full bg-[color:var(--bg-secondary)] hover:bg-[color:var(--bg-card-hover)] text-[color:var(--text-primary)] flex items-center justify-center shadow-xl border border-[color:var(--border-color)] z-50 active:scale-95 transition-all no-print"
        aria-label="เปิดศูนย์แจ้งเตือน"
      >
        {unreadAlertCount > 0 ? <BellRing size={22} className="text-amber-300" /> : <Bell size={22} />}
        {unreadAlertCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-[color:var(--bg-primary)]">
            {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[55] pointer-events-none no-print">
          <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={() => setIsOpen(false)} />
          <section className="absolute right-4 bottom-36 md:right-24 md:bottom-24 w-[calc(100vw-32px)] max-w-[420px] max-h-[70vh] overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)]/95 backdrop-blur-2xl shadow-2xl pointer-events-auto">
            <header className="flex items-center justify-between gap-3 p-4 border-b border-[color:var(--border-color)]">
              <div>
                <h2 className="text-sm font-black text-[color:var(--text-primary)]">ศูนย์แจ้งเตือน</h2>
                <p className="text-[10px] text-[color:var(--text-secondary)] mt-0.5">
                  {hasAlerts ? `${activeAlerts.length} alert ที่ควรดูตอนนี้` : 'สถานะเรียบร้อย ไม่มี alert สำคัญ'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {hasAlerts && (
                  <button
                    type="button"
                    onClick={markAllAlertsRead}
                    className="p-2 rounded-xl text-[color:var(--text-secondary)] hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                    aria-label="ทำเครื่องหมายว่าอ่านแล้ว"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)] transition-colors"
                  aria-label="ปิดศูนย์แจ้งเตือน"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="max-h-[58vh] overflow-y-auto p-3 space-y-2">
              {!hasAlerts && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  ไม่มีเรื่องเร่งด่วนตอนนี้ ระบบจะเตือนเมื่อมีงบใกล้เต็ม บิลใกล้ครบกำหนด หรือกระแสเงินสดเริ่มเสี่ยง
                </div>
              )}

              {topAlerts.map((alert) => {
                const style = severityStyle[alert.severity] || severityStyle.info;
                const Icon = style.icon;
                return (
                  <article key={alert.id} className={cn('rounded-2xl border p-3', style.tone)}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-black/10 flex items-center justify-center shrink-0">
                        <Icon size={17} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-black text-[color:var(--text-primary)]">{alert.title}</h3>
                          <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', style.dot)} />
                        </div>
                        <p className="text-[11px] leading-relaxed text-[color:var(--text-secondary)] mt-1">{alert.message}</p>
                        <div className="flex items-center justify-between gap-2 mt-3">
                          <Link
                            to={alert.route}
                            onClick={() => {
                              markAlertRead(alert.id);
                              setIsOpen(false);
                            }}
                            className="text-[10px] font-bold text-blue-300 hover:text-blue-200"
                          >
                            ไปดูรายละเอียด
                          </Link>
                          <button
                            type="button"
                            onClick={() => dismissAlert(alert.id)}
                            className="text-[10px] font-bold text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                          >
                            ซ่อน alert นี้
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
};
