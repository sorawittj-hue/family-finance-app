import { endOfMonth, format, getDaysInMonth, isSameMonth, parseISO } from 'date-fns';
import { getCategory } from './constants';

export const getMonthKey = (date = new Date()) => format(date, 'yyyy-MM');

export const isTransferTransaction = (transaction) => (
  transaction?.isTransfer ||
  transaction?.category === 'transfer_in' ||
  transaction?.category === 'transfer_out'
);

export const getSignedAmount = (transaction) => {
  const amount = Number(transaction?.amount) || 0;
  if (transaction?.type === 'income') return amount;
  return -amount;
};

export const getWalletBalances = (wallets, transactions) => (
  wallets.map((wallet) => {
    const balance = transactions
      .filter((transaction) => transaction.walletId === wallet.id)
      .reduce((sum, transaction) => sum + getSignedAmount(transaction), 0);

    return { ...wallet, balance };
  })
);

export const filterTransactionsByMonth = (transactions, monthKey) => (
  transactions.filter((transaction) => transaction.date?.startsWith(monthKey))
);

const sumAmounts = (transactions, predicate) => (
  transactions
    .filter(predicate)
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0)
);

const buildBudgetUsage = (transactions, budgets) => (
  Object.entries(budgets)
    .filter(([, limit]) => Number(limit) > 0)
    .map(([categoryId, limit]) => {
      const spent = sumAmounts(
        transactions,
        (transaction) => transaction.type === 'expense' && transaction.category === categoryId && !isTransferTransaction(transaction),
      );
      const amount = Number(limit);
      const progress = amount > 0 ? Math.min((spent / amount) * 100, 999) : 0;
      const remaining = amount - spent;
      const category = getCategory('expense', categoryId);

      return {
        categoryId,
        label: category.label,
        color: category.color,
        limit: amount,
        spent,
        remaining,
        progress,
        status: spent > amount ? 'over' : progress >= 85 ? 'warning' : 'ok',
      };
    })
    .sort((a, b) => b.progress - a.progress)
);

const buildTopCategories = (transactions) => {
  const grouped = transactions
    .filter((transaction) => transaction.type === 'expense' && !isTransferTransaction(transaction))
    .reduce((acc, transaction) => {
      acc[transaction.category] = (acc[transaction.category] || 0) + Number(transaction.amount || 0);
      return acc;
    }, {});

  return Object.entries(grouped)
    .map(([categoryId, amount]) => {
      const category = getCategory('expense', categoryId);
      return {
        categoryId,
        name: category.label,
        amount,
        fill: category.color,
      };
    })
    .sort((a, b) => b.amount - a.amount);
};

const buildInsights = ({ income, expense, saving, netCashflow, projectedExpense, budgetUsage, debtRatio, runwayMonths }) => {
  const insights = [];
  const savingRate = income > 0 ? (saving / income) * 100 : 0;

  if (netCashflow < 0) {
    insights.push({ tone: 'danger', title: 'เงินสดติดลบในเดือนนี้', detail: 'รายจ่ายรวมเงินออมสูงกว่ารายรับ ควรลดรายการไม่จำเป็นหรือชะลอเงินออมบางส่วนก่อน' });
  } else if (savingRate >= 20) {
    insights.push({ tone: 'success', title: 'อัตราออมแข็งแรง', detail: 'เงินออมเดือนนี้เกิน 20% ของรายรับ ถือว่าอยู่ในโซนดีมาก' });
  } else if (income > 0) {
    insights.push({ tone: 'warning', title: 'ยังมีพื้นที่เพิ่มเงินออม', detail: 'ลองตั้งเป้าออมอย่างน้อย 10-20% ของรายรับเดือนนี้' });
  }

  const overBudget = budgetUsage.filter((budget) => budget.status === 'over');
  const nearBudget = budgetUsage.filter((budget) => budget.status === 'warning');
  if (overBudget.length > 0) {
    insights.push({ tone: 'danger', title: 'มีหมวดเกินงบ', detail: `${overBudget[0].label} เกินงบแล้ว ควรหยุดใช้จ่ายหมวดนี้ก่อน` });
  } else if (nearBudget.length > 0) {
    insights.push({ tone: 'warning', title: 'หมวดใกล้ชนเพดาน', detail: `${nearBudget[0].label} ใช้ไป ${nearBudget[0].progress.toFixed(0)}% ของงบแล้ว` });
  }

  if (expense > 0 && projectedExpense > expense * 1.15) {
    insights.push({ tone: 'warning', title: 'แนวโน้มรายจ่ายเร่งตัว', detail: 'อัตราใช้จ่ายปัจจุบันอาจทำให้สิ้นเดือนจ่ายสูงกว่าตอนนี้มาก' });
  }

  if (debtRatio >= 30) {
    insights.push({ tone: 'danger', title: 'ภาระหนี้สูง', detail: 'รายจ่ายหมวดหนี้สินเกิน 30% ของรายรับ ควรจัดลำดับชำระหนี้ดอกเบี้ยสูงก่อน' });
  }

  if (runwayMonths > 0 && runwayMonths < 3) {
    insights.push({ tone: 'warning', title: 'เงินสำรองยังบาง', detail: 'ยอดเงินคงเหลือครอบคลุมรายจ่ายได้ไม่ถึง 3 เดือน' });
  }

  if (insights.length === 0) {
    insights.push({ tone: 'success', title: 'สถานะโดยรวมดี', detail: 'กระแสเงินสด งบประมาณ และภาระจ่ายหลักยังอยู่ในเกณฑ์ควบคุมได้' });
  }

  return insights.slice(0, 4);
};

export const buildMonthlyFinanceReport = ({ transactions, wallets, budgets, recurringTxs, monthKey = getMonthKey() }) => {
  const selectedMonthDate = parseISO(`${monthKey}-01`);
  const today = new Date();
  const isCurrentMonth = isSameMonth(today, selectedMonthDate);
  const daysInMonth = getDaysInMonth(selectedMonthDate);
  const elapsedDays = isCurrentMonth ? Math.max(1, today.getDate()) : daysInMonth;
  const monthTransactions = filterTransactionsByMonth(transactions, monthKey);
  const operatingTransactions = monthTransactions.filter((transaction) => !isTransferTransaction(transaction));
  const income = sumAmounts(operatingTransactions, (transaction) => transaction.type === 'income');
  const expense = sumAmounts(operatingTransactions, (transaction) => transaction.type === 'expense');
  const saving = sumAmounts(operatingTransactions, (transaction) => transaction.type === 'saving');
  const debtExpense = sumAmounts(operatingTransactions, (transaction) => transaction.type === 'expense' && transaction.category === 'debt');
  const netCashflow = income - expense - saving;
  const savingRate = income > 0 ? (saving / income) * 100 : 0;
  const spendingRate = income > 0 ? (expense / income) * 100 : 0;
  const debtRatio = income > 0 ? (debtExpense / income) * 100 : 0;
  const averageDailyExpense = expense / elapsedDays;
  const projectedExpense = isCurrentMonth ? averageDailyExpense * daysInMonth : expense;
  const walletBalances = getWalletBalances(wallets, transactions);
  const totalBalance = walletBalances.reduce((sum, wallet) => sum + wallet.balance, 0);
  const runwayMonths = expense > 0 ? totalBalance / expense : 0;
  const budgetUsage = buildBudgetUsage(monthTransactions, budgets);
  const overBudgetCount = budgetUsage.filter((budget) => budget.status === 'over').length;
  const topCategories = buildTopCategories(monthTransactions);
  const recurringDueThisMonth = recurringTxs
    .filter((bill) => !bill.lastTriggered?.startsWith(monthKey))
    .sort((a, b) => (Number(a.dueDay) || 1) - (Number(b.dueDay) || 1));

  let healthScore = 40;
  if (income > 0) healthScore += 10;
  if (netCashflow >= 0) healthScore += 15;
  if (savingRate >= 10) healthScore += 10;
  if (savingRate >= 20) healthScore += 10;
  if (overBudgetCount === 0) healthScore += 10;
  if (runwayMonths >= 3 || totalBalance > 0 && expense === 0) healthScore += 10;
  if (debtRatio < 30) healthScore += 5;

  return {
    monthKey,
    monthLabel: format(selectedMonthDate, 'MMMM yyyy'),
    monthEnd: endOfMonth(selectedMonthDate),
    isCurrentMonth,
    income,
    expense,
    saving,
    debtExpense,
    netCashflow,
    savingRate,
    spendingRate,
    debtRatio,
    averageDailyExpense,
    projectedExpense,
    totalBalance,
    runwayMonths,
    walletBalances,
    budgetUsage,
    topCategories,
    recurringDueThisMonth,
    transactionCount: monthTransactions.length,
    operatingTransactionCount: operatingTransactions.length,
    healthScore: Math.max(0, Math.min(100, Math.round(healthScore))),
    insights: buildInsights({ income, expense, saving, netCashflow, projectedExpense, budgetUsage, debtRatio, runwayMonths }),
  };
};

export const buildWealthOperatingSystem = ({ transactions, wallets, budgets, goals, recurringTxs, monthKey = getMonthKey() }) => {
  const report = buildMonthlyFinanceReport({ transactions, wallets, budgets, recurringTxs, monthKey });
  const monthlyInvesting = transactions
    .filter((transaction) => transaction.type === 'saving' && transaction.category === 'investment')
    .reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
  const emergencyGoal = goals.find((goal) => /emergency|ฉุกเฉิน/i.test(goal.name || '') || goal.id?.includes('emergency'));
  const emergencyTarget = emergencyGoal?.targetAmount || Math.max(report.expense * 6, 1);
  const emergencyProgress = emergencyTarget > 0 ? ((emergencyGoal?.currentAmount || 0) / emergencyTarget) * 100 : 0;
  const budgetLeaks = report.budgetUsage
    .filter((budget) => budget.status !== 'ok')
    .slice(0, 3)
    .map((budget) => ({
      title: `${budget.label} needs a guardrail`,
      detail: budget.remaining < 0
        ? `Overspent by ${Math.abs(budget.remaining).toFixed(0)} this month. Freeze non-essential spending here until next cycle.`
        : `${budget.progress.toFixed(0)}% used. Put the next purchase in a 24-hour wait list.`,
      impact: Math.max(Math.abs(budget.remaining), budget.limit * 0.1),
    }));

  const recurringExpense = recurringTxs
    .filter((bill) => bill.type === 'expense')
    .reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const targetSavingRate = report.income >= 50000 ? 25 : 15;
  const currentSavingGap = report.income > 0
    ? Math.max(0, (report.income * targetSavingRate / 100) - report.saving)
    : 0;
  const investableSurplus = Math.max(0, report.netCashflow - Math.max(currentSavingGap, 0));
  const annualizedWealthVelocity = (report.saving + Math.max(0, investableSurplus)) * 12;
  const runwayTarget = 6;
  const runwayGap = Math.max(0, (report.expense * runwayTarget) - report.totalBalance);

  const playbook = [
    {
      title: 'Pay yourself first',
      metric: `${targetSavingRate}% saving target`,
      detail: currentSavingGap > 0
        ? `Move ${currentSavingGap.toFixed(0)} into savings before discretionary spending.`
        : 'You are at or above the target saving lane. Keep automation on.',
      tone: currentSavingGap > 0 ? 'warning' : 'success',
    },
    {
      title: 'Build a 6-month runway',
      metric: `${report.runwayMonths.toFixed(1)} months ready`,
      detail: runwayGap > 0
        ? `Emergency capital gap is ${runwayGap.toFixed(0)}. Fill this before taking bigger risk.`
        : 'Emergency runway is strong enough to support more investing.',
      tone: runwayGap > 0 ? 'warning' : 'success',
    },
    {
      title: 'Kill silent subscriptions',
      metric: `${recurringExpense.toFixed(0)} monthly recurring`,
      detail: recurringExpense > report.income * 0.1
        ? 'Recurring bills exceed 10% of income. Review every subscription this week.'
        : 'Recurring bills are contained. Keep them visible.',
      tone: recurringExpense > report.income * 0.1 ? 'danger' : 'success',
    },
    {
      title: 'Increase wealth velocity',
      metric: `${annualizedWealthVelocity.toFixed(0)} yearly engine`,
      detail: monthlyInvesting > 0
        ? 'Investment habit exists. Raise it when cashflow and runway are stable.'
        : 'No investment contribution this month. Start a tiny recurring DCA line.',
      tone: monthlyInvesting > 0 ? 'success' : 'warning',
    },
  ];

  return {
    report,
    emergencyProgress: Math.min(100, emergencyProgress),
    monthlyInvesting,
    recurringExpense,
    currentSavingGap,
    investableSurplus,
    annualizedWealthVelocity,
    runwayGap,
    budgetLeaks,
    playbook,
  };
};
