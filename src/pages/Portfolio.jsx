import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useChartSize } from '../hooks/useChartSize';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon,
  Plus, Pencil, Trash2, RefreshCw, Loader2, AlertTriangle, X,
  ArrowRight, Wallet, Info
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  loadHoldings, loadHoldingsFromCloud, saveHoldings, 
  fetchCryptoPrices, fetchStockPrices, fetchExchangeRates,
  calculatePortfolioStats, calculateAllocation,
  formatPercent, formatNumber, CATEGORY_COLORS, DEFAULT_HOLDINGS,
  convertCurrency
} from '../utils/portfolioData';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../utils/constants';

const CATEGORY_OPTIONS = ['US Stock', 'Crypto', 'ETF', 'Bond', 'Other'];

// Modal for add/edit holding
const HoldingModal = ({ holding, onSave, onClose, wallets = [], rates = {}, primaryCurrency = 'THB' }) => {
  const [form, setForm] = useState(
    holding || { symbol: '', name: '', category: 'US Stock', shares: '', avgCost: '' }
  );

  // Edit Mode choice: 'basic' (correct typo) or 'buymore' (record purchase/sale transaction)
  const [editMode, setEditMode] = useState('buymore'); // Default to transaction mode for edits
  const [action, setAction] = useState('buy'); // 'buy' | 'sell'

  // Transaction states
  const [recordTx, setRecordTx] = useState(true); // Default to true to encourage logging
  const [sharesBought, setSharesBought] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [selectedWallet, setSelectedWallet] = useState(wallets?.[0]?.id || 'wallet-cash');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  const assetCurrency = form.symbol.toUpperCase().endsWith('.BK') ? 'THB' : 'USD';

  // Recalculated values for buy/sell
  const recalculatedShares = useMemo(() => {
    if (!holding || editMode !== 'buymore') return null;
    const currentShares = Number(holding.shares) || 0;
    const qty = Number(sharesBought) || 0;
    const nextShares = action === 'buy' ? currentShares + qty : currentShares - qty;
    return Math.max(0, nextShares);
  }, [holding, editMode, sharesBought, action]);

  const recalculatedAvgCost = useMemo(() => {
    if (!holding || editMode !== 'buymore') return null;
    const currentShares = Number(holding.shares) || 0;
    const currentAvgCost = Number(holding.avgCost) || 0;
    const qty = Number(sharesBought) || 0;
    const price = Number(pricePerShare) || 0;

    if (action === 'sell') {
      return currentAvgCost; // Selling doesn't change cost basis for remaining shares
    }

    const newTotalShares = currentShares + qty;
    if (newTotalShares === 0) return 0;
    return ((currentShares * currentAvgCost) + (qty * price)) / newTotalShares;
  }, [holding, editMode, sharesBought, pricePerShare, action]);

  const nativeTxAmount = useMemo(() => {
    if (!holding) {
      return (Number(form.shares) || 0) * (Number(form.avgCost) || 0);
    } else if (editMode === 'buymore') {
      return (Number(sharesBought) || 0) * (Number(pricePerShare) || 0);
    }
    return 0;
  }, [holding, form.shares, form.avgCost, editMode, sharesBought, pricePerShare]);

  const convertedTxAmount = useMemo(() => {
    return convertCurrency(nativeTxAmount, assetCurrency, primaryCurrency, rates);
  }, [nativeTxAmount, assetCurrency, primaryCurrency, rates]);

  // Validation: Prevent selling more shares than currently held
  const isSellInvalid = holding && editMode === 'buymore' && action === 'sell' && (Number(sharesBought) || 0) > (holding.shares || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.symbol.trim()) return;

    let updatedShares = Number(form.shares);
    let updatedAvgCost = Number(form.avgCost);

    if (holding && editMode === 'buymore') {
      if (isSellInvalid) return;
      updatedShares = recalculatedShares;
      updatedAvgCost = recalculatedAvgCost;
    }

    if (isNaN(updatedShares) || updatedShares < 0 || isNaN(updatedAvgCost) || updatedAvgCost < 0) {
      return;
    }

    const savedHolding = {
      ...form,
      id: form.id || `h-${Date.now()}`,
      symbol: form.symbol.toUpperCase().trim(),
      name: form.name.trim() || form.symbol.toUpperCase(),
      shares: updatedShares,
      avgCost: updatedAvgCost,
    };

    let txData = null;
    if (recordTx && nativeTxAmount > 0) {
      const sharesVal = holding ? Number(sharesBought) : Number(form.shares);
      const priceVal = holding ? Number(pricePerShare) : Number(form.avgCost);
      const isSell = holding && editMode === 'buymore' && action === 'sell';

      txData = {
        type: isSell ? 'income' : 'saving',
        category: isSell ? 'other_in' : 'investment',
        amount: convertedTxAmount,
        date: txDate,
        note: isSell 
          ? `ขายสินทรัพย์ ${savedHolding.symbol} (${sharesVal} หน่วย @ ${priceVal} ${assetCurrency})`
          : `ซื้อสินทรัพย์ ${savedHolding.symbol} (${sharesVal} หน่วย @ ${priceVal} ${assetCurrency})`,
        walletId: selectedWallet,
      };
    }

    onSave(savedHolding, txData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden transition-all duration-300 transform scale-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 border-b border-[color:var(--border-color)] pb-3">
          <h2 className="text-lg font-black text-[color:var(--text-primary)] flex items-center gap-2">
            <PieChartIcon size={20} className="text-blue-500" />
            {holding ? 'จัดการธุรกรรมสินทรัพย์' : 'เพิ่มสินทรัพย์ใหม่'}
          </h2>
          <button onClick={onClose} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Edit mode tab selection (Only for edit) */}
        {holding && (
          <div className="flex gap-2 p-1 bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setEditMode('buymore')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                editMode === 'buymore' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              บันทึกซื้อเพิ่ม / ขายออก
            </button>
            <button
              type="button"
              onClick={() => setEditMode('basic')}
              className={`flex-1 py-2 rounded-lg transition-all ${
                editMode === 'basic' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
              }`}
            >
              แก้ไขข้อมูลดิบโดยตรง
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">Symbol (สัญลักษณ์)</label>
              <input
                type="text"
                value={form.symbol}
                onChange={e => setForm({ ...form, symbol: e.target.value })}
                placeholder="เช่น AAPL, BTC, PTT.BK"
                className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed uppercase font-bold"
                required
                disabled={!!holding}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">ประเภทสินทรัพย์</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!!holding && editMode === 'buymore'}
              >
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {!holding && (
            <p className="text-[9px] text-[color:var(--text-muted)] leading-tight bg-[color:var(--bg-primary)] p-2 rounded-lg border border-[color:var(--border-color)]">
              * หุ้นไทย: ลงท้ายด้วย <b>.BK</b> (เช่น PTT.BK) | หุ้นสหรัฐฯ: (เช่น AAPL) | คริปโต: (เช่น BTC, ETH)
            </p>
          )}

          <div>
            <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">ชื่อสินทรัพย์ / ชื่อบริษัท</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Bitcoin, Apple Inc., ปตท."
              className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!!holding && editMode === 'buymore'}
            />
          </div>

          {/* Form fields based on adding new or editMode selection */}
          {(!holding || editMode === 'basic') ? (
            // --- Basic Adding or Direct Edit ---
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">จำนวนที่ถือครอง</label>
                <input
                  type="number"
                  value={form.shares}
                  onChange={e => setForm({ ...form, shares: e.target.value })}
                  placeholder="0"
                  step="any"
                  min="0"
                  className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">ต้นทุนเฉลี่ย ({assetCurrency})</label>
                <input
                  type="number"
                  value={form.avgCost}
                  onChange={e => setForm({ ...form, avgCost: e.target.value })}
                  placeholder="0.00"
                  step="any"
                  min="0"
                  className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          ) : (
            // --- Buy More / Sell Form ---
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase">ประเภทรายการ</label>
              <div className="flex gap-2 p-1 bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl">
                <button
                  type="button"
                  onClick={() => setAction('buy')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    action === 'buy'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
                  }`}
                >
                  ซื้อเพิ่ม (Buy)
                </button>
                <button
                  type="button"
                  onClick={() => setAction('sell')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    action === 'sell'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]'
                  }`}
                >
                  ขายออก (Sell)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">
                    {action === 'buy' ? 'จำนวนที่ซื้อเพิ่ม' : 'จำนวนที่ขายออก'}
                  </label>
                  <input
                    type="number"
                    value={sharesBought}
                    onChange={e => setSharesBought(e.target.value)}
                    placeholder="0"
                    step="any"
                    min="0"
                    className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">
                    {action === 'buy' ? `ราคาซื้อต่อหน่วย (${assetCurrency})` : `ราคาขายต่อหน่วย (${assetCurrency})`}
                  </label>
                  <input
                    type="number"
                    value={pricePerShare}
                    onChange={e => setPricePerShare(e.target.value)}
                    placeholder="0.00"
                    step="any"
                    min="0"
                    className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {isSellInvalid && (
                <p className="text-[10px] text-rose-400 font-bold">
                  * ไม่สามารถขายเกินจำนวนหน่วยที่ถืออยู่ได้ (มีอยู่ {holding.shares} หน่วย)
                </p>
              )}
            </div>
          )}

          {/* Auto Transaction Recording Toggle */}
          {wallets.length > 0 && (!holding || (holding && editMode === 'buymore')) && (
            <div className="border-t border-[color:var(--border-color)] pt-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recordTx}
                  onChange={e => setRecordTx(e.target.checked)}
                  className="rounded border-[color:var(--border-color)] bg-[color:var(--bg-primary)] text-blue-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-[color:var(--text-primary)]">
                  บันทึกประวัติธุรกรรมอัตโนมัติไปยังบัญชี
                </span>
              </label>

              {recordTx && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">เลือกกระเป๋าเงิน / บัญชี</label>
                    <select
                      value={selectedWallet}
                      onChange={e => setSelectedWallet(e.target.value)}
                      className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-2.5 py-1.5 text-xs text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                    >
                      {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[color:var(--text-muted)] uppercase mb-1">วันที่ทำรายการ</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={e => setTxDate(e.target.value)}
                      className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-2 py-1 text-xs text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Preview Card */}
          {nativeTxAmount > 0 && (
            <div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] p-4 space-y-2 animate-fadeIn relative">
              <div className="absolute top-2 right-2 text-blue-500/20">
                <Wallet size={36} />
              </div>
              <p className="text-[10px] font-black text-[color:var(--text-muted)] uppercase border-b border-[color:var(--border-color)] pb-1 flex items-center gap-1.5">
                <Info size={12} className="text-blue-400" />
                สรุปข้อมูลการทำรายการ (Preview)
              </p>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[color:var(--text-secondary)]">
                  <span>มูลค่าธุรกรรม ({assetCurrency}):</span>
                  <span className="font-bold text-[color:var(--text-primary)]">
                    {formatMoney(nativeTxAmount, assetCurrency)}
                  </span>
                </div>

                {assetCurrency !== primaryCurrency && (
                  <div className="flex justify-between text-[color:var(--text-muted)] border-b border-dashed border-[color:var(--border-color)] pb-1.5">
                    <span>คิดเป็นสกุลเงินหลัก ({primaryCurrency}):</span>
                    <span className="font-bold text-blue-400">
                      ~ {formatMoney(convertedTxAmount, primaryCurrency)}
                    </span>
                  </div>
                )}

                {holding && editMode === 'buymore' && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex justify-between text-[color:var(--text-muted)]">
                      <span>จำนวนหน่วยรวมใหม่:</span>
                      <span className="font-bold text-[color:var(--text-primary)] flex items-center gap-1">
                        {holding.shares} <ArrowRight size={12} className="text-[color:var(--text-muted)]" /> {recalculatedShares}
                      </span>
                    </div>
                    {action === 'buy' && (
                      <div className="flex justify-between text-[color:var(--text-muted)]">
                        <span>ต้นทุนเฉลี่ยใหม่:</span>
                        <span className="font-bold text-[color:var(--text-primary)] flex items-center gap-1">
                          {formatMoney(holding.avgCost, assetCurrency)} <ArrowRight size={12} className="text-[color:var(--text-muted)]" /> {formatMoney(recalculatedAvgCost, assetCurrency)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {recordTx && (
                  <p className="text-[10px] text-amber-400/90 leading-normal pt-1.5">
                    * ระบบจะสร้างธุรกรรม
                    <b> {action === 'sell' ? 'รายรับ (ขายสินทรัพย์)' : 'เงินออม (ซื้อสินทรัพย์)'} </b>
                    จำนวน <b>{formatMoney(convertedTxAmount, primaryCurrency)}</b> หักเข้า/ออกจาก 
                    <b> {wallets.find(w => w.id === selectedWallet)?.name || ''}</b>
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="text-[10px] text-[color:var(--text-muted)] leading-relaxed">
            * <b>หมายเหตุ:</b> ระบุราคาเฉลี่ยตามสกุลเงินดั้งเดิมของสินทรัพย์ เช่น หุ้นไทยระบุเป็นบาท (THB), หุ้นสหรัฐฯ และคริปโตระบุเป็นดอลลาร์ (USD) ระบบจะจัดการแปลงอัตราแลกเปลี่ยนในพอร์ตโดยอัตโนมัติ
          </p>

          <div className="flex gap-3 pt-2 border-t border-[color:var(--border-color)]">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">ยกเลิก</Button>
            <Button type="submit" className="flex-1" disabled={isSellInvalid}>
              บันทึกรายการ
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Portfolio = () => {
  const { currency, wallets, addTransaction, setPortfolioValue } = useFinance();
  const [holdings, setHoldings] = useState(() => loadHoldings());
  const [livePrices, setLivePrices] = useState({});
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [modal, setModal] = useState(null); // null | 'add' | holding object
  const chartSize = useChartSize(250);

  // Load from cloud on mount
  useEffect(() => {
    loadHoldingsFromCloud().then(cloudData => {
      if (cloudData) setHoldings(cloudData);
    });
  }, []);

  // Fetch live prices and exchange rates
  const refreshPrices = useCallback(async () => {
    setLoading(true);
    try {
      const cryptoSymbols = holdings.filter(h => h.category === 'Crypto').map(h => h.symbol);
      const stockSymbols = holdings.filter(h => h.category !== 'Crypto').map(h => h.symbol);
      
      const fromCurrencies = holdings.map(h => 
        h.symbol.toUpperCase().endsWith('.BK') ? 'THB' : 'USD'
      );

      const [cryptoPrices, stockPrices, exchangeRates] = await Promise.all([
        fetchCryptoPrices(cryptoSymbols),
        fetchStockPrices(stockSymbols),
        fetchExchangeRates(fromCurrencies, currency),
      ]);

      setLivePrices({ ...cryptoPrices, ...stockPrices });
      setRates(exchangeRates);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('[Portfolio] Price refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [holdings, currency]);

  useEffect(() => {
    refreshPrices();
  }, [refreshPrices]);

  // Calculate stats
  const stats = useMemo(() => 
    calculatePortfolioStats(holdings, livePrices, currency, rates), 
    [holdings, livePrices, currency, rates]
  );

  // Sync total portfolio value to context state for Dashboard Net Worth
  useEffect(() => {
    if (stats && stats.totalValue !== undefined) {
      setPortfolioValue(stats.totalValue);
    }
  }, [stats, setPortfolioValue]);
  
  const allocation = useMemo(() => calculateAllocation(stats.holdings), [stats.holdings]);

  const handleSave = async (holding, txData) => {
    setHoldings(prev => {
      const exists = prev.find(h => h.id === holding.id);
      const next = exists 
        ? prev.map(h => h.id === holding.id ? holding : h)
        : [...prev, holding];
      saveHoldings(next); // Save directly inside handler
      return next;
    });

    if (txData) {
      try {
        await addTransaction(txData);
      } catch (err) {
        console.error('[Portfolio] Failed to add transaction for holding action:', err);
      }
    }

    setModal(null);
  };

  const handleDelete = (id) => {
    setHoldings(prev => {
      const next = prev.filter(h => h.id !== id);
      saveHoldings(next); // Save directly inside handler
      return next;
    });
  };

  const resetToDefault = () => {
    setHoldings(DEFAULT_HOLDINGS);
    saveHoldings(DEFAULT_HOLDINGS); // Save directly inside handler
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--text-primary)]">พอร์ตลงทุน (Portfolio)</h1>
          <p className="text-[color:var(--text-secondary)] text-sm mt-1">ติดตามหุ้นและคริปโตแบบเรียลไทม์</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={refreshPrices} disabled={loading} className="flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            รีเฟรชราคา
          </Button>
          <Button onClick={() => setModal('add')} className="flex items-center gap-2">
            <Plus size={16} /> เพิ่มสินทรัพย์
          </Button>
        </div>
      </header>

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-[10px] text-[color:var(--text-muted)]">
          อัปเดตราคาล่าสุด: {lastUpdated.toLocaleString('th-TH')}
        </p>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-secondary)]">มูลค่ารวม ({currency})</p>
              <p className="text-2xl font-black text-[color:var(--text-primary)] mt-1">{formatMoney(stats.totalValue, currency)}</p>
            </div>
            <DollarSign size={28} className="text-blue-400" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-secondary)]">กำไร/ขาดทุนรวม</p>
              <p className={`text-2xl font-black mt-1 ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatMoney(stats.totalPnL, currency)}
              </p>
              <p className={`text-xs mt-0.5 ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPercent(stats.totalPnLPercent)}
              </p>
            </div>
            {stats.totalPnL >= 0 ? <TrendingUp size={28} className="text-emerald-400" /> : <TrendingDown size={28} className="text-rose-400" />}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-secondary)]">เปลี่ยนแปลงวันนี้</p>
              <p className={`text-2xl font-black mt-1 ${stats.totalDayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatMoney(stats.totalDayChange, currency)}
              </p>
              <p className={`text-xs mt-0.5 ${stats.totalDayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPercent(stats.dayChangePercent)}
              </p>
            </div>
            <TrendingUp size={28} className={stats.totalDayChange >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[color:var(--text-secondary)]">ต้นทุนรวม ({currency})</p>
              <p className="text-2xl font-black text-[color:var(--text-primary)] mt-1">{formatMoney(stats.totalCost, currency)}</p>
            </div>
            <PieChartIcon size={28} className="text-violet-400" />
          </div>
        </Card>
      </div>

      {/* Charts + Holdings Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Pie Chart */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-4">สัดส่วนสินทรัพย์ (Allocation)</h2>
          <div ref={chartSize.ref} className="h-[250px] w-full flex items-center justify-center">
            {allocation.length > 0 && chartSize.isReady ? (
              <PieChart width={chartSize.width} height={chartSize.height}>
                <Pie
                  data={allocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {allocation.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value) => formatMoney(value, currency)}
                />
              </PieChart>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[color:var(--text-muted)]">
                ไม่มีข้อมูล
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {allocation.map(item => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[color:var(--text-secondary)]">{item.name}</span>
                </div>
                <span className="font-bold text-[color:var(--text-primary)]">
                  {stats.totalValue > 0 ? ((item.value / stats.totalValue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Holdings Table */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)]">รายการถือครอง (Holdings)</h2>
            {holdings.length === 0 && (
              <Button variant="ghost" onClick={resetToDefault} className="text-xs">
                โหลดข้อมูลตัวอย่าง
              </Button>
            )}
          </div>

          {holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border-color)]">
                    <th className="text-left py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider">Symbol</th>
                    <th className="text-left py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider hidden sm:table-cell">ประเภท</th>
                    <th className="text-right py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider">จำนวน</th>
                    <th className="text-right py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider">ราคาตลาด</th>
                    <th className="text-right py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider hidden sm:table-cell">ต้นทุนเฉลี่ย</th>
                    <th className="text-right py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider">มูลค่า</th>
                    <th className="text-right py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider">P&L (กำไร/ขาดทุน)</th>
                    <th className="text-right py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider hidden md:table-cell">24h</th>
                    <th className="text-right py-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.holdings.map(h => (
                    <tr key={h.id} className="border-b border-[color:var(--border-color)] last:border-0 hover:bg-white/[0.02]">
                      <td className="py-3">
                        <div>
                          <span className="font-bold text-[color:var(--text-primary)]">{h.symbol}</span>
                          <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5 hidden sm:block">{h.name}</p>
                        </div>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                          backgroundColor: `${CATEGORY_COLORS[h.category]}15`,
                          color: CATEGORY_COLORS[h.category],
                          border: `1px solid ${CATEGORY_COLORS[h.category]}30`,
                        }}>
                          {h.category}
                        </span>
                      </td>
                      <td className="py-3 text-right text-[color:var(--text-secondary)]">{formatNumber(h.shares, h.shares < 1 ? 4 : 2)}</td>
                      <td className="py-3 text-right text-[color:var(--text-primary)] font-medium">
                        {livePrices[h.symbol] ? formatMoney(h.currentPrice, h.currency) : <span className="text-[color:var(--text-muted)]">—</span>}
                      </td>
                      <td className="py-3 text-right text-[color:var(--text-secondary)] hidden sm:table-cell">
                        {formatMoney(h.avgCost, h.currency)}
                      </td>
                      <td className="py-3 text-right text-[color:var(--text-primary)] font-bold">
                        <div>
                          <span>{formatMoney(h.value, h.currency)}</span>
                          {h.currency !== currency && (
                            <span className="block text-[10px] text-[color:var(--text-muted)] font-normal mt-0.5">
                              {formatMoney(h.valueTarget, currency)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 text-right font-bold ${h.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <div>
                          <span>{formatMoney(h.pnl, h.currency)}</span>
                          <span className="block text-[10px] font-normal">{formatPercent(h.pnlPercent)}</span>
                          {h.currency !== currency && (
                            <span className="block text-[9px] text-[color:var(--text-muted)] font-normal mt-0.5">
                              ({formatMoney(h.pnlTarget, currency)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 text-right font-medium hidden md:table-cell ${h.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {livePrices[h.symbol] ? formatPercent(h.change24h) : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setModal(h)}
                            className="p-1.5 rounded-lg text-[color:var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            className="p-1.5 rounded-lg text-[color:var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
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
              <AlertTriangle size={32} className="text-[color:var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[color:var(--text-muted)]">ยังไม่มีสินทรัพย์ในพอร์ต</p>
              <p className="text-xs text-[color:var(--text-muted)] mt-1">กดปุ่ม &quot;เพิ่มสินทรัพย์&quot; หรือ &quot;โหลดข้อมูลตัวอย่าง&quot;</p>
            </div>
          )}
        </Card>
      </div>

      {/* Modal */}
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
