import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney, formatMoneyShort, getCategory } from '../utils/constants';
import { ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { format, subDays, isSameMonth, parseISO } from 'date-fns';
import { TransferModal } from '../components/TransferModal';

const CHART_HEIGHT = 256;

const useChartSize = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width);
      setWidth(nextWidth > 0 ? nextWidth : 0);
    };

    updateWidth();

    if (typeof window.ResizeObserver === 'function') {
      const observer = new window.ResizeObserver(updateWidth);
      observer.observe(node);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return { ref, width, height: CHART_HEIGHT, isReady: width > 0 };
};

export const Dashboard = () => {
  const { transactions, wallets, currency } = useFinance();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const currentMonth = useMemo(() => new Date(), []);
  const trendChart = useChartSize();
  const categoryChart = useChartSize();

  const currentMonthTxs = useMemo(() => {
    return transactions.filter(tx => isSameMonth(parseISO(tx.date), currentMonth));
  }, [transactions, currentMonth]);

  const { totalIncome, totalExpense, totalBalance } = useMemo(() => {
    const income = currentMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = currentMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const totalBal = wallets.reduce((sum, w) => {
      const wtxs = transactions.filter(t => t.walletId === w.id);
      const inc = wtxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = wtxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return sum + (inc - exp);
    }, 0);
    return { totalIncome: income, totalExpense: expense, totalBalance: totalBal };
  }, [currentMonthTxs, transactions, wallets]);

  const expenseByCategory = useMemo(() => {
    const expenses = currentMonthTxs.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
    
    return Object.entries(grouped)
      .map(([catId, amount]) => {
        const cat = getCategory('expense', catId);
        return { name: cat.label, amount, fill: cat.color };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [currentMonthTxs]);

  const dailyTrend = useMemo(() => {
    const days = [];
    for (let i = 14; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayTxs = transactions.filter(t => t.date.startsWith(dateStr));
      const exp = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const inc = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      days.push({
        name: format(d, 'dd MMM'),
        expense: exp,
        income: inc,
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
              {formatMoney(totalBalance, currency)}
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
        </Card>
        
        <Card className="p-6 relative overflow-hidden group">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold text-[color:var(--text-secondary)] mb-1">รายรับเดือนนี้</h3>
              <p className="text-2xl font-black text-emerald-400 tracking-tight">
                +{formatMoney(totalIncome, currency)}
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
                -{formatMoney(totalExpense, currency)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ArrowUpRight size={20} />
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
