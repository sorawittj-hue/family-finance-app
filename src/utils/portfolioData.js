// Portfolio utility functions for investment tracking
// Uses Yahoo Finance chart API with a CORS proxy fallback list for robust fetching
import { supabase, supabaseAvailable } from './supabaseClient.js';

const STORAGE_KEY = 'family_finance_portfolio';

// Default holdings
export const DEFAULT_HOLDINGS = [
  { id: 'h1', symbol: 'ONDS', name: 'Ondas Holdings', category: 'US Stock', shares: 100, avgCost: 1.50 },
  { id: 'h2', symbol: 'OKLO', name: 'Oklo Inc', category: 'US Stock', shares: 50, avgCost: 22.00 },
  { id: 'h3', symbol: 'FLY', name: 'Firefly Aerospace', category: 'US Stock', shares: 30, avgCost: 35.00 },
  { id: 'h4', symbol: 'IREN', name: 'Iris Energy', category: 'US Stock', shares: 80, avgCost: 8.50 },
  { id: 'h5', symbol: 'BTBT', name: 'Bit Digital', category: 'US Stock', shares: 200, avgCost: 3.20 },
  { id: 'h6', symbol: 'BTC', name: 'Bitcoin', category: 'Crypto', shares: 0.05, avgCost: 42000 },
  { id: 'h7', symbol: 'ETH', name: 'Ethereum', category: 'Crypto', shares: 1.5, avgCost: 2800 },
];

// Category colors for chart
export const CATEGORY_COLORS = {
  'US Stock': '#3b82f6',
  'Crypto': '#f59e0b',
  'ETF': '#10b981',
  'Bond': '#8b5cf6',
  'Other': '#64748b',
};

// Format USD (Backward compatibility fallback)
export const formatUSD = (value) => {
  if (value == null || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format percent
export const formatPercent = (value) => {
  if (value == null || isNaN(value)) return '0.00%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

// Format number
export const formatNumber = (value, decimals = 2) => {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
};

// Load holdings from localStorage (sync, for initial render)
export const loadHoldings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load portfolio holdings:', e);
  }
  return [];
};

// Load holdings from Supabase (async)
export const loadHoldingsFromCloud = async () => {
  if (!supabaseAvailable) return null;
  try {
    const { data, error } = await supabase.from('portfolio').select('*').order('symbol');
    if (error) throw error;
    if (data && data.length > 0) {
      const holdings = data.map(h => ({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        category: h.category,
        shares: Number(h.shares),
        avgCost: Number(h.avg_cost),
      }));
      // Also save to localStorage as cache
      localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
      return holdings;
    }
  } catch (e) {
    console.warn('[Portfolio] Cloud load failed:', e.message);
  }
  return null;
};

// Save holdings to localStorage + Supabase
export const saveHoldings = (holdings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch (e) {
    console.error('Failed to save portfolio holdings:', e);
  }
  // Background sync to Supabase
  if (supabaseAvailable) {
    syncHoldingsToCloud(holdings);
  }
};

const syncHoldingsToCloud = async (holdings) => {
  try {
    const currentIds = holdings.map(h => h.id);

    // 1. Delete items in the database that are no longer in the holdings list
    if (currentIds.length > 0) {
      const formattedIds = currentIds.map(id => `'${id}'`).join(',');
      await supabase
        .from('portfolio')
        .delete()
        .filter('id', 'not.in', `(${formattedIds})`);
    } else {
      // If holdings is empty, delete everything
      await supabase
        .from('portfolio')
        .delete()
        .neq('id', 'placeholder-non-existent-id');
    }

    // 2. Upsert the current holdings (insert or update)
    if (holdings.length > 0) {
      const rows = holdings.map(h => ({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        category: h.category,
        shares: h.shares,
        avg_cost: h.avgCost,
      }));
      
      const { error } = await supabase.from('portfolio').upsert(rows);
      if (error) throw error;
    }
  } catch (e) {
    console.warn('[Portfolio] Cloud sync failed:', e.message);
  }
};

// List of free public CORS proxies to try in order (Fallback mechanism)
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

// Helper to fetch content through a working CORS proxy
export const fetchWithProxy = async (url) => {
  // If running in server-side Node environment (e.g. testing), bypass proxies entirely
  if (typeof window === 'undefined') {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
      if (response.ok) {
        return response;
      }
      throw new Error(`Direct fetch returned status ${response.status}`);
    } catch (err) {
      console.warn(`Direct fetch failed for ${url}:`, err.message);
    }
  }

  let lastError = null;
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(url);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        return response;
      }
      throw new Error(`CORS proxy returned status ${response.status}`);
    } catch (err) {
      lastError = err;
      console.warn(`Proxy failed for URL: ${url} using proxy ${proxyFn(url)}. Error:`, err.message);
    }
  }
  throw lastError || new Error("All CORS proxies failed");
};

// Helper to convert currency using fetched exchange rates and fallbacks
export const convertCurrency = (amount, from, to, rates = {}) => {
  if (!from || !to || from === to) return amount;
  const key = `${from.toUpperCase()}_${to.toUpperCase()}`;
  if (rates[key]) return amount * rates[key];
  
  // Try inverse key
  const inverseKey = `${to.toUpperCase()}_${from.toUpperCase()}`;
  if (rates[inverseKey]) return amount / rates[inverseKey];
  
  // Sensible default fallbacks if rates are not loaded yet or request failed
  const fallbacks = {
    'USD_THB': 35.0,
    'EUR_THB': 38.0,
    'JPY_THB': 0.23,
    'GBP_THB': 44.0,
  };
  
  const fallbackKey = `${from.toUpperCase()}_${to.toUpperCase()}`;
  if (fallbacks[fallbackKey]) return amount * fallbacks[fallbackKey];
  
  const fallbackInverseKey = `${to.toUpperCase()}_${from.toUpperCase()}`;
  if (fallbacks[fallbackInverseKey]) return amount / fallbacks[fallbackInverseKey];
  
  return amount; // Fallback to no conversion if currency pair is unknown
};

// Fetch exchange rates from Yahoo Finance (e.g. USDTHB=X, EURTHB=X, etc.)
export const fetchExchangeRates = async (fromCurrencies = [], toCurrency = 'THB') => {
  const rates = {};
  const uniqueFrom = [...new Set(fromCurrencies)].filter(c => c && c.toUpperCase() !== toCurrency.toUpperCase());
  if (uniqueFrom.length === 0) return {};

  const pairs = uniqueFrom.map(c => `${c.toUpperCase()}${toCurrency.toUpperCase()}=X`);
  
  const promises = pairs.map(async (pair) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${pair}?interval=1d&range=1d`;
      const response = await fetchWithProxy(url);
      const data = await response.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta && meta.regularMarketPrice) {
        const from = pair.substring(0, 3);
        rates[`${from}_${toCurrency.toUpperCase()}`] = meta.regularMarketPrice;
      }
    } catch (err) {
      console.warn(`[Portfolio] Failed to fetch exchange rate for ${pair}:`, err.message);
    }
  });

  await Promise.all(promises);
  return rates;
};

// Fetch stock prices using Yahoo Finance chart API
export const fetchStockPrices = async (symbols = []) => {
  if (symbols.length === 0) return {};

  const prices = {};

  const promises = symbols.map(async (symbol) => {
    try {
      const cleanSymbol = symbol.toUpperCase().trim();
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`;
      const response = await fetchWithProxy(url);
      const data = await response.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta) {
        const price = meta.regularMarketPrice || 0;
        const prevClose = meta.chartPreviousClose || price;
        const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
        prices[symbol] = {
          price,
          change24h,
          name: meta.longName || meta.shortName || symbol,
          currency: meta.currency || 'USD',
        };
      }
    } catch (err) {
      console.warn(`[Portfolio] Failed to fetch stock price for ${symbol}:`, err.message);
    }
  });

  await Promise.all(promises);
  return prices;
};

// Fetch crypto prices using Yahoo Finance chart API (BTC -> BTC-USD)
export const fetchCryptoPrices = async (symbols = []) => {
  if (symbols.length === 0) return {};

  const cleanSymbols = symbols.map(s => s.toUpperCase().trim());
  const prices = {};

  const promises = cleanSymbols.map(async (originalSymbol) => {
    try {
      // Append -USD if not present (Yahoo Finance style)
      const yahooSymbol = originalSymbol.endsWith('-USD') ? originalSymbol : `${originalSymbol}-USD`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
      const response = await fetchWithProxy(url);
      const data = await response.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta) {
        const price = meta.regularMarketPrice || 0;
        const prevClose = meta.chartPreviousClose || price;
        const change24h = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
        prices[originalSymbol] = {
          price,
          change24h,
          name: originalSymbol,
          currency: 'USD',
        };
      }
    } catch (err) {
      console.warn(`[Portfolio] Failed to fetch crypto price for ${originalSymbol}:`, err.message);
    }
  });

  await Promise.all(promises);
  return prices;
};

// Calculate portfolio statistics with multi-currency conversion
export const calculatePortfolioStats = (holdings, livePrices, targetCurrency = 'THB', rates = {}) => {
  let totalValue = 0;
  let totalCost = 0;
  let totalDayChange = 0;

  const enriched = holdings.map(h => {
    const live = livePrices[h.symbol] || {};
    const assetCurrency = live.currency || (h.symbol.endsWith('.BK') ? 'THB' : 'USD');
    const currentPrice = live.price || h.avgCost; // fallback to average cost
    const change24h = live.change24h || 0;

    // Calculations in native currency of the asset
    const valueNative = h.shares * currentPrice;
    const costNative = h.shares * h.avgCost;
    const pnlNative = valueNative - costNative;
    const pnlPercent = costNative > 0 ? (pnlNative / costNative) * 100 : 0;

    // Convert values to dashboard target currency
    const valueTarget = convertCurrency(valueNative, assetCurrency, targetCurrency, rates);
    const costTarget = convertCurrency(costNative, assetCurrency, targetCurrency, rates);
    const pnlTarget = valueTarget - costTarget;
    const dayChangeValueTarget = valueTarget * (change24h / 100);

    totalValue += valueTarget;
    totalCost += costTarget;
    totalDayChange += dayChangeValueTarget;

    return {
      ...h,
      currentPrice,
      currency: assetCurrency,
      change24h,
      value: valueNative,        // value in asset's native currency (for table detail)
      cost: costNative,          // cost in asset's native currency (for table detail)
      pnl: pnlNative,            // P&L in asset's native currency (for table detail)
      pnlPercent,
      valueTarget,               // value in system primary currency (for sums)
      costTarget,                // cost in system primary currency (for sums)
      pnlTarget,                 // P&L in system primary currency (for sums)
      dayChangeValueTarget,
    };
  });

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return {
    holdings: enriched,
    totalValue,
    totalCost,
    totalPnL,
    totalPnLPercent,
    totalDayChange,
    dayChangePercent: totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0,
  };
};

// Calculate allocation for pie chart (in target currency)
export const calculateAllocation = (enrichedHoldings) => {
  const grouped = {};

  enrichedHoldings.forEach(h => {
    const cat = h.category || 'Other';
    if (!grouped[cat]) {
      grouped[cat] = { name: cat, value: 0, color: CATEGORY_COLORS[cat] || '#64748b' };
    }
    grouped[cat].value += h.valueTarget || h.value;
  });

  return Object.values(grouped).sort((a, b) => b.value - a.value);
};
