import React, { createContext, useContext, useState, useEffect } from 'react';
import { generateDemoData } from '../utils/demoData';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
  } catch {
    return defaultValue;
  }
};

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
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WALLETS, JSON.stringify(wallets));
  }, [wallets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(recurringTxs));
  }, [recurringTxs]);

  // Apply Theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-oled', 'theme-light', 'theme-nordic');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Actions
  const addTransaction = (tx) => {
    setTransactions((prev) => {
      const newTx = { 
        ...tx, 
        id: generateUUID(), 
        timestamp: Date.now(),
        walletId: tx.walletId || wallets[0]?.id || 'wallet-cash'
      };
      const updated = [newTx, ...prev].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      return updated;
    });
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
    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updatedTx } : t));
      return updated.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    });
  };

  const transferWallet = (fromWalletId, toWalletId, amount, date, note) => {
    setTransactions((prev) => {
      const baseId = generateUUID();
      const outTx = {
        id: `out-${baseId}`,
        type: 'expense',
        category: 'transfer_out',
        amount: parseFloat(amount),
        date,
        note: note || 'โอนเงินระหว่างบัญชี',
        walletId: fromWalletId,
        isTransfer: true,
        linkedTxId: `in-${baseId}`,
        timestamp: Date.now()
      };
      const inTx = {
        id: `in-${baseId}`,
        type: 'income',
        category: 'transfer_in',
        amount: parseFloat(amount),
        date,
        note: note || 'รับโอนเงินระหว่างบัญชี',
        walletId: toWalletId,
        isTransfer: true,
        linkedTxId: `out-${baseId}`,
        timestamp: Date.now() + 1
      };
      
      const updated = [outTx, inTx, ...prev].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      return updated;
    });
  };

  const updateBudget = (categoryId, amount) => {
    setBudgets((prev) => ({ ...prev, [categoryId]: amount }));
  };

  // Advanced Budget Transfer
  const transferBudget = (fromCatId, toCatId, amount) => {
    setBudgets((prev) => {
      const fromLimit = prev[fromCatId] || 0;
      const toLimit = prev[toCatId] || 0;
      if (fromLimit < amount) return prev; // Avoid transferring more than limit
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
      if (parsed.wallets) setWallets(parsed.wallets);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.currency) setCurrency(parsed.currency);
      if (parsed.recurringTxs) setRecurringTxs(parsed.recurringTxs);
      if (parsed.transactions) setTransactions(parsed.transactions);
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
