import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateDemoData } from '../utils/demoData';

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
  { id: 'wallet-cash', name: 'เงินสด', color: '#10b981', type: 'cash' },
  { id: 'wallet-bank', name: 'บัญชีธนาคาร', color: '#3b82f6', type: 'bank' },
  { id: 'wallet-ktc', name: 'บัตรเครดิต', color: '#f43f5e', type: 'credit' }
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
  // Wallets
  const [wallets, setWallets] = useState(() => loadData(STORAGE_KEYS.WALLETS, DEFAULT_WALLETS));
  
  // Theme state: dark, oled, light, nordic
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Global Currency: THB, USD, EUR, JPY, GBP
  const [currency, setCurrency] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'THB';
    } catch {
      return 'THB';
    }
  });

  // Recurring transactions state
  const [recurringTxs, setRecurringTxs] = useState(() => loadData(STORAGE_KEYS.RECURRING, []));

  // Transactions (Make sure they have walletId, migrate if missing)
  const [transactions, setTransactions] = useState(() => {
    const stored = loadData(STORAGE_KEYS.TRANSACTIONS, []);
    const migrated = stored.map(tx => ({
      ...tx,
      walletId: tx.walletId || (wallets[0]?.id || 'wallet-cash')
    }));
    return migrated.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  });

  const [budgets, setBudgets] = useState(() => loadData(STORAGE_KEYS.BUDGETS, {}));
  const [goals, setGoals] = useState(() => loadData(STORAGE_KEYS.GOALS, []));

  // Sync to localStorage
  useEffect(() => {
    persistData(STORAGE_KEYS.TRANSACTIONS, transactions);
  }, [transactions]);

  useEffect(() => {
    persistData(STORAGE_KEYS.BUDGETS, budgets);
  }, [budgets]);

  useEffect(() => {
    persistData(STORAGE_KEYS.GOALS, goals);
  }, [goals]);

  useEffect(() => {
    persistData(STORAGE_KEYS.WALLETS, wallets);
  }, [wallets]);

  useEffect(() => {
    persistData(STORAGE_KEYS.CURRENCY, currency);
  }, [currency]);

  useEffect(() => {
    persistData(STORAGE_KEYS.RECURRING, recurringTxs);
  }, [recurringTxs]);

  // Apply Theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-oled', 'theme-light', 'theme-nordic');
    root.classList.add(`theme-${theme}`);
    persistData(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Actions
  const addTransaction = (tx) => {
    if (!tx?.type || !tx?.category || !tx?.date || !isPositiveAmount(tx.amount)) {
      console.warn('Rejected invalid transaction payload.', tx);
      return false;
    }

    setTransactions((prev) => {
      const newTx = { 
        ...tx, 
        id: generateUUID(), 
        timestamp: Date.now(),
        amount: Number(tx.amount),
        walletId: tx.walletId || wallets[0]?.id || 'wallet-cash'
      };
      const updated = [newTx, ...prev].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      return updated;
    });

    return true;
  };

  const deleteTransaction = (id) => {
    setTransactions((prev) => {
      const txToDelete = prev.find(t => t.id === id);
      if (txToDelete && txToDelete.linkedTxId) {
        return prev.filter(t => t.id !== id && t.id !== txToDelete.linkedTxId);
      }
      return prev.filter((t) => t.id !== id);
    });
  };

  const updateTransaction = (id, updatedTx) => {
    if (!id || !isPositiveAmount(updatedTx.amount)) {
      console.warn('Rejected invalid transaction update payload.', { id, updatedTx });
      return false;
    }

    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updatedTx, amount: Number(updatedTx.amount) } : t));
      return updated.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    });

    return true;
  };

  const transferWallet = ({ fromWalletId, toWalletId, amount, date, note }) => {
    if (!fromWalletId || !toWalletId || fromWalletId === toWalletId || !date || !isPositiveAmount(amount)) {
      console.warn('Rejected invalid wallet transfer payload.', { fromWalletId, toWalletId, amount, date });
      return false;
    }

    setTransactions((prev) => {
      const baseId = generateUUID();
      const transferAmount = Number(amount);
      const timestamp = Date.now();
      const outTx = {
        id: `out-${baseId}`,
        type: 'expense',
        category: 'transfer_out',
        amount: transferAmount,
        date,
        note: note || 'โอนเงินระหว่างบัญชี',
        walletId: fromWalletId,
        isTransfer: true,
        linkedTxId: `in-${baseId}`,
        timestamp
      };
      const inTx = {
        id: `in-${baseId}`,
        type: 'income',
        category: 'transfer_in',
        amount: transferAmount,
        date,
        note: note || 'รับโอนเงินระหว่างบัญชี',
        walletId: toWalletId,
        isTransfer: true,
        linkedTxId: `out-${baseId}`,
        timestamp: timestamp + 1
      };
      
      const updated = [outTx, inTx, ...prev].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      return updated;
    });

    return true;
  };

  const updateBudget = (categoryId, amount) => {
    if (!categoryId || Number(amount) < 0 || !Number.isFinite(Number(amount))) {
      console.warn('Rejected invalid budget update payload.', { categoryId, amount });
      return false;
    }

    setBudgets((prev) => ({ ...prev, [categoryId]: Number(amount) }));
    return true;
  };

  const deleteBudget = (categoryId) => {
    if (!categoryId) {
      console.warn('Rejected invalid budget delete payload.', { categoryId });
      return false;
    }

    setBudgets((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    return true;
  };

  // Advanced Budget Transfer
  const transferBudget = (fromCatId, toCatId, amount) => {
    setBudgets((prev) => {
      const fromLimit = prev[fromCatId] || 0;
      const toLimit = prev[toCatId] || 0;
      if (fromLimit < amount) return prev;
      return {
        ...prev,
        [fromCatId]: Math.max(0, fromLimit - amount),
        [toCatId]: toLimit + amount
      };
    });
  };

  const addGoal = (goal) => {
    setGoals((prev) => [...prev, { 
      ...goal, 
      id: generateUUID(), 
      currentAmount: goal.currentAmount || 0,
      targetDate: goal.targetDate || '',
      icon: goal.icon || 'Target'
    }]);
  };

  const updateGoal = (id, newAmount) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, currentAmount: newAmount } : g))
    );
  };

  const deleteGoal = (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // Wallet actions
  const addWallet = (wallet) => {
    setWallets(prev => [...prev, { ...wallet, id: `wallet-${generateUUID()}` }]);
  };

  const updateWallet = (id, updatedWallet) => {
    setWallets(prev => prev.map(w => w.id === id ? { ...w, ...updatedWallet } : w));
  };

  const deleteWallet = (id) => {
    setWallets(prev => prev.filter(w => w.id !== id));
    // Set associated transactions to first wallet
    setTransactions(prev => prev.map(tx => tx.walletId === id ? { ...tx, walletId: wallets.find(w => w.id !== id)?.id || 'wallet-cash' } : tx));
  };

  // Recurring Bill Actions
  const addRecurringTx = (bill) => {
    setRecurringTxs(prev => [...prev, { ...bill, id: `rec-${generateUUID()}`, lastTriggered: '' }]);
  };

  const deleteRecurringTx = (id) => {
    setRecurringTxs(prev => prev.filter(r => r.id !== id));
  };

  const triggerRecurringTx = (id, walletId) => {
    const bill = recurringTxs.find(r => r.id === id);
    if (!bill) return;

    addTransaction({
      type: bill.type,
      category: bill.category,
      amount: bill.amount,
      date: new Date().toISOString().split('T')[0],
      note: `ชำระรอบบิลอัตโนมัติ: ${bill.name}`,
      walletId: walletId || bill.walletId || wallets[0]?.id || 'wallet-cash'
    });

    setRecurringTxs(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, lastTriggered: new Date().toISOString().split('T')[0] };
      }
      return r;
    }));
  };

  // Load Demo Data
  const loadDemoData = () => {
    const demo = generateDemoData();
    setWallets(demo.wallets);
    setBudgets(demo.budgets);
    setGoals(demo.goals);
    setTransactions(demo.transactions);
    
    // Add default recurring bills for demo
    setRecurringTxs([
      { id: 'rec-demo-netflix', name: 'บิลรายเดือน Netflix Premium', type: 'expense', category: 'shopping', amount: 419, walletId: 'wallet-ktc', interval: 'monthly', lastTriggered: '' },
      { id: 'rec-demo-electric', name: 'ค่าไฟฟ้าน้ำประปาบ้าน', type: 'expense', category: 'home', amount: 2850, walletId: 'wallet-scb', interval: 'monthly', lastTriggered: '' },
      { id: 'rec-demo-salary', name: 'เงินปันผลรายเดือนจากพอร์ตหุ้น', type: 'income', category: 'dividend', amount: 3500, walletId: 'wallet-kbank', interval: 'monthly', lastTriggered: '' }
    ]);
  };

  const resetAllData = () => {
    setTransactions([]);
    setBudgets({});
    setGoals([]);
    setWallets(DEFAULT_WALLETS);
    setTheme('dark');
    setCurrency('THB');
    setRecurringTxs([]);
  };

  // Full backup/restore
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
      if (!isPlainObject(parsed)) {
        console.warn('Import file is not a valid finance backup object.');
        return false;
      }

      if (parsed.wallets !== undefined && !Array.isArray(parsed.wallets)) return false;
      if (parsed.recurringTxs !== undefined && !Array.isArray(parsed.recurringTxs)) return false;
      if (parsed.transactions !== undefined && !Array.isArray(parsed.transactions)) return false;
      if (parsed.goals !== undefined && !Array.isArray(parsed.goals)) return false;
      if (parsed.budgets !== undefined && !isPlainObject(parsed.budgets)) return false;

      if (parsed.wallets) setWallets(parsed.wallets);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.currency) setCurrency(parsed.currency);
      if (parsed.recurringTxs) setRecurringTxs(parsed.recurringTxs);
      if (parsed.transactions) {
        setTransactions(parsed.transactions.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (b.timestamp || 0) - (a.timestamp || 0);
        }));
      }
      if (parsed.budgets) setBudgets(parsed.budgets);
      if (parsed.goals) setGoals(parsed.goals);
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
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};
