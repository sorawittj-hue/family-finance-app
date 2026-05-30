const FINANCE_TABLES = {
  wallets: 'finance_wallets',
  transactions: 'finance_transactions',
  budgets: 'finance_budgets',
  goals: 'finance_goals',
  recurringTxs: 'finance_recurring_transactions',
  preferences: 'finance_preferences',
};

const requireClient = (client) => {
  if (!client) {
    throw new Error('Supabase client is not configured.');
  }
};

const unwrap = async (promise, operation) => {
  const { data, error } = await promise;
  if (error) {
    console.error(`Supabase ${operation} failed.`, error);
    throw error;
  }
  return data;
};

const toWalletRow = (wallet, userId) => ({
  id: wallet.id,
  user_id: userId,
  name: wallet.name,
  color: wallet.color || '#3b82f6',
  type: wallet.type || 'bank',
  updated_at: new Date().toISOString(),
});

const fromWalletRow = (row) => ({
  id: row.id,
  name: row.name,
  color: row.color,
  type: row.type,
});

const toTransactionRow = (transaction, userId) => ({
  id: transaction.id,
  user_id: userId,
  type: transaction.type,
  category: transaction.category,
  amount: Number(transaction.amount) || 0,
  date: transaction.date,
  note: transaction.note || '',
  wallet_id: transaction.walletId || null,
  is_transfer: Boolean(transaction.isTransfer),
  linked_tx_id: transaction.linkedTxId || null,
  happened_at_ms: Number(transaction.timestamp) || Date.now(),
  updated_at: new Date().toISOString(),
});

const fromTransactionRow = (row) => ({
  id: row.id,
  type: row.type,
  category: row.category,
  amount: Number(row.amount) || 0,
  date: row.date,
  note: row.note || '',
  walletId: row.wallet_id,
  isTransfer: Boolean(row.is_transfer),
  linkedTxId: row.linked_tx_id,
  timestamp: Number(row.happened_at_ms) || 0,
});

const toBudgetRows = (budgets, userId) => (
  Object.entries(budgets).map(([categoryId, amount]) => ({
    user_id: userId,
    category_id: categoryId,
    amount: Number(amount) || 0,
    updated_at: new Date().toISOString(),
  }))
);

const fromBudgetRows = (rows) => (
  rows.reduce((acc, row) => {
    acc[row.category_id] = Number(row.amount) || 0;
    return acc;
  }, {})
);

const toGoalRow = (goal, userId) => ({
  id: goal.id,
  user_id: userId,
  name: goal.name,
  target_amount: Number(goal.targetAmount) || 0,
  current_amount: Number(goal.currentAmount) || 0,
  target_date: goal.targetDate || null,
  icon: goal.icon || 'Target',
  updated_at: new Date().toISOString(),
});

const fromGoalRow = (row) => ({
  id: row.id,
  name: row.name,
  targetAmount: Number(row.target_amount) || 0,
  currentAmount: Number(row.current_amount) || 0,
  targetDate: row.target_date || '',
  icon: row.icon || 'Target',
});

const toRecurringRow = (bill, userId) => ({
  id: bill.id,
  user_id: userId,
  name: bill.name,
  type: bill.type,
  category: bill.category,
  amount: Number(bill.amount) || 0,
  wallet_id: bill.walletId || null,
  interval: bill.interval || 'monthly',
  due_day: Math.min(31, Math.max(1, Number(bill.dueDay) || 1)),
  last_triggered: bill.lastTriggered || null,
  updated_at: new Date().toISOString(),
});

const fromRecurringRow = (row) => ({
  id: row.id,
  name: row.name,
  type: row.type,
  category: row.category,
  amount: Number(row.amount) || 0,
  walletId: row.wallet_id,
  interval: row.interval || 'monthly',
  dueDay: Number(row.due_day) || 1,
  lastTriggered: row.last_triggered || '',
});

export const isCloudDatasetEmpty = (dataset) => (
  dataset.wallets.length === 0 &&
  dataset.transactions.length === 0 &&
  Object.keys(dataset.budgets).length === 0 &&
  dataset.goals.length === 0 &&
  dataset.recurringTxs.length === 0
);

export const loadFinanceDataset = async (client, userId) => {
  requireClient(client);

  const [wallets, transactions, budgets, goals, recurringTxs, preferences] = await Promise.all([
    unwrap(client.from(FINANCE_TABLES.wallets).select('*').eq('user_id', userId).order('created_at'), 'load wallets'),
    unwrap(client.from(FINANCE_TABLES.transactions).select('*').eq('user_id', userId).order('date', { ascending: false }).order('happened_at_ms', { ascending: false }), 'load transactions'),
    unwrap(client.from(FINANCE_TABLES.budgets).select('*').eq('user_id', userId), 'load budgets'),
    unwrap(client.from(FINANCE_TABLES.goals).select('*').eq('user_id', userId).order('created_at'), 'load goals'),
    unwrap(client.from(FINANCE_TABLES.recurringTxs).select('*').eq('user_id', userId).order('due_day'), 'load recurring transactions'),
    unwrap(client.from(FINANCE_TABLES.preferences).select('*').eq('user_id', userId).maybeSingle(), 'load preferences'),
  ]);

  return {
    wallets: wallets.map(fromWalletRow),
    transactions: transactions.map(fromTransactionRow),
    budgets: fromBudgetRows(budgets),
    goals: goals.map(fromGoalRow),
    recurringTxs: recurringTxs.map(fromRecurringRow),
    theme: preferences?.theme,
    currency: preferences?.currency,
  };
};

export const saveFullFinanceDataset = async (client, userId, dataset) => {
  requireClient(client);

  await Promise.all([
    dataset.wallets.length > 0
      ? unwrap(client.from(FINANCE_TABLES.wallets).upsert(dataset.wallets.map((wallet) => toWalletRow(wallet, userId))), 'upsert wallets')
      : Promise.resolve(),
    dataset.transactions.length > 0
      ? unwrap(client.from(FINANCE_TABLES.transactions).upsert(dataset.transactions.map((transaction) => toTransactionRow(transaction, userId))), 'upsert transactions')
      : Promise.resolve(),
    Object.keys(dataset.budgets).length > 0
      ? unwrap(client.from(FINANCE_TABLES.budgets).upsert(toBudgetRows(dataset.budgets, userId)), 'upsert budgets')
      : Promise.resolve(),
    dataset.goals.length > 0
      ? unwrap(client.from(FINANCE_TABLES.goals).upsert(dataset.goals.map((goal) => toGoalRow(goal, userId))), 'upsert goals')
      : Promise.resolve(),
    dataset.recurringTxs.length > 0
      ? unwrap(client.from(FINANCE_TABLES.recurringTxs).upsert(dataset.recurringTxs.map((bill) => toRecurringRow(bill, userId))), 'upsert recurring transactions')
      : Promise.resolve(),
    unwrap(client.from(FINANCE_TABLES.preferences).upsert({
      user_id: userId,
      theme: dataset.theme,
      currency: dataset.currency,
      updated_at: new Date().toISOString(),
    }), 'upsert preferences'),
  ]);
};

export const replaceFullFinanceDataset = async (client, userId, dataset) => {
  requireClient(client);

  await Promise.all([
    unwrap(client.from(FINANCE_TABLES.transactions).delete().eq('user_id', userId), 'clear transactions'),
    unwrap(client.from(FINANCE_TABLES.budgets).delete().eq('user_id', userId), 'clear budgets'),
    unwrap(client.from(FINANCE_TABLES.goals).delete().eq('user_id', userId), 'clear goals'),
    unwrap(client.from(FINANCE_TABLES.recurringTxs).delete().eq('user_id', userId), 'clear recurring transactions'),
    unwrap(client.from(FINANCE_TABLES.wallets).delete().eq('user_id', userId), 'clear wallets'),
  ]);

  await saveFullFinanceDataset(client, userId, dataset);
};

export const upsertWallet = (client, userId, wallet) => unwrap(
  client.from(FINANCE_TABLES.wallets).upsert(toWalletRow(wallet, userId)),
  'upsert wallet',
);

export const deleteWalletRow = (client, userId, id) => unwrap(
  client.from(FINANCE_TABLES.wallets).delete().eq('user_id', userId).eq('id', id),
  'delete wallet',
);

export const upsertTransaction = (client, userId, transaction) => unwrap(
  client.from(FINANCE_TABLES.transactions).upsert(toTransactionRow(transaction, userId)),
  'upsert transaction',
);

export const deleteTransactionRows = (client, userId, ids) => unwrap(
  client.from(FINANCE_TABLES.transactions).delete().eq('user_id', userId).in('id', ids),
  'delete transactions',
);

export const upsertBudget = (client, userId, categoryId, amount) => unwrap(
  client.from(FINANCE_TABLES.budgets).upsert({
    user_id: userId,
    category_id: categoryId,
    amount: Number(amount) || 0,
    updated_at: new Date().toISOString(),
  }),
  'upsert budget',
);

export const deleteBudgetRow = (client, userId, categoryId) => unwrap(
  client.from(FINANCE_TABLES.budgets).delete().eq('user_id', userId).eq('category_id', categoryId),
  'delete budget',
);

export const upsertGoal = (client, userId, goal) => unwrap(
  client.from(FINANCE_TABLES.goals).upsert(toGoalRow(goal, userId)),
  'upsert goal',
);

export const deleteGoalRow = (client, userId, id) => unwrap(
  client.from(FINANCE_TABLES.goals).delete().eq('user_id', userId).eq('id', id),
  'delete goal',
);

export const upsertRecurringTx = (client, userId, bill) => unwrap(
  client.from(FINANCE_TABLES.recurringTxs).upsert(toRecurringRow(bill, userId)),
  'upsert recurring transaction',
);

export const deleteRecurringTxRow = (client, userId, id) => unwrap(
  client.from(FINANCE_TABLES.recurringTxs).delete().eq('user_id', userId).eq('id', id),
  'delete recurring transaction',
);

export const upsertPreferences = (client, userId, preferences) => unwrap(
  client.from(FINANCE_TABLES.preferences).upsert({
    user_id: userId,
    theme: preferences.theme,
    currency: preferences.currency,
    updated_at: new Date().toISOString(),
  }),
  'upsert preferences',
);

export const FINANCE_REALTIME_TABLES = Object.values(FINANCE_TABLES);
