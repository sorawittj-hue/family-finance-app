import { addDays, differenceInCalendarDays, format, isSameMonth, parseISO, subMonths } from 'date-fns';
import { buildMonthlyFinanceReport, getMonthKey, isTransferTransaction } from './financeAnalytics';
import { getCategory } from './constants';

export const DEFAULT_ALERT_SETTINGS = {
  enabled: true,
  proactiveAiEnabled: true,
  browserNotificationsEnabled: false,
  budgetWarningPercent: 80,
  budgetDangerPercent: 100,
  cashLowAmount: 5000,
  billDueDays: 3,
  largeExpenseAmount: 5000,
  expenseGrowthPercent: 25,
  healthScoreWarning: 70,
};

const SEVERITY_RANK = {
  danger: 3,
  warning: 2,
  info: 1,
  success: 0,
};

const clampPercent = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(999, Math.max(0, parsed));
};

const normalizeAmount = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
};

const normalizeSettings = (settings = {}) => ({
  ...DEFAULT_ALERT_SETTINGS,
  ...settings,
  budgetWarningPercent: clampPercent(settings.budgetWarningPercent, DEFAULT_ALERT_SETTINGS.budgetWarningPercent),
  budgetDangerPercent: clampPercent(settings.budgetDangerPercent, DEFAULT_ALERT_SETTINGS.budgetDangerPercent),
  cashLowAmount: normalizeAmount(settings.cashLowAmount, DEFAULT_ALERT_SETTINGS.cashLowAmount),
  billDueDays: normalizeAmount(settings.billDueDays, DEFAULT_ALERT_SETTINGS.billDueDays),
  largeExpenseAmount: normalizeAmount(settings.largeExpenseAmount, DEFAULT_ALERT_SETTINGS.largeExpenseAmount),
  expenseGrowthPercent: clampPercent(settings.expenseGrowthPercent, DEFAULT_ALERT_SETTINGS.expenseGrowthPercent),
  healthScoreWarning: clampPercent(settings.healthScoreWarning, DEFAULT_ALERT_SETTINGS.healthScoreWarning),
});

const createAlert = ({ id, severity, category, title, message, route = '/', metadata = {} }) => ({
  id,
  severity,
  category,
  title,
  message,
  route,
  metadata,
  createdAt: new Date().toISOString(),
});

const getMonthTransactions = (transactions, monthDate) => (
  transactions.filter((tx) => {
    if (!tx?.date || isTransferTransaction(tx)) return false;
    const parsed = parseISO(tx.date);
    return isSameMonth(parsed, monthDate);
  })
);

const sumExpense = (transactions) => (
  transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
);

const buildBudgetAlerts = ({ alerts, transactions, budgets, settings, now }) => {
  Object.entries(budgets || {}).forEach(([categoryId, limit]) => {
    const budgetLimit = Number(limit) || 0;
    if (budgetLimit <= 0) return;

    const spent = transactions
      .filter((tx) => tx.type === 'expense' && tx.category === categoryId && tx.date && isSameMonth(parseISO(tx.date), now))
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const progress = (spent / budgetLimit) * 100;
    const category = getCategory('expense', categoryId);

    if (progress >= settings.budgetDangerPercent) {
      alerts.push(createAlert({
        id: `budget-over-${getMonthKey(now)}-${categoryId}`,
        severity: 'danger',
        category: 'budget',
        title: `งบ ${category.label} เกินแล้ว`,
        message: `ใช้ไป ${progress.toFixed(0)}% ของงบเดือนนี้ ควรหยุดรายจ่ายหมวดนี้หรือโยกงบจากหมวดที่เหลือ`,
        route: '/budgets',
        metadata: { categoryId, spent, budgetLimit, progress },
      }));
      return;
    }

    if (progress >= settings.budgetWarningPercent) {
      alerts.push(createAlert({
        id: `budget-warning-${getMonthKey(now)}-${categoryId}`,
        severity: 'warning',
        category: 'budget',
        title: `งบ ${category.label} ใกล้เต็ม`,
        message: `ใช้ไป ${progress.toFixed(0)}% ของงบแล้ว เหลือ ${Math.max(0, budgetLimit - spent).toFixed(0)} สำหรับเดือนนี้`,
        route: '/budgets',
        metadata: { categoryId, spent, budgetLimit, progress },
      }));
    }
  });
};

const buildBillAlerts = ({ alerts, recurringTxs, settings, now }) => {
  const dueWindowEnd = addDays(now, settings.billDueDays);
  recurringTxs.forEach((bill) => {
    const dueDay = Number(bill.dueDay);
    if (!Number.isFinite(dueDay)) return;

    const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(28, Math.max(1, dueDay)));
    if (dueDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    if (dueDate > dueWindowEnd) return;

    const daysLeft = differenceInCalendarDays(dueDate, now);
    alerts.push(createAlert({
      id: `bill-due-${bill.id}-${format(dueDate, 'yyyy-MM-dd')}`,
      severity: daysLeft <= 1 ? 'warning' : 'info',
      category: 'recurring',
      title: `${bill.name} ใกล้ครบกำหนด`,
      message: daysLeft <= 0
        ? `ครบกำหนดวันนี้ จำนวน ${Number(bill.amount || 0).toFixed(0)}`
        : `เหลือ ${daysLeft} วัน จำนวน ${Number(bill.amount || 0).toFixed(0)}`,
      route: '/settings',
      metadata: { billId: bill.id, dueDate: format(dueDate, 'yyyy-MM-dd'), amount: Number(bill.amount || 0) },
    }));
  });
};

const buildCashflowAlerts = ({ alerts, report, settings, monthKey }) => {
  if (report.totalBalance <= settings.cashLowAmount) {
    alerts.push(createAlert({
      id: `cash-low-${monthKey}`,
      severity: 'warning',
      category: 'cashflow',
      title: 'เงินสด/บัญชีต่ำกว่าระดับที่ตั้งไว้',
      message: `ยอดเงินสดและบัญชีรวมเหลือ ${report.totalBalance.toFixed(0)} ควรชะลอรายจ่ายไม่จำเป็นหรือเติมเงินสำรอง`,
      route: '/',
      metadata: { totalBalance: report.totalBalance },
    }));
  }

  if (report.endingBalance < 0) {
    alerts.push(createAlert({
      id: `negative-balance-${monthKey}`,
      severity: 'danger',
      category: 'cashflow',
      title: 'เงินคงเหลือหลังรวมยอดยกมาติดลบ',
      message: `ยอดหลังใช้จ่ายเดือนนี้ติดลบ ${Math.abs(report.endingBalance).toFixed(0)} ควรลดรายจ่ายหรือเลื่อนค่าใช้จ่ายที่ไม่จำเป็น`,
      route: '/reports',
      metadata: { endingBalance: report.endingBalance, netCashflow: report.netCashflow },
    }));
  } else if (report.netCashflow < 0 && report.openingBalance > 0) {
    alerts.push(createAlert({
      id: `using-carry-over-${monthKey}`,
      severity: 'info',
      category: 'cashflow',
      title: 'เดือนนี้กำลังใช้เงินยกมา',
      message: `สุทธิเดือนนี้ติดลบ ${Math.abs(report.netCashflow).toFixed(0)} แต่ยังมีเงินคงเหลือ ${report.endingBalance.toFixed(0)} หลังรวมยอดยกมา`,
      route: '/reports',
      metadata: {
        openingBalance: report.openingBalance,
        endingBalance: report.endingBalance,
        netCashflow: report.netCashflow,
      },
    }));
  }

  if (report.healthScore < settings.healthScoreWarning) {
    alerts.push(createAlert({
      id: `health-score-${monthKey}`,
      severity: 'warning',
      category: 'health',
      title: 'คะแนนสุขภาพการเงินต่ำกว่าเป้า',
      message: `คะแนนอยู่ที่ ${report.healthScore}/100 โฟกัสงบที่เกินและเงินสำรองฉุกเฉินก่อน`,
      route: '/wealth',
      metadata: { healthScore: report.healthScore },
    }));
  }
};

const buildTrendAlerts = ({ alerts, transactions, settings, now }) => {
  const currentMonthExpense = sumExpense(getMonthTransactions(transactions, now));
  const previousMonth = subMonths(now, 1);
  const previousMonthExpense = sumExpense(getMonthTransactions(transactions, previousMonth));

  if (previousMonthExpense > 0) {
    const growth = ((currentMonthExpense - previousMonthExpense) / previousMonthExpense) * 100;
    if (growth >= settings.expenseGrowthPercent) {
      alerts.push(createAlert({
        id: `expense-growth-${getMonthKey(now)}`,
        severity: 'warning',
        category: 'spending',
        title: 'รายจ่ายเดือนนี้พุ่งขึ้น',
        message: `รายจ่ายสูงกว่าเดือนก่อน ${growth.toFixed(0)}% ตรวจหมวดที่โตเร็วและลดรายการซ้ำซ้อน`,
        route: '/reports',
        metadata: { currentMonthExpense, previousMonthExpense, growth },
      }));
    }
  }
};

const buildLargeExpenseAlerts = ({ alerts, transactions, settings, now }) => {
  const todayKey = format(now, 'yyyy-MM-dd');
  transactions
    .filter((tx) => (
      tx.type === 'expense'
      && !isTransferTransaction(tx)
      && tx.date === todayKey
      && Number(tx.amount) >= settings.largeExpenseAmount
    ))
    .slice(0, 3)
    .forEach((tx) => {
      const category = getCategory('expense', tx.category);
      alerts.push(createAlert({
        id: `large-expense-${tx.id}`,
        severity: 'info',
        category: 'spending',
        title: 'มีรายจ่ายก้อนใหญ่วันนี้',
        message: `${category.label} จำนวน ${Number(tx.amount).toFixed(0)}${tx.note ? `: ${tx.note}` : ''}`,
        route: '/transactions',
        metadata: { transactionId: tx.id, amount: Number(tx.amount) },
      }));
    });
};

export const buildSmartAlerts = ({
  transactions = [],
  wallets = [],
  budgets = {},
  recurringTxs = [],
  portfolioValue = 0,
  settings = DEFAULT_ALERT_SETTINGS,
  now = new Date(),
}) => {
  const normalizedSettings = normalizeSettings(settings);
  if (!normalizedSettings.enabled) return [];

  const alerts = [];
  const monthKey = getMonthKey(now);
  const report = buildMonthlyFinanceReport({
    transactions,
    wallets,
    budgets,
    recurringTxs,
    monthKey,
  });

  buildBudgetAlerts({ alerts, transactions, budgets, settings: normalizedSettings, now });
  buildCashflowAlerts({ alerts, report, settings: normalizedSettings, monthKey });
  buildBillAlerts({ alerts, recurringTxs, settings: normalizedSettings, now });
  buildTrendAlerts({ alerts, transactions, settings: normalizedSettings, now });
  buildLargeExpenseAlerts({ alerts, transactions, settings: normalizedSettings, now });

  if (Number(portfolioValue) === 0) {
    alerts.push(createAlert({
      id: `portfolio-empty-${monthKey}`,
      severity: 'info',
      category: 'portfolio',
      title: 'ยังไม่มีมูลค่าพอร์ตใน Net Worth',
      message: 'เพิ่มสินทรัพย์หรือรีเฟรชพอร์ตเพื่อให้ภาพรวมสินทรัพย์สุทธิครบขึ้น',
      route: '/portfolio',
      metadata: { portfolioValue },
    }));
  }

  return alerts
    .sort((a, b) => {
      const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 20);
};

export const buildAlertBriefText = (alerts = []) => {
  const activeAlerts = alerts.filter((alert) => ['danger', 'warning'].includes(alert.severity)).slice(0, 5);
  if (activeAlerts.length === 0) {
    return 'ตอนนี้ไม่มี alert เสี่ยงสูง สรุปสถานะการเงินวันนี้และแนะนำ 1 อย่างที่ควรทำต่อ';
  }

  const alertLines = activeAlerts.map((alert, index) => (
    `${index + 1}. [${alert.severity}] ${alert.title}: ${alert.message}`
  ));
  return `ช่วยสรุป alert การเงินวันนี้และแนะนำแผนลงมือแบบสั้น กระชับ เป็นภาษาไทย โดยอิงจากรายการนี้:\n${alertLines.join('\n')}`;
};
