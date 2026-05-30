// Portfolio utility functions for investment tracking
// Uses CoinGecko free API for crypto and a CORS proxy for stock prices

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

// Format USD
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

// Load holdings from localStorage
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
  return []; // Return empty array, not DEFAULT_HOLDINGS
};

// Save holdings to localStorage
export const saveHoldings = (holdings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch (e) {
    console.error('Failed to save portfolio holdings:', e);
  }
};

// Fetch crypto prices from CoinGecko
export const fetchCryptoPrices = async (symbols = ['BTC', 'ETH']) => {
  const coinGeckoIds = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    BNB: 'binancecoin',
    XRP: 'ripple',
    ADA: 'cardano',
    DOGE: 'dogecoin',
    DOT: 'polkadot',
    AVAX: 'avalanche-2',
    MATIC: 'matic-network',
    LINK: 'chainlink',
    UNI: 'uniswap',
  };

  const ids = symbols
    .map(s => coinGeckoIds[s.toUpperCase()])
    .filter(Boolean);

  if (ids.length === 0) return {};

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`
    );
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
    const data = await response.json();

    const prices = {};
    for (const [symbol, cgId] of Object.entries(coinGeckoIds)) {
      if (data[cgId]) {
        prices[symbol] = {
          price: data[cgId].usd || 0,
          change24h: data[cgId].usd_24h_change || 0,
        };
      }
    }
    return prices;
  } catch (err) {
    console.warn('[Portfolio] Failed to fetch crypto prices:', err.message);
    return {};
  }
};

// Fetch stock prices using Yahoo Finance via a CORS proxy
export const fetchStockPrices = async (symbols = []) => {
  if (symbols.length === 0) return {};

  const prices = {};

  // Try fetching from Yahoo Finance quote endpoint using allorigins proxy
  try {
    const symbolsStr = symbols.join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsStr}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);

    if (response.ok) {
      const data = await response.json();
      if (data.quoteResponse?.result) {
        for (const quote of data.quoteResponse.result) {
          prices[quote.symbol] = {
            price: quote.regularMarketPrice || 0,
            change24h: quote.regularMarketChangePercent || 0,
            name: quote.shortName || quote.longName || quote.symbol,
          };
        }
        return prices;
      }
    }
  } catch (err) {
    console.warn('[Portfolio] Yahoo Finance proxy failed:', err.message);
  }

  // Fallback: return empty prices so we show "N/A"
  return prices;
};

// Calculate portfolio statistics
export const calculatePortfolioStats = (holdings, livePrices) => {
  let totalValue = 0;
  let totalCost = 0;
  let totalDayChange = 0;

  const enriched = holdings.map(h => {
    const live = livePrices[h.symbol] || {};
    const currentPrice = live.price || h.avgCost; // fallback to avg cost
    const change24h = live.change24h || 0;
    const value = h.shares * currentPrice;
    const cost = h.shares * h.avgCost;
    const pnl = value - cost;
    const pnlPercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;
    const dayChangeValue = value * (change24h / 100);

    totalValue += value;
    totalCost += cost;
    totalDayChange += dayChangeValue;

    return {
      ...h,
      currentPrice,
      change24h,
      value,
      cost,
      pnl,
      pnlPercent,
      dayChangeValue,
    };
  });

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

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

// Calculate allocation for pie chart
export const calculateAllocation = (enrichedHoldings) => {
  const grouped = {};

  enrichedHoldings.forEach(h => {
    const cat = h.category || 'Other';
    if (!grouped[cat]) {
      grouped[cat] = { name: cat, value: 0, color: CATEGORY_COLORS[cat] || '#64748b' };
    }
    grouped[cat].value += h.value;
  });

  return Object.values(grouped).sort((a, b) => b.value - a.value);
};
