import React, { useMemo, useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney, formatMoneyShort } from '../utils/constants';
import { 
  ArrowUpRight, ArrowDownRight, ArrowRightLeft, AlertTriangle, 
  PiggyBank, ShieldCheck, TrendingUp, Utensils, Car, ShoppingBag, 
  Lightbulb, Check, Plus
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { TransferModal } from '../components/TransferModal';
import { useChartSize } from '../hooks/useChartSize';
import { buildMonthlyFinanceReport, getMonthKey, isTransferTransaction } from '../utils/financeAnalytics';

const insightToneClass = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
};

export const Dashboard = () => {
  const { transactions, wallets, budgets, currency, recurringTxs, addTransaction, user, portfolioValue } = useFinance();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const currentMonthKey = useMemo(() => getMonthKey(), []);
  const trendChart = useChartSize();
  const categoryChart = useChartSize();

  // Quick Record state
  const [quickAmount, setQuickAmount] = useState('');
  const [quickWalletId, setQuickWalletId] = useState('');
  const [quickStatus, setQuickStatus] = useState('');
  const [quickType, setQuickType] = useState('expense');

  // Set default quick wallet
  useEffect(() => {
    if (wallets.length > 0 && !quickWalletId) {
      setQuickWalletId(wallets[0].id);
    }
  }, [wallets, quickWalletId]);

  const handleQuickRecord = async (categoryId) => {
    const amt = parseFloat(quickAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setQuickStatus('error');
      setTimeout(() => setQuickStatus(''), 2000);
      return;
    }

    const success = await addTransaction({
      type: quickType,
      category: categoryId,
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      note: 'บันทึกด่วน',
      walletId: quickWalletId || wallets[0]?.id || 'wallet-cash'
    });

    if (success) {
      setQuickAmount('');
      setQuickStatus('success');
      setTimeout(() => setQuickStatus(''), 2000);
    } else {
      setQuickStatus('error');
      setTimeout(() => setQuickStatus(''), 2000);
    }
  };

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
        name: format(d, 'dd MMM', { locale: th }),
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
        <Card className="p-6 relative overflow-hidden group border-blue-500/25 bg-blue-500/[0.02]">
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-[color:var(--text-secondary)] mb-1">สินทรัพย์สุทธิ (Net Worth)</h3>
            <p className="text-3xl font-black text-blue-400 tracking-tight">
              {formatMoney(report.totalBalance + portfolioValue, currency)}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-[color:var(--border-color)] text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[color:var(--text-muted)]">เงินสด/บัญชี:</span>
                <span className="font-bold text-[color:var(--text-secondary)]">{formatMoney(report.totalBalance, currency)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span className="text-[color:var(--text-muted)]">พอร์ตลงทุน:</span>
                <span className="font-bold text-[color:var(--text-secondary)]">{formatMoney(portfolioValue, currency)}</span>
              </div>
            </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 border-blue-500/20 bg-blue-500/5 flex flex-col justify-between">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-300 flex items-center justify-center">
                <ShieldCheck size={28} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)] font-bold">คะแนนสุขภาพการเงิน</p>
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

        {/* Quick Record Card */}
        <Card className="p-6 flex flex-col h-full justify-between bg-[color:var(--bg-secondary)] border-[color:var(--border-color)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-md">
                <Plus size={16} />
              </div>
              <h3 className="text-sm font-black text-[color:var(--text-primary)]">บันทึกด่วน (Quick Record)</h3>
            </div>
            <p className="text-[10px] text-[color:var(--text-secondary)] mb-4">จดบันทึกรายจ่ายด่วนประจำวันลงในกระเป๋าของคุณในขั้นตอนเดียว</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-between">
            {/* Type Toggle */}
            <div>
              <label className="block text-[9px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider mb-2">ประเภท</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuickType('expense')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    quickType === 'expense'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-[color:var(--bg-secondary)] border-[color:var(--border-color)] text-[color:var(--text-secondary)]'
                  }`}
                >จ่าย</button>
                <button
                  type="button"
                  onClick={() => setQuickType('income')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    quickType === 'income'
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-[color:var(--bg-secondary)] border-[color:var(--border-color)] text-[color:var(--text-secondary)]'
                  }`}
                >รับ</button>
              </div>
            </div>

            {/* Wallet Selection */}
            <div>
              <label className="block text-[9px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider mb-2">เลือกกระเป๋าเงิน</label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
                {wallets.map(w => {
                  const isSelected = quickWalletId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setQuickWalletId(w.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                        isSelected 
                          ? 'text-white border-transparent' 
                          : 'bg-[color:var(--bg-secondary)] border-[color:var(--border-color)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                      }`}
                      style={{ backgroundColor: isSelected ? w.color : undefined }}
                    >
                      {w.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-[9px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider mb-2">จำนวนเงิน ({currency})</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-[color:var(--text-secondary)] font-bold">฿</span>
                <input 
                  type="number"
                  value={quickAmount}
                  onChange={(e) => setQuickAmount(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl pl-7 pr-3 py-2 text-sm text-[color:var(--text-primary)] font-bold focus:outline-none focus:border-blue-500"
                  min="1"
                />
              </div>
            </div>

            {/* Categories Buttons Grid */}
            <div>
              <label className="block text-[9px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider mb-2">กดบันทึกตามหมวดหมู่</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleQuickRecord('food')}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/30 transition-all text-[color:var(--text-primary)] active:scale-95"
                >
                  <Utensils size={18} className="text-rose-400 mb-1.5" />
                  <span className="text-[10px] font-bold">อาหาร</span>
                </button>
                <button 
                  onClick={() => handleQuickRecord('transport')}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 hover:border-amber-500/30 transition-all text-[color:var(--text-primary)] active:scale-95"
                >
                  <Car size={18} className="text-amber-400 mb-1.5" />
                  <span className="text-[10px] font-bold">เดินทาง</span>
                </button>
                <button 
                  onClick={() => handleQuickRecord('shopping')}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-pink-500/5 hover:bg-pink-500/10 border border-pink-500/10 hover:border-pink-500/30 transition-all text-[color:var(--text-primary)] active:scale-95"
                >
                  <ShoppingBag size={18} className="text-pink-400 mb-1.5" />
                  <span className="text-[10px] font-bold">ช้อปปิ้ง</span>
                </button>
                <button 
                  onClick={() => handleQuickRecord('home')}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 hover:border-sky-500/30 transition-all text-[color:var(--text-primary)] active:scale-95"
                >
                  <Lightbulb size={18} className="text-sky-400 mb-1.5" />
                  <span className="text-[10px] font-bold">ค่าน้ำไฟ</span>
                </button>
              </div>
            </div>

            {/* Quick Record Status Alert */}
            <div className="h-8">
              {quickStatus === 'success' && (
                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 py-1.5 rounded-lg flex items-center justify-center gap-1 animate-pulse">
                  <Check size={12} /> บันทึกสำเร็จ!
                </div>
              )}
              {quickStatus === 'error' && (
                <div className="text-[10px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 py-1.5 rounded-lg flex items-center justify-center gap-1 animate-pulse">
                  <AlertTriangle size={12} /> ป้อนจำนวนเงินไม่ถูกต้อง
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

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
