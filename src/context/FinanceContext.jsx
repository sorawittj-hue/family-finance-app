import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { generateDemoData } from '../utils/demoData';
import { getSupabaseConfigStatus, isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import {
  FINANCE_REALTIME_TABLES,
  deleteBudgetRow,
  deleteGoalRow,
  deleteRecurringTxRow,
  deleteTransactionRows,
  deleteWalletRow,
  isCloudDatasetEmpty,
  loadFinanceDataset,
  replaceFullFinanceDataset,
  saveFullFinanceDataset,
  upsertBudget,
  upsertGoal,
  upsertPreferences,
  upsertRecurringTx,
  upsertTransaction,
  upsertWallet,
} from '../services/financeCloudStore';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint32Array(4);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(36)).join('-');
  }
  console.warn('Secure random UUID generation is unavailable; using timestamp fallback.');
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const STORAGE_KEYS = {
  TRANSACTIONS: 'family_finance_transactions',
  BUDGETS: 'family_finance_budgets',
  GOALS: 'family_finance_goals',
  WALLETS: 'family_finance_wallets',
  THEME: 'family_finance_theme',
  CURRENCY: 'family_finance_currency',
  RECURRING: 'family_finance_recurring',
};

const DEFAULT_WALLETS = [
  { id: 'wallet-cash', name: 'Cash', color: '#10b981', type: 'cash' },
  { id: 'wallet-bank', name: 'Bank Account', color: '#3b82f6', type: 'bank' },
  { id: 'wallet-credit', name: 'Credit Card', color: '#f43f5e', type: 'credit' },
];

const loadData = (key, defaultValue) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage. Falling back to default value.`, error);
    return defaultValue;
  }
};

const persistData = (key, value) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist ${key} to localStorage.`, error);
  }
};

const sortTransactions = (transactions) => (
  [...transactions].sort((a, b) => {
    if (a.date !== b.date) return String(b.date || '').localeCompare(String(a.date || ''));
    return (b.timestamp || 0) - (a.timestamp || 0);
  })
);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const isPositiveAmount = (amount) => Number.isFinite(Number(amount)) && Number(amount) > 0;

const FinanceContext = createContext();

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

export const FinanceProvider = ({ children }) => {
  const [wallets, setWallets] = useState(() => loadData(STORAGE_KEYS.WALLETS, DEFAULT_WALLETS));
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEYS.THEME) || 'dark');
  const [currency, setCurrencyState] = useState(() => localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'THB');
  const [recurringTxs, setRecurringTxs] = useState(() => loadData(STORAGE_KEYS.RECURRING, []));
  const [transactions, setTransactions] = useState(() => {
    const stored = loadData(STORAGE_KEYS.TRANSACTIONS, []);
    return sortTransactions(stored.map((tx) => ({
      ...tx,
      walletId: tx.walletId || 'wallet-cash',
    })));
  });
  const [budgets, setBudgets] = useState(() => loadData(STORAGE_KEYS.BUDGETS, {}));
  const [goals, setGoals] = useState(() => loadData(STORAGE_KEYS.GOALS, []));

  const [session, setSession] = useState(null);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? 'checking' : 'local');
  const [syncError, setSyncError] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  const realtimeReloadTimer = useRef(null);
  const latestDatasetRef = useRef(null);
  const user = session?.user || null;
  const supabaseConfig = useMemo(() => getSupabaseConfigStatus(), []);

  const buildLocalDataset = useCallback(() => ({
    wallets,
    transactions,
    budgets,
    goals,
    recurringTxs,
    theme,
    currency,
  }), [budgets, currency, goals, recurringTxs, theme, transactions, wallets]);

  useEffect(() => {
    latestDatasetRef.current = buildLocalDataset();
  }, [buildLocalDataset]);

  const applyDataset = useCallback((dataset) => {
    if (dataset.wallets) setWallets(dataset.wallets.length > 0 ? dataset.wallets : DEFAULT_WALLETS);
    if (dataset.transactions) setTransactions(sortTransactions(dataset.transactions));
    if (dataset.budgets) setBudgets(dataset.budgets);
    if (dataset.goals) setGoals(dataset.goals);
    if (dataset.recurringTxs) setRecurringTxs(dataset.recurringTxs);
    if (dataset.theme) setThemeState(dataset.theme);
    if (dataset.currency) setCurrencyState(dataset.currency);
  }, []);

  const runCloudOperation = useCallback((operation) => {
    if (!supabase || !user?.id) return;
    setSyncStatus('syncing');
    setSyncError('');
    operation()
      .then(() => {
        setSyncStatus('online');
        setLastSyncedAt(new Date().toISOString());
      })
      .catch((error) => {
        setSyncStatus('error');
        setSyncError(error?.message || 'Cloud sync failed.');
      });
  }, [user?.id]);

  const refreshFromCloud = useCallback(async ({ migrateIfEmpty = false } = {}) => {
    if (!supabase || !user?.id) return;
    setIsCloudLoading(true);
    setSyncStatus('syncing');
    setSyncError('');

    try {
      const cloudDataset = await loadFinanceDataset(supabase, user.id);
      if (migrateIfEmpty && isCloudDatasetEmpty(cloudDataset)) {
        const localDataset = latestDatasetRef.current || buildLocalDataset();
        await saveFullFinanceDataset(supabase, user.id, localDataset);
        setSyncStatus('online');
        setLastSyncedAt(new Date().toISOString());
        return;
      }

      applyDataset(cloudDataset);
      setSyncStatus('online');
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setSyncStatus('error');
      setSyncError(error?.message || 'Failed to load cloud finance data.');
    } finally {
      setIsCloudLoading(false);
    }
  }, [applyDataset, buildLocalDataset, user?.id]);

  useEffect(() => {
    if (!supabase) return undefined;

    let isMounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setSyncStatus('error');
        setSyncError(error.message);
        return;
      }
      setSession(data.session);
      setSyncStatus(data.session ? 'syncing' : 'signed-out');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSyncStatus(nextSession ? 'syncing' : 'signed-out');
      if (!nextSession) {
        setLastSyncedAt(null);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    refreshFromCloud({ migrateIfEmpty: true });

    const channel = supabase
      .channel(`finance-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: FINANCE_REALTIME_TABLES[0], filter: `user_id=eq.${user.id}` },
        () => {
          window.clearTimeout(realtimeReloadTimer.current);
          realtimeReloadTimer.current = window.setTimeout(() => refreshFromCloud(), 350);
        },
      );

    FINANCE_REALTIME_TABLES.slice(1).forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${user.id}` },
        () => {
          window.clearTimeout(realtimeReloadTimer.current);
          realtimeReloadTimer.current = window.setTimeout(() => refreshFromCloud(), 350);
        },
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setSyncStatus('online');
      }
    });

    return () => {
      window.clearTimeout(realtimeReloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [refreshFromCloud, user?.id]);

  useEffect(() => persistData(STORAGE_KEYS.TRANSACTIONS, transactions), [transactions]);
  useEffect(() => persistData(STORAGE_KEYS.BUDGETS, budgets), [budgets]);
  useEffect(() => persistData(STORAGE_KEYS.GOALS, goals), [goals]);
  useEffect(() => persistData(STORAGE_KEYS.WALLETS, wallets), [wallets]);
  useEffect(() => persistData(STORAGE_KEYS.CURRENCY, currency), [currency]);
  useEffect(() => persistData(STORAGE_KEYS.RECURRING, recurringTxs), [recurringTxs]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-oled', 'theme-light', 'theme-nordic');
    root.classList.add(`theme-${theme}`);
    persistData(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const signInWithEmail = async (email, password) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    setSyncStatus('syncing');
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      setSyncStatus('error');
      setSyncError(result.error.message);
    }
    return result;
  };

  const signUpWithEmail = async (email, password) => {
    if (!supabase) return { error: new Error('Supabase is not configured.') };
    setSyncStatus('syncing');
    const result = await supabase.auth.signUp({ email, password });
    if (result.error) {
      setSyncStatus('error');
      setSyncError(result.error.message);
    }
    return result;
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSyncStatus('error');
      setSyncError(error.message);
    }
  };

  const setTheme = (nextTheme) => {
    setThemeState(nextTheme);
    runCloudOperation(() => upsertPreferences(supabase, user.id, { theme: nextTheme, currency }));
  };

  const setCurrency = (nextCurrency) => {
    setCurrencyState(nextCurrency);
    runCloudOperation(() => upsertPreferences(supabase, user.id, { theme, currency: nextCurrency }));
  };

  const addTransaction = (tx) => {
    if (!tx?.type || !tx?.category || !tx?.date || !isPositiveAmount(tx.amount)) {
      console.warn('Rejected invalid transaction payload.', tx);
      return false;
    }

    const newTx = {
      ...tx,
      id: generateUUID(),
      timestamp: Date.now(),
      amount: Number(tx.amount),
      walletId: tx.walletId || wallets[0]?.id || 'wallet-cash',
    };
    setTransactions((prev) => sortTransactions([newTx, ...prev]));
    runCloudOperation(() => upsertTransaction(supabase, user.id, newTx));
    return true;
  };

  const deleteTransaction = (id) => {
    let idsToDelete = [id];
    setTransactions((prev) => {
      const txToDelete = prev.find((transaction) => transaction.id === id);
      if (txToDelete?.linkedTxId) idsToDelete = [id, txToDelete.linkedTxId];
      return prev.filter((transaction) => !idsToDelete.includes(transaction.id));
    });
    runCloudOperation(() => deleteTransactionRows(supabase, user.id, idsToDelete));
  };

  const updateTransaction = (id, updatedTx) => {
    if (!id || !isPositiveAmount(updatedTx.amount)) {
      console.warn('Rejected invalid transaction update payload.', { id, updatedTx });
      return false;
    }

    let nextTx = null;
    setTransactions((prev) => sortTransactions(prev.map((transaction) => {
      if (transaction.id !== id) return transaction;
      nextTx = { ...transaction, ...updatedTx, amount: Number(updatedTx.amount), timestamp: transaction.timestamp || Date.now() };
      return nextTx;
    })));
    if (nextTx) runCloudOperation(() => upsertTransaction(supabase, user.id, nextTx));
    return true;
  };

  const transferWallet = ({ fromWalletId, toWalletId, amount, date, note }) => {
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || !date || !isPositiveAmount(amount)) {
      console.warn('Rejected invalid wallet transfer payload.', { fromWalletId, toWalletId, amount, date });
      return false;
    }

    const baseId = generateUUID();
    const transferAmount = Number(amount);
    const timestamp = Date.now();
    const outTx = {
      id: `out-${baseId}`,
      type: 'expense',
      category: 'transfer_out',
      amount: transferAmount,
      date,
      note: note || 'Wallet transfer out',
      walletId: fromWalletId,
      isTransfer: true,
      linkedTxId: `in-${baseId}`,
      timestamp,
    };
    const inTx = {
      id: `in-${baseId}`,
      type: 'income',
      category: 'transfer_in',
      amount: transferAmount,
      date,
      note: note || 'Wallet transfer in',
      walletId: toWalletId,
      isTransfer: true,
      linkedTxId: `out-${baseId}`,
      timestamp: timestamp + 1,
    };

    setTransactions((prev) => sortTransactions([outTx, inTx, ...prev]));
    runCloudOperation(async () => {
      await upsertTransaction(supabase, user.id, outTx);
      await upsertTransaction(supabase, user.id, inTx);
    });
    return true;
  };

  const updateBudget = (categoryId, amount) => {
    if (!categoryId || Number(amount) < 0 || !Number.isFinite(Number(amount))) {
      console.warn('Rejected invalid budget update payload.', { categoryId, amount });
      return false;
    }

    const nextAmount = Number(amount);
    setBudgets((prev) => ({ ...prev, [categoryId]: nextAmount }));
    runCloudOperation(() => upsertBudget(supabase, user.id, categoryId, nextAmount));
    return true;
  };

  const deleteBudget = (categoryId) => {
    if (!categoryId) return false;
    setBudgets((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    runCloudOperation(() => deleteBudgetRow(supabase, user.id, categoryId));
    return true;
  };

  const transferBudget = (fromCatId, toCatId, amount) => {
    setBudgets((prev) => {
      const transferAmount = Number(amount) || 0;
      const fromLimit = prev[fromCatId] || 0;
      const toLimit = prev[toCatId] || 0;
      if (fromLimit < transferAmount) return prev;
      const next = {
        ...prev,
        [fromCatId]: Math.max(0, fromLimit - transferAmount),
        [toCatId]: toLimit + transferAmount,
      };
      runCloudOperation(async () => {
        await upsertBudget(supabase, user.id, fromCatId, next[fromCatId]);
        await upsertBudget(supabase, user.id, toCatId, next[toCatId]);
      });
      return next;
    });
  };

  const addGoal = (goal) => {
    const newGoal = {
      ...goal,
      id: generateUUID(),
      currentAmount: Number(goal.currentAmount) || 0,
      targetAmount: Number(goal.targetAmount) || 0,
      targetDate: goal.targetDate || '',
      icon: goal.icon || 'Target',
    };
    setGoals((prev) => [...prev, newGoal]);
    runCloudOperation(() => upsertGoal(supabase, user.id, newGoal));
  };

  const updateGoal = (id, newAmount) => {
    let nextGoal = null;
    setGoals((prev) => prev.map((goal) => {
      if (goal.id !== id) return goal;
      nextGoal = { ...goal, currentAmount: Number(newAmount) || 0 };
      return nextGoal;
    }));
    if (nextGoal) runCloudOperation(() => upsertGoal(supabase, user.id, nextGoal));
  };

  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
    runCloudOperation(() => deleteGoalRow(supabase, user.id, id));
  };

  const addWallet = (wallet) => {
    const newWallet = { ...wallet, id: `wallet-${generateUUID()}` };
    setWallets((prev) => [...prev, newWallet]);
    runCloudOperation(() => upsertWallet(supabase, user.id, newWallet));
  };

  const updateWallet = (id, updatedWallet) => {
    let nextWallet = null;
    setWallets((prev) => prev.map((wallet) => {
      if (wallet.id !== id) return wallet;
      nextWallet = { ...wallet, ...updatedWallet };
      return nextWallet;
    }));
    if (nextWallet) runCloudOperation(() => upsertWallet(supabase, user.id, nextWallet));
  };

  const deleteWallet = (id) => {
    const fallbackWalletId = wallets.find((wallet) => wallet.id !== id)?.id || 'wallet-cash';
    setWallets((prev) => prev.filter((wallet) => wallet.id !== id));
    setTransactions((prev) => prev.map((tx) => (tx.walletId === id ? { ...tx, walletId: fallbackWalletId } : tx)));
    runCloudOperation(async () => {
      const affected = transactions.filter((tx) => tx.walletId === id).map((tx) => ({ ...tx, walletId: fallbackWalletId }));
      await Promise.all(affected.map((tx) => upsertTransaction(supabase, user.id, tx)));
      await deleteWalletRow(supabase, user.id, id);
    });
  };

  const addRecurringTx = (bill) => {
    const dueDay = Math.min(31, Math.max(1, Number(bill.dueDay) || 1));
    const newBill = { ...bill, dueDay, id: `rec-${generateUUID()}`, lastTriggered: '' };
    setRecurringTxs((prev) => [...prev, newBill]);
    runCloudOperation(() => upsertRecurringTx(supabase, user.id, newBill));
  };

  const deleteRecurringTx = (id) => {
    setRecurringTxs((prev) => prev.filter((bill) => bill.id !== id));
    runCloudOperation(() => deleteRecurringTxRow(supabase, user.id, id));
  };

  const triggerRecurringTx = (id, walletId) => {
    const bill = recurringTxs.find((item) => item.id === id);
    if (!bill) return;

    addTransaction({
      type: bill.type,
      category: bill.category,
      amount: bill.amount,
      date: new Date().toISOString().split('T')[0],
      note: `Recurring payment: ${bill.name}`,
      walletId: walletId || bill.walletId || wallets[0]?.id || 'wallet-cash',
    });

    const triggeredBill = { ...bill, lastTriggered: new Date().toISOString().split('T')[0] };
    setRecurringTxs((prev) => prev.map((item) => (item.id === id ? triggeredBill : item)));
    runCloudOperation(() => upsertRecurringTx(supabase, user.id, triggeredBill));
  };

  const loadDemoData = () => {
    const demo = generateDemoData();
    const demoRecurring = [
      { id: 'rec-demo-netflix', name: 'Netflix Premium', type: 'expense', category: 'shopping', amount: 419, walletId: 'wallet-ktc', interval: 'monthly', dueDay: 7, lastTriggered: '' },
      { id: 'rec-demo-electric', name: 'Home utilities', type: 'expense', category: 'home', amount: 2850, walletId: 'wallet-scb', interval: 'monthly', dueDay: 18, lastTriggered: '' },
      { id: 'rec-demo-dividend', name: 'Monthly dividend', type: 'income', category: 'dividend', amount: 3500, walletId: 'wallet-kbank', interval: 'monthly', dueDay: 28, lastTriggered: '' },
    ];
    const nextDataset = { ...demo, recurringTxs: demoRecurring, theme, currency };
    setWallets(demo.wallets);
    setBudgets(demo.budgets);
    setGoals(demo.goals);
    setTransactions(demo.transactions);
    setRecurringTxs(demoRecurring);
    runCloudOperation(() => replaceFullFinanceDataset(supabase, user.id, nextDataset));
  };

  const resetAllData = () => {
    const emptyDataset = {
      transactions: [],
      budgets: {},
      goals: [],
      wallets: DEFAULT_WALLETS,
      theme: 'dark',
      currency: 'THB',
      recurringTxs: [],
    };
    applyDataset(emptyDataset);
    runCloudOperation(() => replaceFullFinanceDataset(supabase, user.id, emptyDataset));
  };

  const exportData = () => {
    const data = { transactions, budgets, goals, wallets, theme, currency, recurringTxs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family_finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (jsonData) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!isPlainObject(parsed)) return false;
      if (parsed.wallets !== undefined && !Array.isArray(parsed.wallets)) return false;
      if (parsed.recurringTxs !== undefined && !Array.isArray(parsed.recurringTxs)) return false;
      if (parsed.transactions !== undefined && !Array.isArray(parsed.transactions)) return false;
      if (parsed.goals !== undefined && !Array.isArray(parsed.goals)) return false;
      if (parsed.budgets !== undefined && !isPlainObject(parsed.budgets)) return false;

      const nextDataset = {
        wallets: parsed.wallets || wallets,
        theme: parsed.theme || theme,
        currency: parsed.currency || currency,
        recurringTxs: parsed.recurringTxs || recurringTxs,
        transactions: parsed.transactions ? sortTransactions(parsed.transactions) : transactions,
        budgets: parsed.budgets || budgets,
        goals: parsed.goals || goals,
      };
      applyDataset(nextDataset);
      runCloudOperation(() => replaceFullFinanceDataset(supabase, user.id, nextDataset));
      return true;
    } catch (error) {
      console.error('Import failed', error);
      return false;
    }
  };

  const value = {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    transferWallet,
    budgets,
    updateBudget,
    deleteBudget,
    transferBudget,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    wallets,
    addWallet,
    updateWallet,
    deleteWallet,
    theme,
    setTheme,
    currency,
    setCurrency,
    recurringTxs,
    addRecurringTx,
    deleteRecurringTx,
    triggerRecurringTx,
    loadDemoData,
    resetAllData,
    exportData,
    importData,
    cloud: {
      user,
      session,
      isConfigured: supabaseConfig.isConfigured,
      missingKeys: supabaseConfig.missingKeys,
      url: supabaseConfig.url,
      isAuthenticated: Boolean(user),
      status: syncStatus,
      error: syncError,
      lastSyncedAt,
      isLoading: isCloudLoading,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refresh: () => refreshFromCloud({ migrateIfEmpty: true }),
    },
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};
