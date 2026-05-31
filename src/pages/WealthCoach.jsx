import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Circle,
  Gauge,
  LineChart,
  PiggyBank,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../utils/constants';
import { buildWealthDecisionSystem, calculateCoachScenario } from '../utils/advisoryEngine';
import { getMonthKey } from '../utils/financeAnalytics';

const COMPLETED_ACTIONS_KEY = 'family_finance_coach_completed_actions';

const toneClass = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  stable: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const loadCompletedActions = () => {
  try {
    const raw = localStorage.getItem(COMPLETED_ACTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[Coach] Failed to load completed actions:', error);
    return [];
  }
};

const saveCompletedActions = (actionIds) => {
  try {
    localStorage.setItem(COMPLETED_ACTIONS_KEY, JSON.stringify(actionIds.slice(-100)));
  } catch (error) {
    console.error('[Coach] Failed to save completed actions:', error);
  }
};

const MetricCard = ({ icon: Icon, label, value, detail, tone = 'info' }) => (
  <Card className={`p-5 border ${toneClass[tone] || toneClass.info}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
        <p className="text-2xl font-black mt-2">{value}</p>
        <p className="text-xs leading-relaxed mt-2 opacity-80">{detail}</p>
      </div>
      <div className="w-10 h-10 rounded-lg bg-white/70 border border-white/80 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
    </div>
  </Card>
);

const ProgressBar = ({ value, color = '#2563eb' }) => (
  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
  </div>
);

const NumberInput = ({ label, value, onChange, suffix }) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">{label}</span>
    <div className="mt-1 flex items-center gap-2 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] px-3 py-2">
      <input
        type="number"
        min="0"
        step="100"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-full bg-transparent text-sm font-bold text-[color:var(--text-primary)] outline-none"
      />
      {suffix && <span className="text-xs text-[color:var(--text-muted)]">{suffix}</span>}
    </div>
  </label>
);

export const WealthCoach = () => {
  const {
    transactions,
    wallets,
    budgets,
    goals,
    recurringTxs,
    currency,
    user,
    syncing,
    portfolioValue,
    activeAlerts,
  } = useFinance();

  const system = useMemo(() => buildWealthDecisionSystem({
    transactions,
    wallets,
    budgets,
    goals,
    recurringTxs,
    portfolioValue,
    monthKey: getMonthKey(),
  }), [budgets, goals, portfolioValue, recurringTxs, transactions, wallets]);

  const [completedActions, setCompletedActions] = useState(() => loadCompletedActions());
  const [scenario, setScenario] = useState(system.defaultScenario);

  useEffect(() => {
    setScenario(system.defaultScenario);
  }, [system.defaultScenario]);

  useEffect(() => {
    saveCompletedActions(completedActions);
  }, [completedActions]);

  const completedSet = useMemo(() => new Set(completedActions), [completedActions]);
  const scenarioOutcome = useMemo(
    () => calculateCoachScenario({ report: system.report, scenario }),
    [scenario, system.report],
  );

  const priorityAlerts = activeAlerts.filter((alert) => ['danger', 'warning'].includes(alert.severity)).slice(0, 3);
  const firstForecastRisk = system.cashflow.forecast.find((item) => item.risk !== 'stable') || system.cashflow.forecast[0];
  const completionRate = system.nextActions.length > 0
    ? (system.nextActions.filter((action) => completedSet.has(action.id)).length / system.nextActions.length) * 100
    : 100;

  const toggleAction = (actionId) => {
    setCompletedActions((prev) => (
      prev.includes(actionId)
        ? prev.filter((id) => id !== actionId)
        : [...prev, actionId]
    ));
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-600 font-black">AI Wealth Coach</p>
          <h1 className="text-3xl font-black text-[color:var(--text-primary)] mt-1">ศูนย์ตัดสินใจการเงิน</h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-2 max-w-3xl">
            หน้านี้ไม่ใช่ dashboard เฉย ๆ แล้ว แต่เป็นระบบเลือกงานที่ควรทำก่อน, พยากรณ์เงินสด, จำลองสถานการณ์ และเตือนความเสี่ยงที่กระทบแผนเงินจริง
          </p>
        </div>
        <div className={`px-4 py-3 rounded-lg border text-xs font-bold ${user ? toneClass.success : toneClass.warning}`}>
          {user ? (syncing ? 'กำลัง sync ข้อมูลล่าสุด' : 'Cloud sync พร้อมใช้งาน') : 'ยังไม่ล็อกอิน: ใช้ข้อมูลในเครื่อง'}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          icon={Gauge}
          label="Financial Health"
          value={`${system.report.healthScore}/100`}
          detail={`เป้าหมายเดือนนี้คือทำ checklist ให้ครบ ${completionRate.toFixed(0)}%`}
          tone={system.report.healthScore >= 80 ? 'success' : system.report.healthScore >= 60 ? 'warning' : 'danger'}
        />
        <MetricCard
          icon={Radar}
          label="90-Day Cash Radar"
          value={formatMoney(firstForecastRisk.projectedBalance, currency)}
          detail={system.cashflow.breakEvenDays ? `ถ้าใช้เงินจังหวะเดิม เงินสดอาจหมดใน ${system.cashflow.breakEvenDays} วัน` : 'ยังไม่เห็นจุดเงินสดหมดจาก run-rate ปัจจุบัน'}
          tone={firstForecastRisk.risk}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Emergency Runway"
          value={`${system.report.runwayMonths.toFixed(1)} เดือน`}
          detail={system.runwayGap > 0 ? `ต้องเติมอีก ${formatMoney(system.runwayGap, currency)} เพื่อครบ 6 เดือน` : 'เงินสำรองผ่านกรอบ 6 เดือนแล้ว'}
          tone={system.report.runwayMonths >= 6 ? 'success' : system.report.runwayMonths >= 3 ? 'warning' : 'danger'}
        />
        <MetricCard
          icon={TrendingUp}
          label="Investable Surplus"
          value={formatMoney(Math.max(0, system.report.netCashflow), currency)}
          detail={system.report.runwayMonths >= 3 ? 'สามารถประเมิน DCA ได้เมื่อพอร์ตมี target allocation' : 'ยังควรให้เงินสำรองมาก่อนพอร์ต'}
          tone={system.report.netCashflow > 0 && system.report.runwayMonths >= 3 ? 'success' : 'warning'}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
                <Route size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-[color:var(--text-primary)]">Next Best Action</h2>
                <p className="text-xs text-[color:var(--text-secondary)]">เรียงจาก impact, urgency และ effort ไม่ใช่เรียงตามความสวยของกราฟ</p>
              </div>
            </div>
            <div className="min-w-[160px]">
              <div className="flex items-center justify-between text-[10px] font-black text-[color:var(--text-muted)] mb-1">
                <span>Action completion</span>
                <span>{completionRate.toFixed(0)}%</span>
              </div>
              <ProgressBar value={completionRate} color="#2563eb" />
            </div>
          </div>

          <div className="space-y-3">
            {system.nextActions.map((action, index) => {
              const done = completedSet.has(action.id);
              return (
                <div key={action.id} className={`rounded-lg border p-4 transition-all ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-[color:var(--bg-secondary)] border-[color:var(--border-color)]'}`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleAction(action.id)}
                      className="flex items-start gap-3 text-left"
                    >
                      <span className={`mt-0.5 ${done ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                      </span>
                      <span>
                        <span className="text-[10px] font-black uppercase text-blue-600">Priority {index + 1} · due {action.due}</span>
                        <span className={`block text-sm font-black ${done ? 'text-emerald-800 line-through' : 'text-[color:var(--text-primary)]'}`}>
                          {action.title}
                        </span>
                        <span className="block text-xs text-[color:var(--text-secondary)] mt-1 leading-relaxed">{action.detail}</span>
                      </span>
                    </button>
                    <div className="flex md:flex-col items-end gap-2 shrink-0">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${toneClass[action.tone] || toneClass.info}`}>
                        {action.metric}
                      </span>
                      <Button size="sm" variant="secondary" onClick={() => window.location.assign(action.route)}>
                        เปิดหน้า <ArrowRight size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
              <BellRing size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Alert Queue</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">ความเสี่ยงที่ต้องดูวันนี้</p>
            </div>
          </div>
          <div className="space-y-3">
            {priorityAlerts.length > 0 ? priorityAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-lg border p-3 ${toneClass[alert.severity] || toneClass.info}`}>
                <p className="text-sm font-black">{alert.title}</p>
                <p className="text-xs mt-1 leading-relaxed opacity-85">{alert.message}</p>
              </div>
            )) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                <CheckCircle2 size={18} />
                <p className="text-sm font-black mt-2">ไม่มี alert เสี่ยงสูงตอนนี้</p>
                <p className="text-xs mt-1 opacity-80">ให้ทำ action plan ต่อแทนการเช็คกราฟซ้ำ</p>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Scenario Simulator</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">ลองเปลี่ยนรายรับ รายจ่าย รายจ่ายก้อนใหญ่ และ DCA เพื่อดูผลต่อเงินสดทันที</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <NumberInput label="รายรับเพิ่ม/เดือน" value={scenario.incomeChange} suffix={currency} onChange={(value) => setScenario((prev) => ({ ...prev, incomeChange: value }))} />
            <NumberInput label="ลดรายจ่าย/เดือน" value={scenario.expenseCut} suffix={currency} onChange={(value) => setScenario((prev) => ({ ...prev, expenseCut: value }))} />
            <NumberInput label="รายจ่ายก้อนเดียว" value={scenario.oneTimeExpense} suffix={currency} onChange={(value) => setScenario((prev) => ({ ...prev, oneTimeExpense: value }))} />
            <NumberInput label="DCA/เดือน" value={scenario.monthlyInvestment} suffix={currency} onChange={(value) => setScenario((prev) => ({ ...prev, monthlyInvestment: value }))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <div className="rounded-lg border border-[color:var(--border-color)] bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">Monthly cash impact</p>
              <p className={`text-lg font-black mt-1 ${scenarioOutcome.monthlyCashImpact >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatMoney(scenarioOutcome.monthlyCashImpact, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-[color:var(--border-color)] bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">30-day balance</p>
              <p className={`text-lg font-black mt-1 ${scenarioOutcome.projectedBalance30 >= 0 ? 'text-slate-900' : 'text-rose-700'}`}>
                {formatMoney(scenarioOutcome.projectedBalance30, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-[color:var(--border-color)] bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">Runway</p>
              <p className="text-lg font-black text-slate-900 mt-1">{scenarioOutcome.runwayMonths.toFixed(1)} เดือน</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-blue-800">
              <p className="text-[10px] font-black uppercase opacity-70">Decision</p>
              <p className="text-xs font-bold mt-1 leading-relaxed">{scenarioOutcome.recommendation}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <CalendarClock className="text-blue-700" size={22} />
            <h2 className="text-lg font-black text-[color:var(--text-primary)]">Bill Calendar</h2>
          </div>
          <div className="space-y-2">
            {system.cashflow.billCalendar.length > 0 ? system.cashflow.billCalendar.map((bill) => (
              <div key={`${bill.id}-${bill.dueDate}`} className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] p-3">
                <div>
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">{bill.name}</p>
                  <p className="text-[10px] text-[color:var(--text-muted)]">{bill.dueDate} · อีก {bill.daysLeft} วัน</p>
                </div>
                <span className={bill.type === 'expense' ? 'text-rose-700 text-xs font-black' : 'text-emerald-700 text-xs font-black'}>
                  {bill.type === 'expense' ? '-' : '+'}{formatMoney(bill.amount, currency)}
                </span>
              </div>
            )) : (
              <p className="text-sm text-[color:var(--text-muted)]">ยังไม่มีรายการประจำให้พยากรณ์</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <LineChart className="text-cyan-700" size={22} />
            <h2 className="text-lg font-black text-[color:var(--text-primary)]">Cashflow Forecast</h2>
          </div>
          <div className="space-y-3">
            {system.cashflow.forecast.map((item) => (
              <div key={item.days} className={`rounded-lg border p-4 ${toneClass[item.risk] || toneClass.info}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black">{item.days} วัน</p>
                  <p className="text-sm font-black">{formatMoney(item.projectedBalance, currency)}</p>
                </div>
                <p className="text-xs mt-1 opacity-80">runway ประมาณ {item.runwayMonths.toFixed(1)} เดือน ณ {item.date}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <Target className="text-violet-700" size={22} />
            <h2 className="text-lg font-black text-[color:var(--text-primary)]">Goal Feasibility</h2>
          </div>
          <div className="space-y-3">
            {system.goalPlans.length > 0 ? system.goalPlans.slice(0, 4).map((goal) => (
              <div key={goal.id} className="rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[color:var(--text-primary)]">{goal.name}</p>
                    <p className="text-xs text-[color:var(--text-secondary)] mt-1">
                      ต้องเติม {formatMoney(goal.requiredMonthly, currency)}/เดือน {goal.monthsLeft ? `อีก ${goal.monthsLeft} เดือน` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${goal.status === 'done' ? toneClass.success : goal.status === 'at-risk' ? toneClass.warning : toneClass.info}`}>
                    {goal.status}
                  </span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={goal.progress} color={goal.color || '#2563eb'} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-[color:var(--text-muted)]">ยังไม่มี goal ให้ Coach ตรวจความเป็นไปได้</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <PiggyBank className="text-emerald-700" size={22} />
            <h2 className="text-lg font-black text-[color:var(--text-primary)]">Behavior Coach</h2>
          </div>
          <div className="space-y-3">
            {system.behaviorInsights.map((insight) => (
              <div key={insight.id} className={`rounded-lg border p-4 ${toneClass[insight.tone] || toneClass.info}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{insight.title}</p>
                    <p className="text-xs leading-relaxed mt-1 opacity-85">{insight.detail}</p>
                  </div>
                  <AlertTriangle size={16} className="shrink-0 opacity-70" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
};
