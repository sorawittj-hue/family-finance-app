import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useChartSize } from '../hooks/useChartSize';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon,
  Plus, Pencil, Trash2, RefreshCw, Loader2, AlertTriangle, X
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  loadHoldings, loadHoldingsFromCloud, saveHoldings, 
  fetchCryptoPrices, fetchStockPrices, fetchExchangeRates,
  calculatePortfolioStats, calculateAllocation,
  formatPercent, formatNumber, CATEGORY_COLORS, DEFAULT_HOLDINGS
} from '../utils/portfolioData';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../utils/constants';

const CATEGORY_OPTIONS = ['US Stock', 'Crypto', 'ETF', 'Bond', 'Other'];

// Modal for add/edit holding
const HoldingModal = ({ holding, onSave, onClose }) => {
  const [form, setForm] = useState(
    holding || { symbol: '', name: '', category: 'US Stock', shares: '', avgCost: '' }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.symbol.trim() || !form.shares || !form.avgCost) return;
    onSave({
      ...form,
      id: form.id || `h-${Date.now()}`,
      symbol: form.symbol.toUpperCase().trim(),
      name: form.name.trim() || form.symbol.toUpperCase(),
      shares: Number(form.shares),
      avgCost: Number(form.avgCost),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
            {holding ? 'แก้ไขสินทรัพย์' : 'เพิ่มสินทรัพย์'}
          </h2>
          <button onClick={onClose} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1">Symbol (สัญลักษณ์)</label>
            <input
              type="text"
              value={form.symbol}
              onChange={e => setForm({ ...form, symbol: e.target.value })}
              placeholder="เช่น BTC, AAPL, PTT.BK"
              className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
              required
            />
            <p className="text-[10px] text-[color:var(--text-muted)] mt-1">
              * หุ้นสหรัฐฯ เช่น <b>AAPL</b>, <b>TSLA</b> | หุ้นไทย เช่น <b>PTT.BK</b>, <b>CPALL.BK</b> (ต้องเติม .BK) | คริปโต เช่น <b>BTC</b>, <b>ETH</b>
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1">ชื่อสินทรัพย์</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Bitcoin, Apple, ปตท., etc."
              className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1">ประเภท</label>
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
            >
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1">จำนวน (shares)</label>
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
              <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1">ต้นทุนเฉลี่ย (ต่อหน่วย)</label>
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
          <p className="text-[10px] text-[color:var(--text-muted)] leading-relaxed">
            * <b>หมายเหตุ:</b> ระบุราคาต้นทุนตามสกุลเงินดั้งเดิมของสินทรัพย์ เช่น หุ้นไทยระบุเป็นบาท (THB), หุ้นสหรัฐฯ และคริปโตระบุเป็นดอลลาร์ (USD) ระบบจะแปลงมูลค่ารวมให้สอดคล้องกับสกุลเงินหลักของแอพโดยอัตโนมัติ
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">ยกเลิก</Button>
            <Button type="submit" className="flex-1">บันทึก</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Portfolio = () => {
  const { currency } = useFinance();
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
  
  const allocation = useMemo(() => calculateAllocation(stats.holdings), [stats.holdings]);

  const handleSave = (holding) => {
    setHoldings(prev => {
      const exists = prev.find(h => h.id === holding.id);
      const next = exists 
        ? prev.map(h => h.id === holding.id ? holding : h)
        : [...prev, holding];
      saveHoldings(next); // Save directly inside handler
      return next;
    });
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
        />
      )}
    </div>
  );
};
