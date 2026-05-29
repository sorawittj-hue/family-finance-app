import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney, formatMoneyShort } from '../utils/constants';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft, AlertTriangle, PiggyBank, ShieldCheck, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { TransferModal } from '../components/TransferModal';
import { useChartSize } from '../hooks/useChartSize';
import { buildMonthlyFinanceReport, getMonthKey, isTransferTransaction } from '../utils/financeAnalytics';

const insightToneClass = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
};

export const Dashboard = () => {
  const { transactions, wallets, budgets, currency, recurringTxs } = useFinance();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const currentMonthKey = useMemo(() => getMonthKey(), []);
  const trendChart = useChartSize();
  const categoryChart = useChartSize();

  const report = useMemo(() => buildMonthlyFinanceReport({
    transactions,
    wallets,
    budgets,
    recurringTxs,
    monthKey: currentMonthKey,
  }), [budgets, currentMonthKey, recurringTxs, transactions, wallets]);

  const expenseByCategory = useMemo(() => {
    return report.topCategories.slice(0, 5);
  }, [report.topCategories]);

  const dailyTrend = useMemo(() => {
    const days = [];
    for (let i = 14; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayTxs = transactions.filter(t => t.date.startsWith(dateStr) && !isTransferTransaction(t));
      const exp = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const inc = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const sav = dayTxs.filter(t => t.type === 'saving').reduce((s, t) => s + t.amount, 0);
      days.push({
        name: format(d, 'dd MMM'),
        expense: exp,
        income: inc,
        saving: sav,
      });
    }
    return days;
  }, [transactions]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--text-primary)]">ภาพรวมสถานะการเงิน</h1>
          <p className="text-[color:var(--text-secondary)] text-sm mt-1">สรุปข้อมูลการเงินของคุณในเดือนนี้</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsTransferOpen(true)} className="flex items-center gap-2">
            <ArrowRightLeft size={16} /> โอนเงินระหว่างกระเป๋า
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">ยอดเงินคงเหลือรวม</h3>
            <p className="text-3xl font-black text-[color:var(--text-primary)] tracking-tight">
              {formatMoney(report.totalBalance, currency)}
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
        </Card>
        
        <Card className="p-6 relative overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">รายรับเดือนนี้</h3>
              <p className="text-2xl font-black text-emerald-400 tracking-tight">
                +{formatMoney(report.income, currency)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ArrowDownRight size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">รายจ่ายเดือนนี้</h3>
              <p className="text-2xl font-black text-rose-400 tracking-tight">
                -{formatMoney(report.expense, currency)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ArrowUpRight size={20} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 border-blue-500/20 bg-blue-500/5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-300 flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)] font-bold">Financial Health Score</p>
              <h2 className="text-3xl font-black text-[color:var(--text-primary)] mt-1">{report.healthScore}/100</h2>
              <p className="text-xs text-[color:var(--text-secondary)] mt-1">คำนวณจากกระแสเงินสด เงินออม งบประมาณ เงินสำรอง และภาระหนี้</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <div className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold mb-2">
                <TrendingUp size={14} /> กระแสเงินสดสุทธิ
              </div>
              <p className={`text-lg font-black ${report.netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatMoney(report.netCashflow, currency)}
              </p>
            </div>
            <div className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold mb-2">
                <PiggyBank size={14} /> อัตราออม
              </div>
              <p className="text-lg font-black text-[color:var(--text-primary)]">{report.savingRate.toFixed(1)}%</p>
            </div>
            <div className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-2">
                <AlertTriangle size={14} /> คาดการณ์รายจ่าย
              </div>
              <p className="text-lg font-black text-[color:var(--text-primary)]">{formatMoney(report.projectedExpense, currency)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
          {report.insights.map((insight) => (
            <div key={insight.title} className={`rounded-xl border p-4 ${insightToneClass[insight.tone] || insightToneClass.warning}`}>
              <h3 className="text-sm font-bold">{insight.title}</h3>
              <p className="text-xs mt-1 opacity-90 leading-relaxed">{insight.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-6 uppercase tracking-wider">แนวโน้มรายรับ-รายจ่าย (15 วัน)</h3>
          <div ref={trendChart.ref} className="h-64 w-full">
            {trendChart.isReady && (
                <AreaChart width={trendChart.width} height={trendChart.height} data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoneyShort(v, currency)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                  <Area type="monotone" dataKey="saving" stroke="#3b82f6" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-[color:var(--text-primary)] mb-6 uppercase tracking-wider">รายจ่ายตามหมวดหมู่</h3>
          <div ref={categoryChart.ref} className="h-64 w-full">
            {expenseByCategory.length > 0 ? (
              categoryChart.isReady && (
                  <BarChart width={categoryChart.width} height={categoryChart.height} data={expenseByCategory} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={80} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }}
                      formatter={(value) => formatMoney(value, currency)}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={20}>
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
              )
            ) : (
              <div className="h-full flex items-center justify-center text-[color:var(--text-muted)] text-sm">
                ไม่มีข้อมูลรายจ่ายในเดือนนี้
              </div>
            )}
          </div>
        </Card>
      </div>
      
      {isTransferOpen && <TransferModal onClose={() => setIsTransferOpen(false)} />}
    </div>
  );
};
