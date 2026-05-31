import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  CheckCircle2,
  ClipboardList,
  Gauge,
  LineChart,
  Loader2,
  Pencil,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  ShieldAlert,
  Target,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useChartSize } from '../hooks/useChartSize';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../utils/constants';
import { buildMonthlyFinanceReport, getMonthKey } from '../utils/financeAnalytics';
import {
  CATEGORY_COLORS,
  DEFAULT_HOLDINGS,
  PORTFOLIO_CATEGORIES,
  buildDcaPlan,
  buildPortfolioRiskProfile,
  buildRebalancePlan,
  calculateAllocation,
  calculateAllocationDrift,
  calculatePortfolioStats,
  convertCurrency,
  fetchCryptoPrices,
  fetchExchangeRates,
  fetchStockPrices,
  formatNumber,
  formatPercent,
  loadHoldings,
  loadHoldingsFromCloud,
  loadPortfolioLedger,
  loadPortfolioWatchlist,
  loadTargetAllocation,
  saveHoldings,
  savePortfolioLedger,
  savePortfolioWatchlist,
  saveTargetAllocation,
} from '../utils/portfolioData';

const DCA_AMOUNT_KEY = 'family_finance_portfolio_dca_amount';

const toneClass = {
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const loadDcaAmount = () => {
  try {
    return Number(localStorage.getItem(DCA_AMOUNT_KEY) || 0);
  } catch (error) {
    console.warn('[Portfolio] Failed to load DCA amount:', error);
    return 0;
  }
};

const saveDcaAmount = (amount) => {
  try {
    localStorage.setItem(DCA_AMOUNT_KEY, String(Math.max(0, Number(amount) || 0)));
  } catch (error) {
    console.error('[Portfolio] Failed to save DCA amount:', error);
  }
};

const getAssetCurrency = (symbol) => (symbol?.toUpperCase().endsWith('.BK') ? 'THB' : 'USD');

const StatCard = ({ icon: Icon, label, value, detail, tone = 'info' }) => (
  <Card className={`p-5 border ${toneClass[tone] || toneClass.info}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
        <p className="text-2xl font-black mt-2">{value}</p>
        <p className="text-xs leading-relaxed mt-2 opacity-80">{detail}</p>
      </div>
      <div className="w-10 h-10 rounded-lg bg-white/70 border border-white/80 flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
    </div>
  </Card>
);

const ProgressBar = ({ value, color = '#2563eb' }) => (
  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
    <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }} />
  </div>
);

const NumberField = ({ label, value, onChange, min = 0, step = 'any' }) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">{label}</span>
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm font-bold text-[color:var(--text-primary)] outline-none focus:border-blue-500"
    />
  </label>
);

const TextField = ({ label, value, onChange, placeholder = '' }) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">{label}</span>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm font-bold text-[color:var(--text-primary)] outline-none focus:border-blue-500"
    />
  </label>
);

const HoldingModal = ({ holding, onSave, onClose, wallets = [], rates = {}, primaryCurrency = 'THB' }) => {
  const isEdit = Boolean(holding);
  const [mode, setMode] = useState(isEdit ? 'trade' : 'direct');
  const [tradeType, setTradeType] = useState('buy');
  const [recordTransaction, setRecordTransaction] = useState(true);
  const [walletId, setWalletId] = useState(wallets[0]?.id || 'wallet-cash');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState(holding || {
    symbol: '',
    name: '',
    category: 'US Stock',
    shares: '',
    avgCost: '',
  });
  const [trade, setTrade] = useState({ shares: '', price: '' });

  const symbol = String(form.symbol || '').toUpperCase().trim();
  const assetCurrency = getAssetCurrency(symbol);
  const tradeShares = Number(isEdit && mode === 'trade' ? trade.shares : form.shares) || 0;
  const tradePrice = Number(isEdit && mode === 'trade' ? trade.price : form.avgCost) || 0;
  const tradeNativeAmount = tradeShares * tradePrice;
  const tradeAmount = convertCurrency(tradeNativeAmount, assetCurrency, primaryCurrency, rates);
  const isSell = isEdit && mode === 'trade' && tradeType === 'sell';
  const sellInvalid = isSell && tradeShares > (Number(holding?.shares) || 0);

  const nextShares = useMemo(() => {
    if (!isEdit || mode !== 'trade') return Number(form.shares) || 0;
    const currentShares = Number(holding.shares) || 0;
    return Math.max(0, isSell ? currentShares - tradeShares : currentShares + tradeShares);
  }, [form.shares, holding, isEdit, isSell, mode, tradeShares]);

  const nextAvgCost = useMemo(() => {
    if (!isEdit || mode !== 'trade') return Number(form.avgCost) || 0;
    if (isSell) return Number(holding.avgCost) || 0;
    const currentShares = Number(holding.shares) || 0;
    const currentCost = Number(holding.avgCost) || 0;
    const totalShares = currentShares + tradeShares;
    if (totalShares <= 0) return 0;
    return ((currentShares * currentCost) + (tradeShares * tradePrice)) / totalShares;
  }, [form.avgCost, holding, isEdit, isSell, mode, tradePrice, tradeShares]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!symbol || sellInvalid) return;

    const savedHolding = {
      ...form,
      id: form.id || `h-${Date.now()}`,
      symbol,
      name: String(form.name || symbol).trim() || symbol,
      category: form.category || 'Other',
      shares: Number(nextShares),
      avgCost: Number(nextAvgCost),
    };

    if (!Number.isFinite(savedHolding.shares) || savedHolding.shares < 0 || !Number.isFinite(savedHolding.avgCost) || savedHolding.avgCost < 0) {
      console.warn('[Portfolio] Rejected invalid holding payload.', savedHolding);
      return;
    }

    const ledgerEntry = tradeNativeAmount > 0 ? {
      id: `ledger-${Date.now()}`,
      symbol,
      action: isSell ? 'sell' : 'buy',
      shares: tradeShares,
      price: tradePrice,
      nativeAmount: tradeNativeAmount,
      nativeCurrency: assetCurrency,
      amount: tradeAmount,
      currency: primaryCurrency,
      date: tradeDate,
      createdAt: new Date().toISOString(),
    } : null;

    const financeTransaction = recordTransaction && tradeNativeAmount > 0 ? {
      type: isSell ? 'income' : 'saving',
      category: isSell ? 'other_in' : 'investment',
      amount: tradeAmount,
      date: tradeDate,
      note: `${isSell ? 'ขาย' : 'ซื้อ'}สินทรัพย์ ${symbol} (${formatNumber(tradeShares, tradeShares < 1 ? 4 : 2)} @ ${tradePrice} ${assetCurrency})`,
      walletId,
    } : null;

    onSave(savedHolding, financeTransaction, ledgerEntry);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-color)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">{isEdit ? 'จัดการสินทรัพย์' : 'เพิ่มสินทรัพย์'}</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">บันทึก holding พร้อม ledger และ transaction ได้ในครั้งเดียว</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[color:var(--text-muted)] hover:bg-slate-100 hover:text-[color:var(--text-primary)]">
            <X size={18} />
          </button>
        </div>

        <form className="space-y-4 pt-4" onSubmit={handleSubmit}>
          {isEdit && (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-[color:var(--border-color)] bg-slate-50 p-1 text-xs font-black">
              <button type="button" onClick={() => setMode('trade')} className={`rounded-md py-2 ${mode === 'trade' ? 'bg-blue-600 text-white' : 'text-[color:var(--text-secondary)]'}`}>ซื้อ/ขาย</button>
              <button type="button" onClick={() => setMode('direct')} className={`rounded-md py-2 ${mode === 'direct' ? 'bg-blue-600 text-white' : 'text-[color:var(--text-secondary)]'}`}>แก้ข้อมูล</button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="Symbol" value={form.symbol} placeholder="AAPL, BTC, PTT.BK" onChange={(value) => setForm((prev) => ({ ...prev, symbol: value }))} />
            <label className="block">
              <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">ประเภท</span>
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] px-3 py-2 text-sm font-bold text-[color:var(--text-primary)] outline-none focus:border-blue-500"
              >
                {PORTFOLIO_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
          </div>
          <TextField label="ชื่อสินทรัพย์" value={form.name} placeholder="Apple Inc., Bitcoin, กองทุนรวม" onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />

          {mode === 'direct' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberField label="จำนวนที่ถือ" value={form.shares} onChange={(value) => setForm((prev) => ({ ...prev, shares: value }))} />
              <NumberField label={`ต้นทุนเฉลี่ย (${assetCurrency})`} value={form.avgCost} onChange={(value) => setForm((prev) => ({ ...prev, avgCost: value }))} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-[color:var(--border-color)] bg-slate-50 p-1 text-xs font-black">
                <button type="button" onClick={() => setTradeType('buy')} className={`rounded-md py-2 ${tradeType === 'buy' ? 'bg-emerald-600 text-white' : 'text-[color:var(--text-secondary)]'}`}>Buy</button>
                <button type="button" onClick={() => setTradeType('sell')} className={`rounded-md py-2 ${tradeType === 'sell' ? 'bg-rose-600 text-white' : 'text-[color:var(--text-secondary)]'}`}>Sell</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NumberField label="จำนวนหน่วย" value={trade.shares} onChange={(value) => setTrade((prev) => ({ ...prev, shares: value }))} />
                <NumberField label={`ราคาต่อหน่วย (${assetCurrency})`} value={trade.price} onChange={(value) => setTrade((prev) => ({ ...prev, price: value }))} />
              </div>
              {sellInvalid && <p className="text-xs font-bold text-rose-700">ขายเกินจำนวนที่ถืออยู่ไม่ได้</p>}
            </div>
          )}

          {wallets.length > 0 && tradeNativeAmount > 0 && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <label className="flex items-center gap-2 text-xs font-bold text-blue-800">
                <input type="checkbox" checked={recordTransaction} onChange={(event) => setRecordTransaction(event.target.checked)} />
                บันทึกเป็น transaction ในบัญชีด้วย
              </label>
              {recordTransaction && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-blue-700">บัญชี</span>
                    <select value={walletId} onChange={(event) => setWalletId(event.target.value)} className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-blue-900">
                      {wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase text-blue-700">วันที่</span>
                    <input type="date" value={tradeDate} onChange={(event) => setTradeDate(event.target.value)} className="mt-1 w-full rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-blue-900" />
                  </label>
                </div>
              )}
              <div className="mt-3 text-xs text-blue-800">
                มูลค่า {formatMoney(tradeNativeAmount, assetCurrency)}
                {assetCurrency !== primaryCurrency ? ` ≈ ${formatMoney(tradeAmount, primaryCurrency)}` : ''}
              </div>
            </div>
          )}

          <div className="flex gap-3 border-t border-[color:var(--border-color)] pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={sellInvalid}>บันทึก</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Portfolio = () => {
  const {
    currency,
    wallets,
    transactions,
    budgets,
    recurringTxs,
    addTransaction,
    setPortfolioValue,
  } = useFinance();
  const [holdings, setHoldings] = useState(() => loadHoldings());
  const [targetAllocation, setTargetAllocation] = useState(() => loadTargetAllocation());
  const [ledger, setLedger] = useState(() => loadPortfolioLedger());
  const [watchlist, setWatchlist] = useState(() => loadPortfolioWatchlist());
  const [watchForm, setWatchForm] = useState({ symbol: '', targetPrice: '', note: '' });
  const [monthlyDca, setMonthlyDca] = useState(() => loadDcaAmount());
  const [livePrices, setLivePrices] = useState({});
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [modal, setModal] = useState(null);
  const chartSize = useChartSize(260);

  useEffect(() => {
    loadHoldingsFromCloud().then((cloudData) => {
      if (cloudData) setHoldings(cloudData);
    });
  }, []);

  useEffect(() => {
    saveDcaAmount(monthlyDca);
  }, [monthlyDca]);

  const refreshPrices = useCallback(async () => {
    setLoading(true);
    try {
      const cryptoSymbols = holdings.filter((holding) => holding.category === 'Crypto').map((holding) => holding.symbol);
      const stockSymbols = holdings.filter((holding) => holding.category !== 'Crypto').map((holding) => holding.symbol);
      const fromCurrencies = holdings.map((holding) => getAssetCurrency(holding.symbol));
      const [cryptoPrices, stockPrices, exchangeRates] = await Promise.all([
        fetchCryptoPrices(cryptoSymbols),
        fetchStockPrices(stockSymbols),
        fetchExchangeRates(fromCurrencies, currency),
      ]);
      setLivePrices({ ...cryptoPrices, ...stockPrices });
      setRates(exchangeRates);
      setLastUpdated(new Date());
    } catch (error) {
      console.warn('[Portfolio] Price refresh error:', error);
    } finally {
      setLoading(false);
    }
  }, [currency, holdings]);

  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  const stats = useMemo(
    () => calculatePortfolioStats(holdings, livePrices, currency, rates),
    [currency, holdings, livePrices, rates],
  );
  const allocation = useMemo(() => calculateAllocation(stats.holdings), [stats.holdings]);
  const drift = useMemo(
    () => calculateAllocationDrift({ allocation, targetAllocation, totalValue: stats.totalValue }),
    [allocation, stats.totalValue, targetAllocation],
  );
  const rebalancePlan = useMemo(
    () => buildRebalancePlan({ drift, totalValue: stats.totalValue }),
    [drift, stats.totalValue],
  );
  const financeReport = useMemo(
    () => buildMonthlyFinanceReport({ transactions, wallets, budgets, recurringTxs, monthKey: getMonthKey() }),
    [budgets, recurringTxs, transactions, wallets],
  );
  const riskProfile = useMemo(
    () => buildPortfolioRiskProfile({ stats, allocation, livePrices, lastUpdated }),
    [allocation, lastUpdated, livePrices, stats],
  );
  const dcaPlan = useMemo(
    () => buildDcaPlan({ drift, monthlyAmount: monthlyDca, financeReport }),
    [drift, financeReport, monthlyDca],
  );

  useEffect(() => {
    setPortfolioValue(stats.totalValue);
  }, [setPortfolioValue, stats.totalValue]);

  const saveHoldingsState = (nextHoldings) => {
    setHoldings(nextHoldings);
    saveHoldings(nextHoldings);
  };

  const handleSave = async (holding, financeTransaction, ledgerEntry) => {
    const nextHoldings = holdings.some((item) => item.id === holding.id)
      ? holdings.map((item) => (item.id === holding.id ? holding : item))
      : [...holdings, holding];
    saveHoldingsState(nextHoldings);

    if (ledgerEntry) {
      const nextLedger = [ledgerEntry, ...ledger].slice(0, 200);
      setLedger(nextLedger);
      savePortfolioLedger(nextLedger);
    }

    if (financeTransaction) {
      try {
        await addTransaction(financeTransaction);
      } catch (error) {
        console.error('[Portfolio] Failed to create linked finance transaction:', error);
      }
    }

    setModal(null);
  };

  const handleDelete = (holdingId) => {
    const nextHoldings = holdings.filter((holding) => holding.id !== holdingId);
    saveHoldingsState(nextHoldings);
  };

  const handleSaveTarget = () => {
    setTargetAllocation(saveTargetAllocation(targetAllocation));
  };

  const handleAddWatch = (event) => {
    event.preventDefault();
    const symbol = watchForm.symbol.trim().toUpperCase();
    if (!symbol) return;
    const nextWatchlist = [{
      id: `watch-${Date.now()}`,
      symbol,
      targetPrice: Number(watchForm.targetPrice) || 0,
      note: watchForm.note.trim(),
      createdAt: new Date().toISOString(),
    }, ...watchlist].slice(0, 100);
    setWatchlist(nextWatchlist);
    savePortfolioWatchlist(nextWatchlist);
    setWatchForm({ symbol: '', targetPrice: '', note: '' });
  };

  const removeWatch = (watchId) => {
    const nextWatchlist = watchlist.filter((item) => item.id !== watchId);
    setWatchlist(nextWatchlist);
    savePortfolioWatchlist(nextWatchlist);
  };

  const resetToDefault = () => {
    saveHoldingsState(DEFAULT_HOLDINGS);
  };

  const largestDrift = rebalancePlan.largestDrift;
  const targetTotal = Object.values(targetAllocation).reduce((sum, value) => sum + (Number(value) || 0), 0);

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-600 font-black">Portfolio Operating System</p>
          <h1 className="text-3xl font-black text-[color:var(--text-primary)] mt-1">พอร์ตลงทุน</h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-2 max-w-3xl">
            ติดตามมูลค่าอย่างเดียวไม่พอ หน้านี้เพิ่ม target allocation, drift, rebalance, risk guardrail, DCA plan, ledger และ watchlist เพื่อให้พอร์ตมีระบบตัดสินใจ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={refreshPrices} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            รีเฟรชราคา
          </Button>
          <Button onClick={() => setModal('add')}>
            <Plus size={16} />
            เพิ่มสินทรัพย์
          </Button>
        </div>
      </header>

      {lastUpdated && (
        <p className="text-[10px] font-bold text-[color:var(--text-muted)]">อัปเดตราคาล่าสุด: {lastUpdated.toLocaleString('th-TH')}</p>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label={`Total Value (${currency})`} value={formatMoney(stats.totalValue, currency)} detail={`ต้นทุนรวม ${formatMoney(stats.totalCost, currency)}`} tone="info" />
        <StatCard icon={LineChart} label="Total Return" value={formatMoney(stats.totalPnL, currency)} detail={formatPercent(stats.totalPnLPercent)} tone={stats.totalPnL >= 0 ? 'success' : 'danger'} />
        <StatCard icon={Gauge} label="Risk Score" value={`${riskProfile.score}/100`} detail={riskProfile.alerts.length ? `${riskProfile.alerts.length} risk signal ต้องดู` : 'ยังไม่พบ risk signal หลัก'} tone={riskProfile.score >= 80 ? 'success' : riskProfile.score >= 60 ? 'warning' : 'danger'} />
        <StatCard icon={Target} label="Largest Drift" value={largestDrift ? `${largestDrift.category} ${largestDrift.driftPercent.toFixed(1)}%` : 'Balanced'} detail={largestDrift ? `${largestDrift.action === 'buy' ? 'ต่ำกว่าเป้า' : 'สูงกว่าเป้า'} ${formatMoney(Math.abs(largestDrift.valueGap), currency)}` : 'ทุกหมวดอยู่ใกล้เป้าหมาย'} tone={rebalancePlan.rebalanceNeeded ? 'warning' : 'success'} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Actual Allocation</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">สัดส่วนจริงจากมูลค่าปัจจุบัน</p>
            </div>
            <PieChartIcon className="text-blue-700" size={22} />
          </div>
          <div ref={chartSize.ref} className="h-[260px] w-full flex items-center justify-center">
            {allocation.length > 0 && chartSize.isReady ? (
              <PieChart width={chartSize.width} height={chartSize.height}>
                <Pie data={allocation} cx="50%" cy="50%" innerRadius={64} outerRadius={104} paddingAngle={3} dataKey="value">
                  {allocation.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  formatter={(value) => formatMoney(value, currency)}
                />
              </PieChart>
            ) : (
              <div className="text-sm text-[color:var(--text-muted)]">ยังไม่มีข้อมูลพอร์ต</div>
            )}
          </div>
          <div className="space-y-2 mt-4">
            {drift.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[color:var(--text-primary)]">{item.category}</span>
                  <span className="text-[color:var(--text-secondary)]">{item.actualPercent.toFixed(1)}% / target {item.targetPercent.toFixed(1)}%</span>
                </div>
                <ProgressBar value={item.actualPercent} color={item.color} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Target Allocation</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">ตั้งเป้าพอร์ต รวมปัจจุบัน {targetTotal.toFixed(0)}%</p>
            </div>
            <Button size="sm" variant="secondary" onClick={handleSaveTarget}>Normalize</Button>
          </div>
          <div className="space-y-3">
            {PORTFOLIO_CATEGORIES.map((category) => (
              <label key={category} className="grid grid-cols-[1fr_88px] items-center gap-3">
                <span className="text-sm font-bold text-[color:var(--text-primary)]">{category}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={targetAllocation[category] ?? 0}
                  onChange={(event) => setTargetAllocation((prev) => ({ ...prev, [category]: Number(event.target.value) || 0 }))}
                  className="rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] px-3 py-2 text-right text-sm font-black text-[color:var(--text-primary)] outline-none focus:border-blue-500"
                />
              </label>
            ))}
          </div>
          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-800">
            ระบบจะ normalize ให้รวม 100% ตอนกดปุ่ม เพื่อไม่บังคับกรอกเป๊ะระหว่างปรับแผน
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <BarChart3 className="text-violet-700" size={22} />
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Rebalance Plan</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">แนะนำจาก drift เทียบ target</p>
            </div>
          </div>
          {rebalancePlan.rebalanceNeeded ? (
            <div className="space-y-3">
              {[...rebalancePlan.underWeight, ...rebalancePlan.overWeight].slice(0, 5).map((item) => (
                <div key={item.category} className={`rounded-lg border p-4 ${toneClass[item.status] || toneClass.info}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{item.action === 'buy' ? 'เพิ่ม' : 'ลด'} {item.category}</p>
                      <p className="text-xs mt-1 opacity-80">drift {item.driftPercent.toFixed(1)}%</p>
                    </div>
                    <p className="text-sm font-black">{formatMoney(Math.abs(item.valueGap), currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              <CheckCircle2 size={18} />
              <p className="text-sm font-black mt-2">พอร์ตอยู่ใกล้ target</p>
              <p className="text-xs mt-1 opacity-80">ยังไม่จำเป็นต้อง rebalance ด้วยการขาย</p>
            </div>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <ShieldAlert className="text-rose-700" size={22} />
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Risk Guardrails</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">concentration, crypto, diversification, stale price</p>
            </div>
          </div>
          <div className="space-y-3">
            {riskProfile.alerts.length > 0 ? riskProfile.alerts.map((alert) => (
              <div key={alert.id} className={`rounded-lg border p-4 ${toneClass[alert.severity] || toneClass.info}`}>
                <p className="text-sm font-black">{alert.title}</p>
                <p className="text-xs mt-1 leading-relaxed opacity-85">{alert.detail}</p>
              </div>
            )) : (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                <CheckCircle2 size={18} />
                <p className="text-sm font-black mt-2">risk guardrails ผ่าน</p>
                <p className="text-xs mt-1 opacity-80">ยังควรรีวิว target ทุกเดือน</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <BellRing className="text-blue-700" size={22} />
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">DCA Planner</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">ใช้ Coach cashflow เป็น gate ก่อนลงทุน</p>
            </div>
          </div>
          <NumberField label={`DCA ต่อเดือน (${currency})`} value={monthlyDca} step="100" onChange={(value) => setMonthlyDca(Number(value) || 0)} />
          <div className={`mt-4 rounded-lg border p-4 ${dcaPlan.status === 'pause' ? toneClass.warning : toneClass.info}`}>
            <p className="text-sm font-black">{dcaPlan.message}</p>
            <p className="text-xs mt-1 opacity-80">cashflow เดือนนี้ {formatMoney(financeReport.netCashflow, currency)} · runway {financeReport.runwayMonths.toFixed(1)} เดือน</p>
          </div>
          <div className="space-y-2 mt-4">
            {dcaPlan.orders.slice(0, 5).map((order) => (
              <div key={order.category} className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] p-3">
                <div>
                  <p className="text-sm font-black text-[color:var(--text-primary)]">{order.category}</p>
                  <p className="text-[10px] text-[color:var(--text-muted)]">{order.reason}</p>
                </div>
                <p className="text-sm font-black text-blue-700">{formatMoney(order.amount, currency)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <ClipboardList className="text-emerald-700" size={22} />
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Watchlist</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">รายการที่อยากติดตามก่อนซื้อ</p>
            </div>
          </div>
          <form onSubmit={handleAddWatch} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <TextField label="Symbol" value={watchForm.symbol} onChange={(value) => setWatchForm((prev) => ({ ...prev, symbol: value }))} placeholder="VOO, BTC" />
              <NumberField label="Target price" value={watchForm.targetPrice} onChange={(value) => setWatchForm((prev) => ({ ...prev, targetPrice: value }))} />
            </div>
            <TextField label="Note" value={watchForm.note} onChange={(value) => setWatchForm((prev) => ({ ...prev, note: value }))} placeholder="เหตุผลที่อยากติดตาม" />
            <Button type="submit" size="sm" className="w-full">เพิ่ม Watchlist</Button>
          </form>
          <div className="space-y-2 mt-4">
            {watchlist.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] p-3">
                <div>
                  <p className="text-sm font-black text-[color:var(--text-primary)]">{item.symbol}</p>
                  <p className="text-[10px] text-[color:var(--text-muted)]">{item.note || 'ไม่มี note'} {item.targetPrice ? `· target ${item.targetPrice}` : ''}</p>
                </div>
                <button type="button" onClick={() => removeWatch(item.id)} className="rounded-lg p-1.5 text-[color:var(--text-muted)] hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Holdings</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">มูลค่า, P&L, ราคา live และ action ต่อสินทรัพย์</p>
            </div>
            {holdings.length === 0 && (
              <Button variant="secondary" size="sm" onClick={resetToDefault}>โหลดตัวอย่าง</Button>
            )}
          </div>
          {holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-color)]">
                    <th className="text-left py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">Asset</th>
                    <th className="text-left py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)] hidden sm:table-cell">Category</th>
                    <th className="text-right py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">Units</th>
                    <th className="text-right py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">Price</th>
                    <th className="text-right py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">Value</th>
                    <th className="text-right py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">P&L</th>
                    <th className="text-right py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.holdings.map((holding) => (
                    <tr key={holding.id} className="border-b border-[color:var(--border-color)] last:border-0 hover:bg-slate-50">
                      <td className="py-3">
                        <p className="font-black text-[color:var(--text-primary)]">{holding.symbol}</p>
                        <p className="text-[10px] text-[color:var(--text-muted)] hidden sm:block">{holding.name}</p>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-black" style={{ color: CATEGORY_COLORS[holding.category] || CATEGORY_COLORS.Other, borderColor: `${CATEGORY_COLORS[holding.category] || CATEGORY_COLORS.Other}44`, backgroundColor: `${CATEGORY_COLORS[holding.category] || CATEGORY_COLORS.Other}12` }}>
                          {holding.category}
                        </span>
                      </td>
                      <td className="py-3 text-right text-[color:var(--text-secondary)]">{formatNumber(holding.shares, holding.shares < 1 ? 4 : 2)}</td>
                      <td className="py-3 text-right font-bold text-[color:var(--text-primary)]">
                        {livePrices[holding.symbol] ? formatMoney(holding.currentPrice, holding.currency) : <span className="text-[color:var(--text-muted)]">fallback</span>}
                      </td>
                      <td className="py-3 text-right font-black text-[color:var(--text-primary)]">
                        <span>{formatMoney(holding.value, holding.currency)}</span>
                        {holding.currency !== currency && <span className="block text-[10px] font-normal text-[color:var(--text-muted)]">{formatMoney(holding.valueTarget, currency)}</span>}
                      </td>
                      <td className={`py-3 text-right font-black ${holding.pnlTarget >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        <span>{formatMoney(holding.pnlTarget, currency)}</span>
                        <span className="block text-[10px]">{formatPercent(holding.pnlPercent)}</span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setModal(holding)} className="rounded-lg p-1.5 text-[color:var(--text-muted)] hover:bg-blue-50 hover:text-blue-700">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => handleDelete(holding.id)} className="rounded-lg p-1.5 text-[color:var(--text-muted)] hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto text-[color:var(--text-muted)]" size={34} />
              <p className="mt-3 text-sm font-bold text-[color:var(--text-muted)]">ยังไม่มีสินทรัพย์ในพอร์ต</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <ClipboardList className="text-blue-700" size={22} />
            <div>
              <h2 className="text-lg font-black text-[color:var(--text-primary)]">Transaction Ledger</h2>
              <p className="text-xs text-[color:var(--text-secondary)]">ประวัติซื้อ/ขายในพอร์ต</p>
            </div>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {ledger.length > 0 ? ledger.slice(0, 12).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[color:var(--text-primary)]">{entry.action.toUpperCase()} {entry.symbol}</p>
                    <p className="text-[10px] text-[color:var(--text-muted)]">{entry.date} · {formatNumber(entry.shares, entry.shares < 1 ? 4 : 2)} @ {entry.price} {entry.nativeCurrency}</p>
                  </div>
                  <p className={entry.action === 'sell' ? 'text-emerald-700 text-xs font-black' : 'text-blue-700 text-xs font-black'}>
                    {entry.action === 'sell' ? '+' : '-'}{formatMoney(entry.amount, entry.currency)}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-[color:var(--text-muted)]">ยังไม่มี ledger จากการซื้อ/ขายในหน้านี้</p>
            )}
          </div>
        </Card>
      </section>

      {modal && (
        <HoldingModal
          holding={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
          wallets={wallets}
          rates={rates}
          primaryCurrency={currency}
        />
      )}
    </div>
  );
};
