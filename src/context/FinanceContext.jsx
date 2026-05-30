import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { generateDemoData } from '../utils/demoData';
import { supabase, supabaseAvailable } from '../utils/supabaseClient';

const DEVICE_ID_KEY = 'family_finance_device_id';

const getOrCreateDeviceId = () => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return `dev-${Date.now()}`;
  }
};

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
  MIMO_API_KEY: 'family_finance_mimo_api_key',
  MIMO_MODEL: 'family_finance_mimo_model',
};

const DEFAULT_WALLETS = [
  { id: 'wallet-cash', name: 'เงินสด', color: '#10b981', type: 'cash' },
  { id: 'wallet-bank', name: 'บัญชีธนาคาร', color: '#3b82f6', type: 'bank' },
  { id: 'wallet-ktc', name: 'บัตรเครดิต', color: '#f43f5e', type: 'credit' }
];

const getStorageKey = (key, userId) => {
  return userId ? `${key}_${userId}` : key;
};

const loadData = (key, defaultValue, userId) => {
  try {
    const raw = localStorage.getItem(getStorageKey(key, userId));
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load ${getStorageKey(key, userId)} from localStorage. Falling back to default value.`, error);
    return defaultValue;
  }
};

const persistData = (key, value, userId) => {
  try {
    localStorage.setItem(getStorageKey(key, userId), typeof value === 'string' ? value : JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist ${getStorageKey(key, userId)} to localStorage.`, error);
  }
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const isPositiveAmount = (amount) => Number.isFinite(Number(amount)) && Number(amount) > 0;

const throwIfSupabaseError = ({ error }) => {
  if (error) throw error;
};

// Database snake_case to client camelCase mappers
const mapTxToDb = (tx, userId) => ({
  id: tx.id,
  user_id: userId,
  type: tx.type,
  category: tx.category,
  amount: Number(tx.amount),
  date: tx.date,
  note: tx.note || null,
  wallet_id: tx.walletId || null,
  is_transfer: !!tx.isTransfer,
  linked_tx_id: tx.linkedTxId || null,
  timestamp: tx.timestamp || Date.now(),
});

const mapDbToTx = (db) => ({
  id: db.id,
  type: db.type,
  category: db.category,
  amount: Number(db.amount),
  date: db.date,
  note: db.note || '',
  walletId: db.wallet_id || '',
  isTransfer: !!db.is_transfer,
  linkedTxId: db.linked_tx_id || '',
  timestamp: db.timestamp ? Number(db.timestamp) : Date.now(),
});


const mapDbToBudgets = (rows) => {
  const budgets = {};
  rows.forEach(r => {
    budgets[r.category_id] = Number(r.amount);
  });
  return budgets;
};

const mapGoalToDb = (goal, userId) => ({
  id: goal.id,
  user_id: userId,
  name: goal.name,
  target_amount: Number(goal.targetAmount),
  current_amount: Number(goal.currentAmount || 0),
  target_date: goal.targetDate || null,
  icon: goal.icon || 'Target',
  color: goal.color || '#3b82f6',
});

const mapDbToGoal = (db) => ({
  id: db.id,
  name: db.name,
  targetAmount: Number(db.target_amount),
  currentAmount: Number(db.current_amount),
  targetDate: db.target_date || '',
  icon: db.icon || 'Target',
  color: db.color || '#3b82f6',
});

const mapRecurringToDb = (rec, userId) => ({
  id: rec.id,
  user_id: userId,
  name: rec.name,
  type: rec.type,
  category: rec.category,
  amount: Number(rec.amount),
  wallet_id: rec.walletId || null,
  interval: rec.interval,
  due_day: Number(rec.dueDay),
  last_triggered: rec.lastTriggered || null,
});

const mapDbToRecurring = (db) => ({
  id: db.id,
  name: db.name,
  type: db.type,
  category: db.category,
  amount: Number(db.amount),
  walletId: db.wallet_id || '',
  interval: db.interval,
  dueDay: Number(db.due_day),
  lastTriggered: db.last_triggered || '',
});

const mapWalletToDb = (w, userId) => ({
  id: w.id,
  user_id: userId,
  name: w.name,
  color: w.color,
  type: w.type || 'bank',
});

const mapDbToWallet = (db) => ({
  id: db.id,
  name: db.name,
  color: db.color,
  type: db.type,
});

const FinanceContext = createContext();

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

export const FinanceProvider = ({ children }) => {
  // Sync states
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('DISCONNECTED');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Wallets
  const [wallets, setWallets] = useState(() => loadData(STORAGE_KEYS.WALLETS, DEFAULT_WALLETS, null));
  
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
  const [recurringTxs, setRecurringTxs] = useState(() => loadData(STORAGE_KEYS.RECURRING, [], null));

  // Mimo AI API Key and Model state
  const [mimoApiKey, setMimoApiKey] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.MIMO_API_KEY) || import.meta.env.VITE_MIMO_API_KEY || '';
    } catch {
      return import.meta.env.VITE_MIMO_API_KEY || '';
    }
  });

  const [mimoModel, setMimoModel] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.MIMO_MODEL) || 'mimo-v2.5-pro';
    } catch {
      return 'mimo-v2.5-pro';
    }
  });

  // Transactions (Make sure they have walletId, migrate if missing)
  const [transactions, setTransactions] = useState(() => {
    const stored = loadData(STORAGE_KEYS.TRANSACTIONS, [], null);
    const migrated = stored.map(tx => ({
      ...tx,
      walletId: tx.walletId || (wallets[0]?.id || 'wallet-cash')
    }));
    return migrated.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  });

  const [budgets, setBudgets] = useState(() => loadData(STORAGE_KEYS.BUDGETS, {}, null));
  const [goals, setGoals] = useState(() => loadData(STORAGE_KEYS.GOALS, [], null));

  // Actions
  const reportCloudError = useCallback((action, error) => {
    const message = error?.message || 'ไม่สามารถซิงก์ข้อมูลกับ Supabase ได้';
    const fullMessage = `${action}: ${message}`;
    setSyncError(fullMessage);
    console.error(fullMessage, error);
    return false;
  }, []);

  const fetchCloudData = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const [dbWalletsRes, dbTxsRes, dbBudgetsRes, dbGoalsRes, dbRecurringRes] = await Promise.all([
        supabase.from('wallets').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('budgets').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('recurring_txs').select('*').eq('user_id', userId)
      ]);

      if (dbWalletsRes.error) throw dbWalletsRes.error;
      if (dbTxsRes.error) throw dbTxsRes.error;
      if (dbBudgetsRes.error) throw dbBudgetsRes.error;
      if (dbGoalsRes.error) throw dbGoalsRes.error;
      if (dbRecurringRes.error) throw dbRecurringRes.error;

      const clientWallets = dbWalletsRes.data.map(mapDbToWallet);
      const clientTxs = dbTxsRes.data.map(mapDbToTx).sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      const clientBudgets = mapDbToBudgets(dbBudgetsRes.data);
      const clientGoals = dbGoalsRes.data.map(mapDbToGoal);
      const clientRecurring = dbRecurringRes.data.map(mapDbToRecurring);

      if (clientWallets.length === 0) {
        const defaultWalletsWithUser = DEFAULT_WALLETS.map(w => mapWalletToDb(w, userId));
        const { error: insertErr } = await supabase
          .from('wallets')
          .insert(defaultWalletsWithUser);
        if (insertErr) console.error("Error inserting default wallets:", insertErr);
        
        setWallets(DEFAULT_WALLETS);
        persistData(STORAGE_KEYS.WALLETS, DEFAULT_WALLETS, userId);
      } else {
        setWallets(clientWallets);
        persistData(STORAGE_KEYS.WALLETS, clientWallets, userId);
      }

      setTransactions(clientTxs);
      persistData(STORAGE_KEYS.TRANSACTIONS, clientTxs, userId);

      setBudgets(clientBudgets);
      persistData(STORAGE_KEYS.BUDGETS, clientBudgets, userId);

      setGoals(clientGoals);
      persistData(STORAGE_KEYS.GOALS, clientGoals, userId);

      setRecurringTxs(clientRecurring);
      persistData(STORAGE_KEYS.RECURRING, clientRecurring, userId);
      setLastSyncedAt(new Date().toISOString());
      setSyncError('');
    } catch (err) {
      reportCloudError('Cloud refresh failed', err);
      throw err;
    }
  }, [reportCloudError]);

  const loadUserStates = useCallback(async (currentUser) => {
    setSyncing(true);
    // Load cached data immediately so UI is not empty
    const cachedWallets = loadData(STORAGE_KEYS.WALLETS, DEFAULT_WALLETS, currentUser.id);
    const cachedTxs = loadData(STORAGE_KEYS.TRANSACTIONS, [], currentUser.id);
    const cachedBudgets = loadData(STORAGE_KEYS.BUDGETS, {}, currentUser.id);
    const cachedGoals = loadData(STORAGE_KEYS.GOALS, [], currentUser.id);
    const cachedRecurring = loadData(STORAGE_KEYS.RECURRING, [], currentUser.id);

    setWallets(cachedWallets);
    setTransactions(cachedTxs);
    setBudgets(cachedBudgets);
    setGoals(cachedGoals);
    setRecurringTxs(cachedRecurring);

    // Always attempt to fetch fresh data from cloud
    // (do NOT check navigator.onLine — it gives false negatives in PWA)
    try {
      await fetchCloudData(currentUser.id);
    } catch (err) {
      console.warn('[Sync] Cloud fetch failed, using cached data:', err.message);
    }
    setSyncing(false);
  }, [fetchCloudData]);

  // Browser online state listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync with Supabase — no login required
  // Uses anonymous auth or device ID for single-user setup
  useEffect(() => {
    let active = true;

    if (!supabaseAvailable) {
      // No valid Supabase key — pure localStorage mode, works perfectly
      setSyncing(false);
      return () => { active = false; };
    }

    // Try to get existing session or sign in anonymously
    (async () => {
      try {
        // Check for existing session first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!active) return;
        
        if (session?.user) {
          // Already have a session — use it
          setUser(session.user);
          try {
            await loadUserStates(session.user);
          } catch (err) {
            console.warn('[Sync] Cloud fetch failed, using local data:', err.message);
          }
        } else {
          // No session — sign in anonymously (no user interaction needed)
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!active) return;
          
          if (error) {
            console.warn('[Auth] Anonymous sign-in failed:', error.message);
            setSyncError('ซิงก์ cloud ไม่ได้ — ใช้ข้อมูลในเครื่อง');
            setSyncing(false);
            return;
          }
          
          if (data?.user) {
            setUser(data.user);
            try {
              await loadUserStates(data.user);
            } catch (err) {
              console.warn('[Sync] Cloud fetch failed after auth:', err.message);
            }
          }
        }
      } catch (err) {
        if (!active) return;
        console.warn('[Auth] Auto-sync setup failed:', err.message);
        setSyncError('เชื่อมต่อ Supabase ไม่ได้ — ใช้ข้อมูลในเครื่อง');
        setSyncing(false);
      }
    })();

    // Listen for auth state changes (token refresh, etc.)
    let subscription = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!active) return;
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          // Just update user, don't re-fetch
          if (session?.user) setUser(session.user);
          return;
        }
        if (session?.user) {
          setUser(session.user);
        }
      });
      subscription = data?.subscription ?? null;
    } catch (err) {
      console.warn('[Auth] onAuthStateChange setup failed:', err.message);
    }

    return () => {
      active = false;
      subscription?.unsubscribe?.();
    };
  }, [loadUserStates]);

  // Sync to localStorage
  useEffect(() => {
    if (!syncing) {
      persistData(STORAGE_KEYS.TRANSACTIONS, transactions, user?.id);
    }
  }, [transactions, user, syncing]);

  useEffect(() => {
    if (!syncing) {
      persistData(STORAGE_KEYS.BUDGETS, budgets, user?.id);
    }
  }, [budgets, user, syncing]);

  useEffect(() => {
    if (!syncing) {
      persistData(STORAGE_KEYS.GOALS, goals, user?.id);
    }
  }, [goals, user, syncing]);

  useEffect(() => {
    if (!syncing) {
      persistData(STORAGE_KEYS.WALLETS, wallets, user?.id);
    }
  }, [wallets, user, syncing]);

  useEffect(() => {
    if (!syncing) {
      persistData(STORAGE_KEYS.RECURRING, recurringTxs, user?.id);
    }
  }, [recurringTxs, user, syncing]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MIMO_API_KEY, mimoApiKey);
    } catch (e) {
      console.error('Failed to save Mimo API Key', e);
    }
  }, [mimoApiKey]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MIMO_MODEL, mimoModel);
    } catch (e) {
      console.error('Failed to save Mimo Model', e);
    }
  }, [mimoModel]);

  // Apply Theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-oled', 'theme-light', 'theme-nordic');
    root.classList.add(`theme-${theme}`);
    persistData(STORAGE_KEYS.THEME, theme, null);
  }, [theme]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!user || !supabaseAvailable) {
      setRealtimeStatus('DISCONNECTED');
      return;
    }

    setRealtimeStatus('CONNECTING');
    let channel;

    try {
    channel = supabase
      .channel(`sync-changes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        (payload) => {
          // Only process rows belonging to this user
          const rowUserId = payload.new?.user_id || payload.old?.user_id;
          if (rowUserId !== user.id) return;
          if (payload.eventType === 'INSERT') {
            const newWallet = mapDbToWallet(payload.new);
            setWallets(prev => {
              if (prev.some(w => w.id === newWallet.id)) return prev;
              return [...prev, newWallet];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedWallet = mapDbToWallet(payload.new);
            setWallets(prev => prev.map(w => w.id === updatedWallet.id ? updatedWallet : w));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setWallets(prev => prev.filter(w => w.id !== deletedId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          const rowUserId = payload.new?.user_id || payload.old?.user_id;
          if (rowUserId !== user.id) return;
          if (payload.eventType === 'INSERT') {
            const newTx = mapDbToTx(payload.new);
            setTransactions(prev => {
              if (prev.some(t => t.id === newTx.id)) return prev;
              const updated = [newTx, ...prev];
              return updated.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                return (b.timestamp || 0) - (a.timestamp || 0);
              });
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTx = mapDbToTx(payload.new);
            setTransactions(prev => {
              const updated = prev.map(t => t.id === updatedTx.id ? updatedTx : t);
              return updated.sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                return (b.timestamp || 0) - (a.timestamp || 0);
              });
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setTransactions(prev => prev.filter(t => t.id !== deletedId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'budgets' },
        (payload) => {
          const rowUserId = payload.new?.user_id || payload.old?.user_id;
          if (rowUserId !== user.id) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const catId = payload.new.category_id;
            const amount = Number(payload.new.amount);
            setBudgets(prev => ({ ...prev, [catId]: amount }));
          } else if (payload.eventType === 'DELETE') {
            const catId = payload.old.category_id;
            setBudgets(prev => {
              const next = { ...prev };
              delete next[catId];
              return next;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals' },
        (payload) => {
          const rowUserId = payload.new?.user_id || payload.old?.user_id;
          if (rowUserId !== user.id) return;
          if (payload.eventType === 'INSERT') {
            const newGoal = mapDbToGoal(payload.new);
            setGoals(prev => {
              if (prev.some(g => g.id === newGoal.id)) return prev;
              return [...prev, newGoal];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedGoal = mapDbToGoal(payload.new);
            setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setGoals(prev => prev.filter(g => g.id !== deletedId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recurring_txs' },
        (payload) => {
          const rowUserId = payload.new?.user_id || payload.old?.user_id;
          if (rowUserId !== user.id) return;
          if (payload.eventType === 'INSERT') {
            const newRec = mapDbToRecurring(payload.new);
            setRecurringTxs(prev => {
              if (prev.some(r => r.id === newRec.id)) return prev;
              return [...prev, newRec];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRec = mapDbToRecurring(payload.new);
            setRecurringTxs(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setRecurringTxs(prev => prev.filter(r => r.id !== deletedId));
          }
        }
      )
      .subscribe((status, err) => {
        setRealtimeStatus(status);
        if (status === 'SUBSCRIBED') {
          setSyncError('');
          console.log('[Realtime] Connected — listening for cross-device changes');
        } else if (status === 'CHANNEL_ERROR') {
          reportCloudError('Realtime channel failed', err);
          console.error('[Realtime] Channel error:', err);
        } else if (status === 'TIMED_OUT') {
          setSyncError('Realtime connection timed out. กำลังใช้ polling สำรองทุก 30 วินาที');
          console.warn('[Realtime] Subscription timed out');
        } else {
          console.log('[Realtime] Status:', status);
        }
      });

    } catch (err) {
      console.warn('[Realtime] Failed to set up realtime subscriptions:', err.message);
      setRealtimeStatus('CHANNEL_ERROR');
      reportCloudError('Realtime setup failed', err);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      setRealtimeStatus('DISCONNECTED');
    };
  }, [user, reportCloudError]);

  // Manual refresh from cloud (pull latest data)
  const refreshFromCloud = useCallback(async () => {
    if (!user) return { success: false, error: 'ไม่ได้เชื่อมต่อ' };
    setSyncing(true);
    try {
      await fetchCloudData(user.id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setSyncing(false);
    }
  }, [user, fetchCloudData]);

  // --- Polling: ดึงข้อมูลจาก Supabase ทุก 30 วินาที (fallback เมื่อ Realtime ไม่ส่ง event) ---
  useEffect(() => {
    if (!user) return;
    const POLL_INTERVAL = 30_000; // 30 seconds
    const interval = window.setInterval(async () => {
      try {
        await fetchCloudData(user.id);
      } catch (err) {
        console.warn('[Polling] fetchCloudData error:', err);
      }
    }, POLL_INTERVAL);
    return () => window.clearInterval(interval);
  }, [user, fetchCloudData]);

  // --- Visibility: refresh ทันทีเมื่อผู้ใช้กลับมาที่ tab/แอพ ---
  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[Sync] Tab visible — refreshing from cloud...');
        try {
          await fetchCloudData(user.id);
        } catch (err) {
          console.warn('[Sync] visibilitychange fetch error:', err);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, fetchCloudData]);



  const syncLocalDataToCloud = async () => {
    if (!user) return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนซิงก์ข้อมูล' };

    setSyncing(true);
    try {
      const offlineWallets = loadData(STORAGE_KEYS.WALLETS, DEFAULT_WALLETS, null);
      const offlineTxs = loadData(STORAGE_KEYS.TRANSACTIONS, [], null);
      const offlineBudgets = loadData(STORAGE_KEYS.BUDGETS, {}, null);
      const offlineGoals = loadData(STORAGE_KEYS.GOALS, [], null);
      const offlineRecurring = loadData(STORAGE_KEYS.RECURRING, [], null);

      const [dbWalletsRes, dbTxsRes, dbGoalsRes, dbRecurringRes] = await Promise.all([
        supabase.from('wallets').select('id').eq('user_id', user.id),
        supabase.from('transactions').select('id').eq('user_id', user.id),
        supabase.from('goals').select('id').eq('user_id', user.id),
        supabase.from('recurring_txs').select('id').eq('user_id', user.id)
      ]);

      const dbWalletIds = new Set((dbWalletsRes.data || []).map(w => w.id));
      const dbTxIds = new Set((dbTxsRes.data || []).map(t => t.id));
      const dbGoalIds = new Set((dbGoalsRes.data || []).map(g => g.id));
      const dbRecurringIds = new Set((dbRecurringRes.data || []).map(r => r.id));

      const walletsToInsert = offlineWallets
        .filter(w => !dbWalletIds.has(w.id))
        .map(w => mapWalletToDb(w, user.id));

      const txsToInsert = offlineTxs
        .filter(t => !dbTxIds.has(t.id))
        .map(t => mapTxToDb(t, user.id));

      const budgetsToUpsert = Object.entries(offlineBudgets).map(([catId, amount]) => ({
        user_id: user.id,
        category_id: catId,
        amount: Number(amount)
      }));

      const goalsToInsert = offlineGoals
        .filter(g => !dbGoalIds.has(g.id))
        .map(g => mapGoalToDb(g, user.id));

      const recurringToInsert = offlineRecurring
        .filter(r => !dbRecurringIds.has(r.id))
        .map(r => mapRecurringToDb(r, user.id));

      if (walletsToInsert.length > 0) {
        const { error } = await supabase.from('wallets').insert(walletsToInsert);
        if (error) throw error;
      }
      if (txsToInsert.length > 0) {
        const { error } = await supabase.from('transactions').insert(txsToInsert);
        if (error) throw error;
      }
      if (budgetsToUpsert.length > 0) {
        const { error } = await supabase.from('budgets').upsert(budgetsToUpsert, { onConflict: 'user_id,category_id' });
        if (error) throw error;
      }
      if (goalsToInsert.length > 0) {
        const { error } = await supabase.from('goals').insert(goalsToInsert);
        if (error) throw error;
      }
      if (recurringToInsert.length > 0) {
        const { error } = await supabase.from('recurring_txs').insert(recurringToInsert);
        if (error) throw error;
      }

      await fetchCloudData(user.id);

      localStorage.removeItem(STORAGE_KEYS.WALLETS);
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.BUDGETS);
      localStorage.removeItem(STORAGE_KEYS.GOALS);
      localStorage.removeItem(STORAGE_KEYS.RECURRING);

      return { success: true };
    } catch (error) {
      reportCloudError('Manual cloud sync failed', error);
      return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการซิงก์ข้อมูล' };
    } finally {
      setSyncing(false);
    }
  };

  const login = async (email, password) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setSyncing(false);
    }
  };

  const signUp = async (email, password) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setSyncing(false);
    }
  };

  const logout = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setSyncing(false);
    }
  };

  const addTransaction = async (tx) => {
    if (!tx?.type || !tx?.category || !tx?.date || !isPositiveAmount(tx.amount)) {
      console.warn('Rejected invalid transaction payload.', tx);
      return false;
    }

    const newTx = { 
      ...tx, 
      id: generateUUID(), 
      timestamp: Date.now(),
      amount: Number(tx.amount),
      walletId: tx.walletId || wallets[0]?.id || 'wallet-cash'
    };

    if (user) {
      try {
        const { error } = await supabase
          .from('transactions')
          .insert(mapTxToDb(newTx, user.id));
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Add transaction failed', err);
      }
    }

    setTransactions((prev) => {
      const updated = [newTx, ...prev].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      return updated;
    });

    return true;
  };

  const deleteTransaction = async (id) => {
    const txToDelete = transactions.find(t => t.id === id);
    const idsToDelete = txToDelete?.linkedTxId ? [id, txToDelete.linkedTxId] : [id];

    if (user) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id)
          .in('id', idsToDelete);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Delete transaction failed', err);
      }
    }

    setTransactions((prev) => {
      if (txToDelete && txToDelete.linkedTxId) {
        return prev.filter(t => t.id !== id && t.id !== txToDelete.linkedTxId);
      }
      return prev.filter((t) => t.id !== id);
    });

    return true;
  };

  const updateTransaction = async (id, updatedTx) => {
    if (!id || !isPositiveAmount(updatedTx.amount)) {
      console.warn('Rejected invalid transaction update payload.', { id, updatedTx });
      return false;
    }

    const existingTx = transactions.find((t) => t.id === id);
    if (!existingTx) {
      console.warn('Rejected transaction update because the row was not found.', { id });
      return false;
    }

    const mergedTx = { ...existingTx, ...updatedTx, amount: Number(updatedTx.amount) };

    if (user) {
      try {
        const { error } = await supabase
          .from('transactions')
          .update(mapTxToDb(mergedTx, user.id))
          .eq('user_id', user.id)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Update transaction failed', err);
      }
    }

    setTransactions((prev) => {
      const updated = prev.map((t) => (t.id === id ? mergedTx : t));
      return updated.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    });

    return true;
  };

  const transferWallet = async ({ fromWalletId, toWalletId, amount, date, note }) => {
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

    if (user) {
      try {
        const { error } = await supabase
          .from('transactions')
          .insert([
            mapTxToDb(outTx, user.id),
            mapTxToDb(inTx, user.id)
          ]);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Transfer failed', err);
      }
    }

    setTransactions((prev) => {
      const updated = [outTx, inTx, ...prev].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
      return updated;
    });

    return true;
  };

  const updateBudget = async (categoryId, amount) => {
    if (!categoryId || Number(amount) < 0 || !Number.isFinite(Number(amount))) {
      console.warn('Rejected invalid budget update payload.', { categoryId, amount });
      return false;
    }

    if (user) {
      try {
        const { error } = await supabase
          .from('budgets')
          .upsert({
            user_id: user.id,
            category_id: categoryId,
            amount: Number(amount)
          }, { onConflict: 'user_id,category_id' });
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Update budget failed', err);
      }
    }

    setBudgets((prev) => ({ ...prev, [categoryId]: Number(amount) }));
    return true;
  };

  const deleteBudget = async (categoryId) => {
    if (!categoryId) {
      console.warn('Rejected invalid budget delete payload.', { categoryId });
      return false;
    }

    if (user) {
      try {
        const { error } = await supabase
          .from('budgets')
          .delete()
          .eq('user_id', user.id)
          .eq('category_id', categoryId);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Delete budget failed', err);
      }
    }

    setBudgets((prev) => {
      const next = { ...prev };
      delete next[categoryId];
      return next;
    });
    return true;
  };

  const transferBudget = async (fromCatId, toCatId, amount) => {
    const transferAmount = Number(amount);
    const fromLimit = budgets[fromCatId] || 0;
    const toLimit = budgets[toCatId] || 0;
    if (!fromCatId || !toCatId || fromCatId === toCatId || !isPositiveAmount(transferAmount) || fromLimit < transferAmount) {
      console.warn('Rejected invalid budget transfer payload.', { fromCatId, toCatId, amount });
      return false;
    }

    const nextFromAmount = Math.max(0, fromLimit - transferAmount);
    const nextToAmount = toLimit + transferAmount;

    if (user) {
      try {
        const { error } = await supabase
          .from('budgets')
          .upsert([
            { user_id: user.id, category_id: fromCatId, amount: nextFromAmount },
            { user_id: user.id, category_id: toCatId, amount: nextToAmount }
          ], { onConflict: 'user_id,category_id' });
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Transfer budget failed', err);
      }
    }

    setBudgets((prev) => ({
      ...prev,
      [fromCatId]: nextFromAmount,
      [toCatId]: nextToAmount
    }));
    return true;
  };

  const addGoal = async (goal) => {
    const newGoal = { 
      ...goal, 
      id: generateUUID(), 
      currentAmount: goal.currentAmount || 0,
      targetDate: goal.targetDate || '',
      icon: goal.icon || 'Target',
      color: goal.color || '#3b82f6'
    };

    if (user) {
      try {
        const { error } = await supabase
          .from('goals')
          .insert(mapGoalToDb(newGoal, user.id));
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Add goal failed', err);
      }
    }

    setGoals((prev) => [...prev, newGoal]);
    return true;
  };

  const updateGoal = async (id, newAmount) => {
    const existingGoal = goals.find((goal) => goal.id === id);
    if (!existingGoal || Number(newAmount) < 0 || !Number.isFinite(Number(newAmount))) {
      console.warn('Rejected invalid goal update payload.', { id, newAmount });
      return false;
    }

    const updatedGoal = { ...existingGoal, currentAmount: Number(newAmount) };

    if (user) {
      try {
        const { error } = await supabase
          .from('goals')
          .update({ current_amount: Number(newAmount) })
          .eq('user_id', user.id)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Update goal failed', err);
      }
    }

    setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));
    return true;
  };

  const deleteGoal = async (id) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('goals')
          .delete()
          .eq('user_id', user.id)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Delete goal failed', err);
      }
    }

    setGoals((prev) => prev.filter((g) => g.id !== id));
    return true;
  };

  const addWallet = async (wallet) => {
    const newWallet = { ...wallet, id: `wallet-${generateUUID()}`, type: wallet.type || 'bank' };

    if (user) {
      try {
        const { error } = await supabase
          .from('wallets')
          .insert(mapWalletToDb(newWallet, user.id));
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Add wallet failed', err);
      }
    }

    setWallets(prev => [...prev, newWallet]);
    return true;
  };

  const updateWallet = async (id, updatedWallet) => {
    const existingWallet = wallets.find((wallet) => wallet.id === id);
    if (!existingWallet || !updatedWallet?.name?.trim()) {
      console.warn('Rejected invalid wallet update payload.', { id, updatedWallet });
      return false;
    }

    const mergedWallet = { ...existingWallet, ...updatedWallet };

    if (user) {
      try {
        const { error } = await supabase
          .from('wallets')
          .update(mapWalletToDb(mergedWallet, user.id))
          .eq('user_id', user.id)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Update wallet failed', err);
      }
    }

    setWallets(prev => prev.map(w => (w.id === id ? mergedWallet : w)));
    return true;
  };

  const deleteWallet = async (id) => {
    const remainingWallets = wallets.filter(w => w.id !== id);
    const fallbackWalletId = remainingWallets[0]?.id || 'wallet-cash';

    if (user) {
      try {
        const { error: txErr } = await supabase
          .from('transactions')
          .update({ wallet_id: fallbackWalletId })
          .eq('user_id', user.id)
          .eq('wallet_id', id);
        if (txErr) throw txErr;

        const { error: delErr } = await supabase
          .from('wallets')
          .delete()
          .eq('user_id', user.id)
          .eq('id', id);
        if (delErr) throw delErr;
      } catch (err) {
        return reportCloudError('Delete wallet failed', err);
      }
    }

    setWallets(remainingWallets);
    setTransactions(prev => prev.map(tx => tx.walletId === id ? { ...tx, walletId: fallbackWalletId } : tx));
    return true;
  };

  const addRecurringTx = async (bill) => {
    const dueDay = Math.min(31, Math.max(1, Number(bill.dueDay) || 1));
    const newRec = { ...bill, dueDay, id: `rec-${generateUUID()}`, lastTriggered: '' };

    if (user) {
      try {
        const { error } = await supabase
          .from('recurring_txs')
          .insert(mapRecurringToDb(newRec, user.id));
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Add recurring transaction failed', err);
      }
    }

    setRecurringTxs(prev => [...prev, newRec]);
    return true;
  };

  const deleteRecurringTx = async (id) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('recurring_txs')
          .delete()
          .eq('user_id', user.id)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Delete recurring transaction failed', err);
      }
    }

    setRecurringTxs(prev => prev.filter(r => r.id !== id));
    return true;
  };

  const triggerRecurringTx = async (id, walletId) => {
    const bill = recurringTxs.find(r => r.id === id);
    if (!bill) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newTx = {
      type: bill.type,
      category: bill.category,
      amount: bill.amount,
      date: todayStr,
      note: `ชำระรอบบิลอัตโนมัติ: ${bill.name}`,
      walletId: walletId || bill.walletId || wallets[0]?.id || 'wallet-cash'
    };

    const transactionCreated = await addTransaction(newTx);
    if (!transactionCreated) return false;

    setRecurringTxs(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, lastTriggered: todayStr };
      }
      return r;
    }));

    if (user) {
      try {
        const { error } = await supabase
          .from('recurring_txs')
          .update({ last_triggered: todayStr })
          .eq('user_id', user.id)
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        return reportCloudError('Trigger recurring transaction failed', err);
      }
    }
    return true;
  };

  const loadDemoData = async () => {
    const demo = generateDemoData();
    const demoRecurring = [
      { id: 'rec-demo-netflix', name: 'บิลรายเดือน Netflix Premium', type: 'expense', category: 'shopping', amount: 419, walletId: 'wallet-cash', interval: 'monthly', dueDay: 7, lastTriggered: '' },
      { id: 'rec-demo-electric', name: 'ค่าไฟฟ้าน้ำประปาบ้าน', type: 'expense', category: 'home', amount: 2850, walletId: 'wallet-cash', interval: 'monthly', dueDay: 18, lastTriggered: '' },
      { id: 'rec-demo-salary', name: 'เงินปันผลรายเดือนจากพอร์ตหุ้น', type: 'income', category: 'dividend', amount: 3500, walletId: 'wallet-cash', interval: 'monthly', dueDay: 28, lastTriggered: '' }
    ];

    setWallets(demo.wallets);
    setBudgets(demo.budgets);
    setGoals(demo.goals);
    setTransactions(demo.transactions);
    setRecurringTxs(demoRecurring);

    if (user) {
      try {
        const deleteResults = await Promise.all([
          supabase.from('transactions').delete().eq('user_id', user.id),
          supabase.from('budgets').delete().eq('user_id', user.id),
          supabase.from('goals').delete().eq('user_id', user.id),
          supabase.from('recurring_txs').delete().eq('user_id', user.id),
          supabase.from('wallets').delete().eq('user_id', user.id)
        ]);
        deleteResults.forEach(throwIfSupabaseError);

        const walletsToInsert = demo.wallets.map(w => mapWalletToDb(w, user.id));
        const txsToInsert = demo.transactions.map(t => mapTxToDb(t, user.id));
        const budgetsToInsert = Object.entries(demo.budgets).map(([catId, amount]) => ({
          user_id: user.id,
          category_id: catId,
          amount: Number(amount)
        }));
        const goalsToInsert = demo.goals.map(g => mapGoalToDb(g, user.id));
        const recurringToInsert = demoRecurring.map(r => mapRecurringToDb(r, user.id));

        throwIfSupabaseError(await supabase.from('wallets').insert(walletsToInsert));
        if (txsToInsert.length > 0) throwIfSupabaseError(await supabase.from('transactions').insert(txsToInsert));
        if (budgetsToInsert.length > 0) throwIfSupabaseError(await supabase.from('budgets').insert(budgetsToInsert));
        if (goalsToInsert.length > 0) throwIfSupabaseError(await supabase.from('goals').insert(goalsToInsert));
        if (recurringToInsert.length > 0) throwIfSupabaseError(await supabase.from('recurring_txs').insert(recurringToInsert));
      } catch (err) {
        return reportCloudError('Load demo data failed', err);
      }
    }
    return true;
  };

  const resetAllData = async () => {
    setTransactions([]);
    setBudgets({});
    setGoals([]);
    setWallets(DEFAULT_WALLETS);
    setTheme('dark');
    setCurrency('THB');
    setRecurringTxs([]);

    if (user) {
      try {
        const deleteResults = await Promise.all([
          supabase.from('transactions').delete().eq('user_id', user.id),
          supabase.from('budgets').delete().eq('user_id', user.id),
          supabase.from('goals').delete().eq('user_id', user.id),
          supabase.from('recurring_txs').delete().eq('user_id', user.id),
          supabase.from('wallets').delete().eq('user_id', user.id)
        ]);
        deleteResults.forEach(throwIfSupabaseError);
        
        const defaultWalletsWithUser = DEFAULT_WALLETS.map(w => mapWalletToDb(w, user.id));
        throwIfSupabaseError(await supabase.from('wallets').insert(defaultWalletsWithUser));
      } catch (err) {
        return reportCloudError('Reset cloud data failed', err);
      }
    }
    return true;
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

  const importData = async (jsonData) => {
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

      if (user) {
        try {
          const deleteResults = await Promise.all([
            supabase.from('transactions').delete().eq('user_id', user.id),
            supabase.from('budgets').delete().eq('user_id', user.id),
            supabase.from('goals').delete().eq('user_id', user.id),
            supabase.from('recurring_txs').delete().eq('user_id', user.id),
            supabase.from('wallets').delete().eq('user_id', user.id)
          ]);
          deleteResults.forEach(throwIfSupabaseError);

          if (parsed.wallets) {
            throwIfSupabaseError(await supabase.from('wallets').insert(parsed.wallets.map(w => mapWalletToDb(w, user.id))));
          }
          if (parsed.transactions && parsed.transactions.length > 0) {
            throwIfSupabaseError(await supabase.from('transactions').insert(parsed.transactions.map(t => mapTxToDb(t, user.id))));
          }
          if (parsed.budgets) {
            const budgetsToInsert = Object.entries(parsed.budgets).map(([catId, amount]) => ({
              user_id: user.id,
              category_id: catId,
              amount: Number(amount)
            }));
            if (budgetsToInsert.length > 0) {
              throwIfSupabaseError(await supabase.from('budgets').insert(budgetsToInsert));
            }
          }
          if (parsed.goals && parsed.goals.length > 0) {
            throwIfSupabaseError(await supabase.from('goals').insert(parsed.goals.map(g => mapGoalToDb(g, user.id))));
          }
          if (parsed.recurringTxs && parsed.recurringTxs.length > 0) {
            throwIfSupabaseError(await supabase.from('recurring_txs').insert(parsed.recurringTxs.map(r => mapRecurringToDb(r, user.id))));
          }
        } catch (err) {
          return reportCloudError('Import cloud data failed', err);
        }
      }

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
    mimoApiKey,
    setMimoApiKey,
    mimoModel,
    setMimoModel,
    user,
    isOnline,
    syncing,
    syncError,
    realtimeStatus,
    lastSyncedAt,
    login,
    signUp,
    logout,
    syncLocalDataToCloud,
    refreshFromCloud
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};
