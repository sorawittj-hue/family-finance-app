import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Gauge, PiggyBank, Rocket, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../utils/constants';
import { buildWealthOperatingSystem, getMonthKey } from '../utils/financeAnalytics';

const toneClass = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
};

export const WealthCoach = () => {
  const { transactions, wallets, budgets, goals, recurringTxs, currency, user, syncing } = useFinance();
  const system = useMemo(() => buildWealthOperatingSystem({
    transactions,
    wallets,
    budgets,
    goals,
    recurringTxs,
    monthKey: getMonthKey(),
  }), [budgets, goals, recurringTxs, transactions, wallets]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-300 font-black">ระบบจัดการความมั่งคั่ง</p>
          <h1 className="text-3xl font-extrabold text-[color:var(--text-primary)] mt-1">ศูนย์บัญชาการการเงิน</h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-2 max-w-2xl">
            เปลี่ยนข้อมูลการเงินให้เป็นแผนลงมือจริง: รักษา cashflow, เพิ่มเงินออม, ลดรอยรั่ว และเร่งความเร็วสู่ความมั่งคั่ง
          </p>
        </div>
        <div className={`px-4 py-3 rounded-xl border text-xs font-bold ${user ? toneClass.success : toneClass.warning}`}>
          {user ? (syncing ? 'กำลัง sync ข้อมูลล่าสุด' : 'Cloud sync พร้อมใช้ข้ามเครื่อง') : 'ล็อกอินใน Settings เพื่อเปิด sync ข้ามเครื่อง'}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-blue-300 text-xs font-bold mb-3">
            <Gauge size={15} /> Health
          </div>
          <p className="text-3xl font-black text-[color:var(--text-primary)]">{system.report.healthScore}/100</p>
          <p className="text-xs text-[color:var(--text-secondary)] mt-2">วัดจาก cashflow, งบ, runway, เงินออม และภาระหนี้</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-3">
            <TrendingUp size={15} /> ความเร็วสร้างความมั่งคั่ง
          </div>
          <p className="text-2xl font-black text-emerald-300">{formatMoney(system.annualizedWealthVelocity, currency)}</p>
          <p className="text-xs text-[color:var(--text-secondary)] mt-2">กำลังสร้างความมั่งคั่งต่อปีจากเงินออมและ surplus</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-3">
            <ShieldCheck size={15} /> ช่องว่างเงินสำรอง
          </div>
          <p className="text-2xl font-black text-[color:var(--text-primary)]">{formatMoney(system.runwayGap, currency)}</p>
          <p className="text-xs text-[color:var(--text-secondary)] mt-2">เงินที่ต้องเติมเพื่อให้ครอบคลุมรายจ่าย 6 เดือน</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold mb-3">
            <AlertTriangle size={15} /> ภาระค่าใช้จ่ายประจำ
          </div>
          <p className="text-2xl font-black text-[color:var(--text-primary)]">{formatMoney(system.recurringExpense, currency)}</p>
          <p className="text-xs text-[color:var(--text-secondary)] mt-2">รายจ่ายประจำต่อเดือนที่ต้องคุ้มค่าจริง</p>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
              <Rocket size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">แผนลงมือเดือนนี้</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">ทำตามลำดับนี้ก่อน แล้วใช้ Mimo AI ช่วยบันทึกและถามต่อได้ทันที</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {system.playbook.map((item) => (
              <div key={item.title} className={`rounded-xl border p-4 ${toneClass[item.tone]}`}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-black">{item.title}</h3>
                  <span className="text-[10px] font-black rounded-full bg-black/10 px-2 py-1">{item.metric}</span>
                </div>
                <p className="text-xs mt-3 leading-relaxed opacity-90">{item.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center">
              <Target size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">สิ่งที่ควรทำถัดไป</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">สิ่งเดียวที่ควรทำก่อนเพื่อ leverage สูงสุด</p>
            </div>
          </div>
          <div className="space-y-4">
            {system.currentSavingGap > 0 ? (
              <div className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
                <p className="text-xs text-[color:var(--text-secondary)]">กันเงินเพิ่มเข้าการออมก่อนใช้จ่าย</p>
                <p className="text-2xl font-black text-emerald-300 mt-1">{formatMoney(system.currentSavingGap, currency)}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-300">
                <CheckCircle2 size={18} />
                <p className="text-sm font-bold mt-2">วินัยออมอยู่ในเกณฑ์ดีแล้ว ขยับ surplus ไปลงทุนหรือลดหนี้ดอกสูงได้</p>
              </div>
            )}
            <Button className="w-full gap-2" onClick={() => window.location.assign('/budgets')}>
              ปรับงบประมาณ <ArrowRight size={14} />
            </Button>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <PiggyBank className="text-emerald-300" size={22} />
            <h2 className="text-lg font-black text-[color:var(--text-primary)]">ความคืบหน้าเงินสำรองฉุกเฉิน</h2>
          </div>
          <div className="h-4 rounded-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${system.emergencyProgress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-[color:var(--text-secondary)] mt-3">
            <span>สำเร็จ {system.emergencyProgress.toFixed(0)}%</span>
            <span>ครอบคลุม {system.report.runwayMonths.toFixed(1)} เดือน</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <AlertTriangle className="text-amber-300" size={22} />
            <h2 className="text-lg font-black text-[color:var(--text-primary)]">รอยรั่วงบประมาณ</h2>
          </div>
          <div className="space-y-3">
            {system.budgetLeaks.length > 0 ? system.budgetLeaks.map((leak) => (
              <div key={leak.title} className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-[color:var(--text-primary)]">{leak.title}</h3>
                  <span className="text-xs text-amber-300 font-black">{formatMoney(leak.impact, currency)}</span>
                </div>
                <p className="text-xs text-[color:var(--text-secondary)] mt-2">{leak.detail}</p>
              </div>
            )) : (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-300 text-sm font-bold">
                เดือนนี้ยังไม่พบงบรั่วรุนแรง
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
};
