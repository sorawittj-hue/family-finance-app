import React, { useMemo, useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney } from '../utils/constants';
import { buildMonthlyFinanceReport, getMonthKey } from '../utils/financeAnalytics';
import { subMonths, format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useChartSize } from '../hooks/useChartSize';
import { AlertTriangle, Calendar, CheckCircle2, Clock, Download, PiggyBank, PieChart, ShieldCheck, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';

const toneClass = {
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
};

const toCsvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map(toCsvCell).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const getActionPlan = (report, currency) => {
  const actions = [];
  const topCategory = report.topCategories[0];
  const riskyBudget = report.budgetUsage.find((budget) => budget.status !== 'ok');

  if (report.netCashflow < 0) {
    actions.push({
      tone: 'danger',
      title: 'หยุดเลือดไหลของ cashflow',
      detail: topCategory
        ? `ลดหมวด ${topCategory.name} ก่อน เพราะใช้ไป ${formatMoney(topCategory.amount, currency)} ในเดือนนี้`
        : 'ลดรายจ่ายไม่จำเป็นและตรวจรายการประจำทั้งหมด',
    });
  }

  if (report.savingRate < 10 && report.income > 0) {
    actions.push({
      tone: 'warning',
      title: 'ตั้ง auto-save ขั้นต่ำ',
      detail: `เริ่มจาก 10% ของรายรับเดือนนี้ ประมาณ ${formatMoney(report.income * 0.1, currency)}`,
    });
  }

  if (riskyBudget) {
    actions.push({
      tone: riskyBudget.status === 'over' ? 'danger' : 'warning',
      title: 'จัดการงบที่เสี่ยงที่สุด',
      detail: `${riskyBudget.label} ใช้ไป ${riskyBudget.progress.toFixed(0)}% เหลือ ${formatMoney(riskyBudget.remaining, currency)}`,
    });
  }

  if (report.runwayMonths > 0 && report.runwayMonths < 3) {
    actions.push({
      tone: 'warning',
      title: 'เติมเงินสำรองฉุกเฉิน',
      detail: `ตอนนี้ครอบคลุมรายจ่ายได้ประมาณ ${report.runwayMonths.toFixed(1)} เดือน ควรขยับไปให้ถึง 3-6 เดือน`,
    });
  }

  if (report.debtRatio >= 30) {
    actions.push({
      tone: 'danger',
      title: 'ลดแรงกดดันจากหนี้',
      detail: `หนี้คิดเป็น ${report.debtRatio.toFixed(1)}% ของรายรับ ให้เริ่มจากหนี้ดอกเบี้ยสูงสุด`,
    });
  }

  if (actions.length === 0) {
    actions.push({
      tone: 'success',
      title: 'รักษาวินัยเดิมและเพิ่มเป้าหมาย',
      detail: 'สถานะเดือนนี้คุมได้ดี ลองเพิ่มเป้าออมหรือย้ายเงินส่วนเกินไปลงทุนตามแผน',
    });
  }

  return actions.slice(0, 4);
};

export const Reports = () => {
  const { transactions, wallets, budgets, recurringTxs, currency } = useFinance();
  const [monthKey, setMonthKey] = useState(() => getMonthKey());
  const categoryChart = useChartSize(300);

  const report = useMemo(() => buildMonthlyFinanceReport({
    transactions,
    wallets,
    budgets,
    recurringTxs,
    monthKey,
  }), [budgets, monthKey, recurringTxs, transactions, wallets]);

  const actionPlan = useMemo(() => getActionPlan(report, currency), [currency, report]);
  const totalBudget = report.budgetUsage.reduce((sum, budget) => sum + budget.limit, 0);
  const totalBudgetSpent = report.budgetUsage.reduce((sum, budget) => sum + budget.spent, 0);

  const handleExport = () => {
    const rows = [
      ['รายงาน Money Nitro ประจำเดือน', report.monthLabel],
      [],
      ['ตัวชี้วัด', 'ค่า'],
      ['คะแนนสุขภาพ', `${report.healthScore}/100`],
      ['รายรับ', report.income],
      ['รายจ่าย', report.expense],
      ['เงินออม', report.saving],
      ['กระแสเงินสดสุทธิ', report.netCashflow],
      ['อัตราออม', `${report.savingRate.toFixed(2)}%`],
      ['คาดการณ์รายจ่าย', report.projectedExpense],
      ['ยอดเงินรวม', report.totalBalance],
      ['เงินสำรองครอบคลุม (เดือน)', report.runwayMonths.toFixed(2)],
      [],
      ['หมวดรายจ่ายสูงสุด'],
      ['หมวดหมู่', 'จำนวน'],
      ...report.topCategories.map((category) => [category.name, category.amount]),
      [],
      ['การใช้งบประมาณ'],
      ['หมวดหมู่', 'งบ', 'ใช้ไป', 'เหลือ', 'ความคืบหน้า', 'สถานะ'],
      ...report.budgetUsage.map((budget) => [
        budget.label,
        budget.limit,
        budget.spent,
        budget.remaining,
        `${budget.progress.toFixed(2)}%`,
        budget.status,
      ]),
      [],
      ['ยอดเงินในกระเป๋า'],
      ['กระเป๋าเงิน', 'ยอดเงิน'],
      ...report.walletBalances.map((wallet) => [wallet.name, wallet.balance]),
    ];

    downloadCsv(`family_finance_report_${report.monthKey}.csv`, rows);
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider font-bold text-blue-400 mb-2">ปัญญาการเงิน</p>
          <h1 className="text-2xl font-extrabold text-[color:var(--text-primary)]">รายงานและสุขภาพการเงิน</h1>
          <p className="text-[color:var(--text-secondary)] text-sm mt-1">อ่านภาพรวมทั้งเดือน พร้อมสัญญาณเตือนและแผนลงมือทำ</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-secondary)]">
            <Calendar size={16} />
            <input
              type="month"
              value={monthKey}
              onChange={(event) => setMonthKey(event.target.value)}
              className="bg-transparent text-[color:var(--text-primary)] outline-none"
            />
          </label>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download size={16} />
            Export CSV
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-secondary)]">คะแนนสุขภาพ</p>
              <p className="text-3xl font-black text-[color:var(--text-primary)] mt-1">{report.healthScore}/100</p>
            </div>
            <ShieldCheck size={30} className="text-blue-400" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-secondary)]">กระแสเงินสดสุทธิ</p>
              <p className={`text-2xl font-black mt-1 ${report.netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatMoney(report.netCashflow, currency)}</p>
            </div>
            {report.netCashflow >= 0 ? <TrendingUp size={28} className="text-emerald-400" /> : <TrendingDown size={28} className="text-rose-400" />}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-secondary)]">อัตราออม</p>
              <p className="text-2xl font-black text-[color:var(--text-primary)] mt-1">{report.savingRate.toFixed(1)}%</p>
            </div>
            <PiggyBank size={28} className="text-violet-400" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-secondary)]">เงินสำรองครอบคลุม</p>
              <p className="text-2xl font-black text-[color:var(--text-primary)] mt-1">{report.runwayMonths.toFixed(1)} เดือน</p>
            </div>
            <Wallet size={28} className="text-cyan-400" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-[color:var(--text-primary)]">หมวดรายจ่ายที่ใช้มากที่สุด</h2>
              <p className="text-xs text-[color:var(--text-secondary)] mt-1">ไม่รวมรายการโอนเงินระหว่างกระเป๋า</p>
            </div>
            <PieChart size={22} className="text-blue-400" />
          </div>
          <div ref={categoryChart.ref} className="h-[300px] w-full">
            {report.topCategories.length > 0 && categoryChart.isReady ? (
              <BarChart width={categoryChart.width} height={categoryChart.height} data={report.topCategories.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 20, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={96} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }}
                  formatter={(value) => formatMoney(value, currency)}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={22}>
                  {report.topCategories.slice(0, 8).map((entry) => (
                    <Cell key={entry.categoryId} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[color:var(--text-muted)]">ยังไม่มีรายจ่ายในเดือนนี้</div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-4">สรุปเดือนนี้</h2>
          <div className="space-y-3">
            {[
              ['รายรับ', report.income, 'text-emerald-400'],
              ['รายจ่าย', report.expense, 'text-rose-400'],
              ['เงินออม', report.saving, 'text-blue-400'],
              ['คาดการณ์รายจ่ายสิ้นเดือน', report.projectedExpense, 'text-amber-400'],
              ['ยอดเงินรวมทุกกระเป๋า', report.totalBalance, 'text-[color:var(--text-primary)]'],
            ].map(([label, value, className]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-[color:var(--border-color)] pb-3 last:border-0">
                <span className="text-sm text-[color:var(--text-secondary)]">{label}</span>
                <span className={`text-sm font-black ${className}`}>{formatMoney(value, currency)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
            <p className="text-xs text-[color:var(--text-secondary)]">ใช้จ่ายเทียบกับงบรวม</p>
            <div className="mt-3 h-3 rounded-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] overflow-hidden">
              <div
                className={`h-full ${totalBudgetSpent > totalBudget && totalBudget > 0 ? 'bg-rose-500' : 'bg-blue-500'}`}
                style={{ width: `${totalBudget > 0 ? Math.min((totalBudgetSpent / totalBudget) * 100, 100) : 0}%` }}
              />
            </div>
            <p className="text-xs text-[color:var(--text-muted)] mt-2">{formatMoney(totalBudgetSpent, currency)} / {formatMoney(totalBudget, currency)}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-4">แผนลงมือ</h2>
          <div className="space-y-3">
            {actionPlan.map((action) => (
              <div key={action.title} className={`rounded-xl border p-4 ${toneClass[action.tone] || toneClass.warning}`}>
                <h3 className="text-sm font-bold">{action.title}</h3>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{action.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-4">ความเสี่ยงงบประมาณ</h2>
          <div className="space-y-3">
            {report.budgetUsage.length > 0 ? report.budgetUsage.slice(0, 6).map((budget) => (
              <div key={budget.categoryId} className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[color:var(--text-primary)]">{budget.label}</p>
                    <p className="text-xs text-[color:var(--text-muted)] mt-1">เหลือ {formatMoney(budget.remaining, currency)}</p>
                  </div>
                  {budget.status === 'ok' ? <CheckCircle2 className="text-emerald-400" size={18} /> : <AlertTriangle className={budget.status === 'over' ? 'text-rose-400' : 'text-amber-400'} size={18} />}
                </div>
                <div className="mt-3 h-2 rounded-full bg-[color:var(--bg-primary)] overflow-hidden">
                  <div
                    className={budget.status === 'over' ? 'h-full bg-rose-500' : budget.status === 'warning' ? 'h-full bg-amber-500' : 'h-full bg-emerald-500'}
                    style={{ width: `${Math.min(budget.progress, 100)}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-sm text-[color:var(--text-muted)]">ยังไม่ได้ตั้งงบประมาณ</div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-4">กระเป๋าเงินและบิลประจำ</h2>
          <div className="space-y-3">
            {report.walletBalances.map((wallet) => (
              <div key={wallet.id} className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-8 rounded-full" style={{ backgroundColor: wallet.color }} />
                  <span className="text-sm font-bold text-[color:var(--text-primary)]">{wallet.name}</span>
                </div>
                <span className={`text-sm font-black ${wallet.balance >= 0 ? 'text-[color:var(--text-primary)]' : 'text-rose-400'}`}>{formatMoney(wallet.balance, currency)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-[color:var(--border-color)]">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-cyan-400" />
              <h3 className="text-sm font-bold text-[color:var(--text-primary)]">บิลประจำที่ยังไม่บันทึกเดือนนี้</h3>
            </div>
            {report.recurringDueThisMonth.length > 0 ? (
              <div className="space-y-2">
                {report.recurringDueThisMonth.slice(0, 4).map((bill) => (
                  <div key={bill.id} className="flex justify-between gap-3 text-xs text-[color:var(--text-secondary)]">
                    <span className="truncate">วันที่ {bill.dueDay || 1} · {bill.name}</span>
                    <span className={bill.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>{formatMoney(bill.amount, currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[color:var(--text-muted)]">ไม่มีบิลค้างสำหรับเดือนนี้</p>
            )}
          </div>
        </Card>
      </div>
      {/* Category Trend Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">แนวโน้มรายจ่ายตามหมวด (6 เดือน)</h2>
        </div>
        <CategoryTrend transactions={transactions} currency={currency} />
      </Card>
    </div>
  );
};

const CategoryTrend = ({ transactions, currency }) => {
  const trendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = format(d, 'MMM yy', { locale: th });
      const txs = transactions.filter(t => t.type === 'expense' && t.date?.startsWith(key));
      const total = txs.reduce((s, t) => s + t.amount, 0);
      months.push({ key, label, total });
    }
    return months;
  }, [transactions]);

  const maxVal = Math.max(...trendData.map(d => d.total), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 h-40">
        {trendData.map((month) => (
          <div key={month.key} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-[color:var(--text-muted)] font-bold">
              {month.total > 0 ? formatMoney(month.total, currency) : '-'}
            </span>
            <div
              className="w-full bg-blue-500/30 rounded-t-lg transition-all duration-500 hover:bg-blue-500/50"
              style={{ height: `${Math.max((month.total / maxVal) * 100, 4)}%` }}
            />
            <span className="text-[10px] text-[color:var(--text-muted)]">{month.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

