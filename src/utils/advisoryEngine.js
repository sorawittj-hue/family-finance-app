import { addDays, differenceInCalendarDays, format, getDaysInMonth, parseISO, subMonths } from 'date-fns';
import { buildMonthlyFinanceReport, buildWealthOperatingSystem, getMonthKey, isTransferTransaction } from './financeAnalytics';
import { getCategory } from './constants';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) => Math.round(toNumber(value));

const buildAction = ({ id, title, detail, route, metric, impact = 0, urgency = 3, effort = 2, tone = 'info', due = '7 วัน' }) => ({
  id,
  title,
  detail,
  route,
  metric,
  impact: roundMoney(impact),
  urgency: clamp(toNumber(urgency, 3), 1, 5),
  effort: clamp(toNumber(effort, 2), 1, 5),
  tone,
  due,
  score: (Math.log10(Math.max(impact, 1)) * 24) + (urgency * 18) - (effort * 7),
});

const getExpenseByCategory = (transactions, monthKey) => (
  transactions
    .filter((transaction) => (
      transaction.type === 'expense'
      && transaction.date?.startsWith(monthKey)
      && !isTransferTransaction(transaction)
    ))
    .reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + toNumber(transaction.amount);
      return acc;
    }, {})
);

const getNextDueDate = (dueDay, now = new Date()) => {
  const safeDay = clamp(toNumber(dueDay, 1), 1, 28);
  const candidate = new Date(now.getFullYear(), now.getMonth(), safeDay);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (candidate < today) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate;
};

export const DEFAULT_COACH_SCENARIO = {
  incomeChange: 0,
  expenseCut: 0,
  oneTimeExpense: 0,
  monthlyInvestment: 0,
};

export const buildGoalPlans = ({ goals = [], report, now = new Date() }) => (
  goals
    .map((goal) => {
      const targetAmount = toNumber(goal.targetAmount);
      const currentAmount = toNumber(goal.currentAmount);
      const gap = Math.max(0, targetAmount - currentAmount);
      const targetDate = goal.targetDate ? parseISO(goal.targetDate) : null;
      const daysLeft = targetDate ? Math.max(0, differenceInCalendarDays(targetDate, now)) : null;
      const monthsLeft = daysLeft === null ? null : Math.max(1, Math.ceil(daysLeft / 30));
      const requiredMonthly = monthsLeft ? gap / monthsLeft : gap;
      const feasible = gap === 0 || (report.netCashflow > 0 && requiredMonthly <= report.netCashflow * 0.75);

      return {
        id: goal.id,
        name: goal.name,
        color: goal.color,
        targetAmount,
        currentAmount,
        gap,
        progress: targetAmount > 0 ? clamp((currentAmount / targetAmount) * 100, 0, 100) : 0,
        targetDate: goal.targetDate || '',
        daysLeft,
        monthsLeft,
        requiredMonthly,
        status: gap === 0 ? 'done' : feasible ? 'on-track' : 'at-risk',
      };
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'at-risk' ? -1 : 1;
      return b.gap - a.gap;
    })
);

export const buildCashflowForecast = ({ report, recurringTxs = [], now = new Date(), horizons = [30, 60, 90] }) => {
  const daysInMonth = getDaysInMonth(now);
  const projectedMonthlyExpense = Math.max(report.expense, report.projectedExpense || 0);
  const projectedNetCashflow = report.income - projectedMonthlyExpense - report.saving;
  const dailyNet = projectedNetCashflow / Math.max(1, daysInMonth);
  const breakEvenDays = dailyNet < 0 && report.endingBalance > 0
    ? Math.floor(report.endingBalance / Math.abs(dailyNet))
    : null;

  const forecast = horizons.map((days) => {
    const projectedBalance = report.endingBalance + (dailyNet * days);
    const runwayMonths = projectedMonthlyExpense > 0 ? projectedBalance / projectedMonthlyExpense : 99;
    const risk = projectedBalance < 0 ? 'danger' : runwayMonths < 1 ? 'warning' : 'stable';
    return {
      days,
      date: format(addDays(now, days), 'yyyy-MM-dd'),
      projectedBalance,
      runwayMonths,
      risk,
    };
  });

  const billCalendar = recurringTxs
    .map((bill) => {
      const dueDate = getNextDueDate(bill.dueDay, now);
      return {
        id: bill.id,
        name: bill.name,
        type: bill.type,
        amount: toNumber(bill.amount),
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        daysLeft: differenceInCalendarDays(dueDate, now),
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);

  return {
    forecast,
    billCalendar,
    projectedMonthlyExpense,
    projectedNetCashflow,
    dailyNet,
    breakEvenDays,
  };
};

export const buildBehaviorInsights = ({ transactions = [], report, previousReport, monthKey }) => {
  const currentExpenses = getExpenseByCategory(transactions, monthKey);
  const previousExpenses = getExpenseByCategory(transactions, previousReport.monthKey);
  const insights = [];

  const topExpense = Object.entries(currentExpenses).sort((a, b) => b[1] - a[1])[0];
  if (topExpense) {
    const [categoryId, amount] = topExpense;
    const category = getCategory('expense', categoryId);
    const incomeShare = report.income > 0 ? (amount / report.income) * 100 : 0;
    insights.push({
      id: `top-expense-${categoryId}`,
      title: `${category.label} กินกระแสเงินสดมากที่สุด`,
      detail: `เดือนนี้ใช้ ${incomeShare.toFixed(0)}% ของรายรับกับหมวดนี้`,
      tone: incomeShare > 25 ? 'warning' : 'info',
      metric: amount,
    });
  }

  Object.entries(currentExpenses).forEach(([categoryId, amount]) => {
    const previous = previousExpenses[categoryId] || 0;
    if (previous <= 0 || amount <= previous * 1.25) return;
    const category = getCategory('expense', categoryId);
    insights.push({
      id: `growth-${categoryId}`,
      title: `${category.label} โตเร็วกว่าปกติ`,
      detail: `สูงกว่าเดือนก่อน ${(((amount - previous) / previous) * 100).toFixed(0)}% ต้องหาสาเหตุ`,
      tone: 'warning',
      metric: amount - previous,
    });
  });

  if (report.spendingRate > 75) {
    insights.push({
      id: 'spending-rate',
      title: 'รายจ่ายกินรายรับเกิน 75%',
      detail: 'พื้นที่สำหรับออมและลงทุนเริ่มบาง ต้องลด fixed cost หรือเพิ่มรายรับ',
      tone: 'danger',
      metric: report.expense,
    });
  }

  if (report.debtRatio >= 25) {
    insights.push({
      id: 'debt-ratio',
      title: 'ภาระหนี้เริ่มเบียดแผนลงทุน',
      detail: `หนี้อยู่ที่ ${report.debtRatio.toFixed(0)}% ของรายรับ ให้จัดลำดับชำระดอกสูงก่อน`,
      tone: report.debtRatio >= 35 ? 'danger' : 'warning',
      metric: report.debtExpense,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'behavior-stable',
      title: 'พฤติกรรมใช้เงินยังควบคุมได้',
      detail: 'เดือนนี้ยังไม่พบสัญญาณรั่วแรง ให้รักษาจังหวะออมและรีวิวรายจ่ายประจำ',
      tone: 'success',
      metric: report.netCashflow,
    });
  }

  return insights.slice(0, 5);
};

export const buildNextBestActions = ({ system, goalPlans, portfolioValue = 0 }) => {
  const { report } = system;
  const actions = [];

  if (report.endingBalance < 0) {
    actions.push(buildAction({
      id: 'fix-negative-cashflow',
      title: 'หยุดรายจ่ายไม่จำเป็นทันที',
      detail: `ยอดหลังรวมเงินยกมาติดลบ ${Math.abs(report.endingBalance).toFixed(0)} ต้องปิด gap ก่อนทำอย่างอื่น`,
      route: '/transactions',
      metric: 'Cashflow first',
      impact: Math.abs(report.endingBalance),
      urgency: 5,
      effort: 2,
      tone: 'danger',
      due: 'วันนี้',
    }));
  }

  system.budgetLeaks.forEach((leak, index) => {
    actions.push(buildAction({
      id: `budget-leak-${index}`,
      title: leak.title,
      detail: leak.detail,
      route: '/budgets',
      metric: 'Budget leak',
      impact: leak.impact,
      urgency: index === 0 ? 5 : 4,
      effort: 2,
      tone: 'warning',
      due: '3 วัน',
    }));
  });

  if (system.runwayGap > 0) {
    actions.push(buildAction({
      id: 'build-emergency-runway',
      title: 'เติมเงินสำรองก่อนเพิ่มความเสี่ยง',
      detail: `ยังขาด ${system.runwayGap.toFixed(0)} เพื่อให้ครอบคลุมรายจ่าย 6 เดือน`,
      route: '/goals',
      metric: `${report.runwayMonths.toFixed(1)} เดือน`,
      impact: system.runwayGap,
      urgency: report.runwayMonths < 3 ? 5 : 3,
      effort: 3,
      tone: report.runwayMonths < 3 ? 'danger' : 'warning',
      due: 'เดือนนี้',
    }));
  }

  if (system.currentSavingGap > 0) {
    actions.push(buildAction({
      id: 'increase-saving-rate',
      title: 'ย้ายเงินไปออมก่อนใช้',
      detail: `ต้องกันเพิ่ม ${system.currentSavingGap.toFixed(0)} เพื่อแตะอัตราออมเป้าหมาย`,
      route: '/transactions',
      metric: 'Pay yourself first',
      impact: system.currentSavingGap * 12,
      urgency: 4,
      effort: 2,
      tone: 'warning',
      due: 'รอบเงินเดือนนี้',
    }));
  }

  if (system.recurringExpense > report.income * 0.12 && report.income > 0) {
    actions.push(buildAction({
      id: 'audit-recurring',
      title: 'ตรวจรายจ่ายประจำทั้งหมด',
      detail: `fixed/recurring cost อยู่ที่ ${((system.recurringExpense / report.income) * 100).toFixed(0)}% ของรายรับ`,
      route: '/settings',
      metric: 'Recurring audit',
      impact: system.recurringExpense * 0.15 * 12,
      urgency: 3,
      effort: 3,
      tone: 'warning',
      due: 'สัปดาห์นี้',
    }));
  }

  const atRiskGoal = goalPlans.find((goal) => goal.status === 'at-risk');
  if (atRiskGoal) {
    actions.push(buildAction({
      id: `goal-${atRiskGoal.id}`,
      title: `ปรับแผนเป้าหมาย: ${atRiskGoal.name}`,
      detail: `ต้องเติม ${atRiskGoal.requiredMonthly.toFixed(0)} ต่อเดือน จึงจะทันกำหนด`,
      route: '/goals',
      metric: 'Goal at risk',
      impact: atRiskGoal.gap,
      urgency: atRiskGoal.daysLeft !== null && atRiskGoal.daysLeft < 90 ? 5 : 3,
      effort: 3,
      tone: 'warning',
      due: '7 วัน',
    }));
  }

  if (report.netCashflow > 0 && report.runwayMonths >= 3) {
    const suggestedDca = Math.max(0, Math.min(report.netCashflow * 0.35, report.totalBalance * 0.03));
    if (suggestedDca > 0) {
      actions.push(buildAction({
        id: 'deploy-surplus',
        title: 'ตั้ง DCA จาก surplus ที่ปลอดภัย',
        detail: portfolioValue > 0
          ? 'กระแสเงินสดและ runway พอเริ่มเพิ่มพอร์ตแบบมีกรอบได้'
          : 'เริ่มสร้างพอร์ตด้วย DCA เล็กและชัดเจนก่อน',
        route: '/portfolio',
        metric: `${suggestedDca.toFixed(0)}/เดือน`,
        impact: suggestedDca * 12,
        urgency: 2,
        effort: 2,
        tone: 'success',
        due: 'เดือนนี้',
      }));
    }
  }

  return actions
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
};

export const calculateCoachScenario = ({ report, scenario = DEFAULT_COACH_SCENARIO }) => {
  const incomeChange = toNumber(scenario.incomeChange);
  const expenseCut = toNumber(scenario.expenseCut);
  const oneTimeExpense = toNumber(scenario.oneTimeExpense);
  const monthlyInvestment = toNumber(scenario.monthlyInvestment);
  const monthlyCashImpact = incomeChange + expenseCut - monthlyInvestment;
  const projectedBalance30 = report.endingBalance + monthlyCashImpact - oneTimeExpense;
  const adjustedExpense = Math.max(0, report.expense - expenseCut);
  const runwayMonths = adjustedExpense > 0 ? projectedBalance30 / adjustedExpense : 99;
  const annualWealthImpact = ((incomeChange + expenseCut + monthlyInvestment) * 12) - oneTimeExpense;
  const recommendation = projectedBalance30 < 0
    ? 'ยังไม่ควรลงทุนเพิ่ม ให้แก้ cashflow ก่อน'
    : runwayMonths < 3
      ? 'ควรเติมเงินสำรองก่อนเพิ่มความเสี่ยง'
      : monthlyInvestment > 0
        ? 'แผนนี้ลงทุนได้ แต่ต้องผูกกับ target allocation'
        : 'แผนนี้ช่วยเพิ่มความปลอดภัยของเงินสด';

  return {
    monthlyCashImpact,
    projectedBalance30,
    runwayMonths,
    annualWealthImpact,
    recommendation,
  };
};

export const buildWealthDecisionSystem = ({
  transactions = [],
  wallets = [],
  budgets = {},
  goals = [],
  recurringTxs = [],
  portfolioValue = 0,
  monthKey = getMonthKey(),
  now = new Date(),
}) => {
  const base = buildWealthOperatingSystem({ transactions, wallets, budgets, goals, recurringTxs, monthKey });
  const previousMonthKey = getMonthKey(subMonths(parseISO(`${monthKey}-01`), 1));
  const previousReport = buildMonthlyFinanceReport({ transactions, wallets, budgets, recurringTxs, monthKey: previousMonthKey });
  const goalPlans = buildGoalPlans({ goals, report: base.report, now });
  const cashflow = buildCashflowForecast({ report: base.report, recurringTxs, now });
  const behaviorInsights = buildBehaviorInsights({
    transactions,
    report: base.report,
    previousReport,
    monthKey,
  });
  const nextActions = buildNextBestActions({ system: base, goalPlans, portfolioValue });
  const defaultScenario = {
    incomeChange: Math.round(base.report.income * 0.05),
    expenseCut: Math.round(base.report.expense * 0.1),
    oneTimeExpense: 0,
    monthlyInvestment: Math.round(Math.max(0, base.report.netCashflow) * 0.25),
  };

  return {
    ...base,
    previousReport,
    goalPlans,
    cashflow,
    behaviorInsights,
    nextActions,
    defaultScenario,
    defaultScenarioOutcome: calculateCoachScenario({ report: base.report, scenario: defaultScenario }),
  };
};
