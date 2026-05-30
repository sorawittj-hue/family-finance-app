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

const getTransactionDateKey = (transaction) => {
  if (typeof transaction?.date !== 'string') return '';
  return transaction.date.slice(0, 10);
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

const filterTransactionsBeforeMonth = (transactions, monthKey) => {
  const monthStartKey = `${monthKey}-01`;
  return transactions.filter((transaction) => {
    const dateKey = getTransactionDateKey(transaction);
    return dateKey && dateKey < monthStartKey;
  });
};

const filterTransactionsThroughMonth = (transactions, monthKey, selectedMonthDate) => {
  const monthEndKey = format(endOfMonth(selectedMonthDate), 'yyyy-MM-dd');
  return transactions.filter((transaction) => {
    const dateKey = getTransactionDateKey(transaction);
    return dateKey && dateKey <= monthEndKey;
  });
};

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

const buildInsights = ({
  income,
  expense,
  saving,
  netCashflow,
  openingBalance,
  endingBalance,
  projectedExpense,
  budgetUsage,
  debtRatio,
  runwayMonths,
}) => {
  const insights = [];
  const savingRate = income > 0 ? (saving / income) * 100 : 0;

  if (endingBalance < 0) {
    insights.push({ tone: 'danger', title: 'เงินคงเหลือติดลบหลังรวมยอดยกมา', detail: 'รายจ่ายเดือนนี้กินเกินเงินที่มีจริง ควรลดรายการไม่จำเป็นหรือเลื่อนค่าใช้จ่ายบางส่วนทันที' });
  } else if (netCashflow < 0 && openingBalance > 0) {
    insights.push({ tone: 'warning', title: 'กำลังใช้เงินยกมาจากเดือนก่อน', detail: 'กระแสเงินสดเดือนนี้ติดลบ แต่ยังมีเงินต้นเดือนรองรับอยู่ ให้ดูยอดคงเหลือหลังใช้จ่ายเป็นตัวหลัก' });
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
  const monthOutflow = expense + saving;
  const savingRate = income > 0 ? (saving / income) * 100 : 0;
  const spendingRate = income > 0 ? (expense / income) * 100 : 0;
  const debtRatio = income > 0 ? (debtExpense / income) * 100 : 0;
  const averageDailyExpense = expense / elapsedDays;
  const projectedExpense = isCurrentMonth ? averageDailyExpense * daysInMonth : expense;
  const openingTransactions = filterTransactionsBeforeMonth(transactions, monthKey);
  const endingTransactions = filterTransactionsThroughMonth(transactions, monthKey, selectedMonthDate);
  const openingWalletBalances = getWalletBalances(wallets, openingTransactions);
  const walletBalances = getWalletBalances(wallets, endingTransactions);
  const openingBalance = openingWalletBalances.reduce((sum, wallet) => sum + wallet.balance, 0);
  const availableForMonth = openingBalance + income;
  const totalBalance = walletBalances.reduce((sum, wallet) => sum + wallet.balance, 0);
  const endingBalance = totalBalance;
  const runwayMonths = expense > 0 ? totalBalance / expense : 0;
  const budgetUsage = buildBudgetUsage(monthTransactions, budgets);
  const overBudgetCount = budgetUsage.filter((budget) => budget.status === 'over').length;
  const topCategories = buildTopCategories(monthTransactions);
  const recurringDueThisMonth = recurringTxs
    .filter((bill) => !bill.lastTriggered?.startsWith(monthKey))
    .sort((a, b) => (Number(a.dueDay) || 1) - (Number(b.dueDay) || 1));

  let healthScore = 40;
  if (income > 0) healthScore += 10;
  if (endingBalance >= 0) healthScore += 15;
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
    monthOutflow,
    openingBalance,
    openingWalletBalances,
    availableForMonth,
    endingBalance,
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
    insights: buildInsights({
      income,
      expense,
      saving,
      netCashflow,
      openingBalance,
      endingBalance,
      projectedExpense,
      budgetUsage,
      debtRatio,
      runwayMonths,
    }),
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
  const recurringExpense = recurringTxs
    .filter((bill) => bill.type === 'expense')
    .reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const targetSavingRate = report.income >= 50000 ? 25 : 15;
  const currentSavingGap = report.income > 0
    ? Math.max(0, (report.income * targetSavingRate / 100) - report.saving)
    : 0;
  const investableSurplus = Math.max(0, report.netCashflow - currentSavingGap);
  const annualizedWealthVelocity = (report.saving + investableSurplus) * 12;
  const runwayTarget = 6;
  const runwayGap = Math.max(0, (report.expense * runwayTarget) - report.totalBalance);

  const budgetLeaks = report.budgetUsage
    .filter((budget) => budget.status !== 'ok')
    .slice(0, 3)
    .map((budget) => ({
      title: `${budget.label} ต้องคุมให้ชัด`,
      detail: budget.remaining < 0
        ? `เกินงบไปแล้ว ${Math.abs(budget.remaining).toFixed(0)} เดือนนี้ให้หยุดรายจ่ายไม่จำเป็นในหมวดนี้ก่อน`
        : `ใช้ไป ${budget.progress.toFixed(0)}% ของงบแล้ว รายจ่ายถัดไปควรรอ 24 ชั่วโมงก่อนตัดสินใจ`,
      impact: Math.max(Math.abs(budget.remaining), budget.limit * 0.1),
    }));

  const playbook = [
    {
      title: 'จ่ายให้อนาคตก่อน',
      metric: `เป้าออม ${targetSavingRate}%`,
      detail: currentSavingGap > 0
        ? `กันเงินเพิ่มอีก ${currentSavingGap.toFixed(0)} เข้าบัญชีออมก่อนเริ่มใช้จ่ายตามใจ`
        : 'อัตราออมแตะเป้าแล้ว รักษาระบบอัตโนมัติไว้',
      tone: currentSavingGap > 0 ? 'warning' : 'success',
    },
    {
      title: 'สร้าง runway 6 เดือน',
      metric: `พร้อม ${report.runwayMonths.toFixed(1)} เดือน`,
      detail: runwayGap > 0
        ? `ยังขาดเงินสำรอง ${runwayGap.toFixed(0)} ก่อนรับความเสี่ยงลงทุนหนักขึ้น`
        : 'เงินสำรองแข็งแรงพอสำหรับการเพิ่มสัดส่วนลงทุน',
      tone: runwayGap > 0 ? 'warning' : 'success',
    },
    {
      title: 'ลดรายจ่ายประจำที่ไม่สร้างผลลัพธ์',
      metric: `${recurringExpense.toFixed(0)} ต่อเดือน`,
      detail: recurringExpense > report.income * 0.1
        ? 'รายจ่ายประจำเกิน 10% ของรายรับ ควรรีวิว subscription ทั้งหมดในสัปดาห์นี้'
        : 'รายจ่ายประจำยังอยู่ในกรอบ เหลือแค่ต้องติดตามสม่ำเสมอ',
      tone: recurringExpense > report.income * 0.1 ? 'danger' : 'success',
    },
    {
      title: 'เพิ่ม wealth velocity',
      metric: `${annualizedWealthVelocity.toFixed(0)} ต่อปี`,
      detail: monthlyInvesting > 0
        ? 'มีนิสัยลงทุนแล้ว เพิ่มได้เมื่อ cashflow และเงินสำรองนิ่ง'
        : 'เดือนนี้ยังไม่มีเงินลงทุน ลองเริ่ม DCA เล็ก ๆ ให้ต่อเนื่อง',
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
