import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney, CATEGORIES, getCategory, CURRENCY_MAP } from '../utils/constants';
import { Target, PlusCircle, Trash2, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { isSameMonth, parseISO, subMonths, addMonths, format } from 'date-fns';
import { th } from 'date-fns/locale';

export const Budgets = () => {
  const { budgets, updateBudget, deleteBudget, transferBudget, transactions, currency } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: 'food', amount: '' });
  const [transferMode, setTransferMode] = useState(null); // { fromCategoryId: '' }
  const [transferForm, setTransferForm] = useState({ toCategory: '', amount: '' });
  const [pendingDeleteBudget, setPendingDeleteBudget] = useState(null);
  const [transferError, setTransferError] = useState('');

  const [viewMonth, setViewMonth] = useState(() => new Date());

  // Convert { categoryId: amount } to array and calculate spent amounts
  const budgetProgress = useMemo(() => {
    return Object.entries(budgets).map(([categoryId, limitAmount]) => {
      const spent = transactions
        .filter(t => 
          t.type === 'expense' && 
          t.category === categoryId &&
          isSameMonth(parseISO(t.date), viewMonth)
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = limitAmount - spent;
      const progress = Math.min((spent / limitAmount) * 100, 100);
      const isExceeded = spent > limitAmount;
      const isNearLimit = progress >= 80 && !isExceeded;

      return {
        id: categoryId,
        category: categoryId,
        amount: limitAmount,
        spent,
        remaining,
        progress,
        isExceeded,
        isNearLimit
      };
    }).sort((a, b) => b.progress - a.progress);
  }, [budgets, transactions, viewMonth]);

  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const totalSpent = budgetProgress.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallProgress = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const handleAddBudget = (e) => {
    e.preventDefault();
    if (!newBudget.amount || isNaN(newBudget.amount)) return;
    
    updateBudget(newBudget.category, Number(newBudget.amount));
    setIsAdding(false);
    setNewBudget({ category: 'food', amount: '' });
  };

  const handleDeleteBudget = (categoryId) => {
    setPendingDeleteBudget(categoryId);
  };

  const confirmDeleteBudget = () => {
    if (pendingDeleteBudget) {
      deleteBudget(pendingDeleteBudget);
      setPendingDeleteBudget(null);
    }
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    if (!transferForm.amount || !transferForm.toCategory || !transferMode) return;
    
    const amt = Number(transferForm.amount);
    const fromCategoryId = transferMode.fromCategoryId;
    
    if (amt <= 0 || amt > (budgets[fromCategoryId] || 0)) {
      setTransferError('จำนวนเงินไม่ถูกต้อง หรือเกินงบประมาณที่มีอยู่');
      return;
    }
    setTransferError('');

    transferBudget(fromCategoryId, transferForm.toCategory, amt);
    setTransferMode(null);
    setTransferForm({ toCategory: '', amount: '' });
  };

  const currencySymbol = CURRENCY_MAP[currency]?.symbol || '฿';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">งบประมาณรายเดือน</h1>
          <p className="text-[color:var(--text-secondary)]">จัดการและควบคุมค่าใช้จ่ายของคุณ</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-500 border-none shadow-lg shadow-indigo-500/25">
            <PlusCircle size={18} className="mr-2" />
            ตั้งงบประมาณใหม่
          </Button>
        )}
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} className="p-2 rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors">←</button>
        <span className="text-sm font-bold text-[color:var(--text-primary)] min-w-[140px] text-center">{format(viewMonth, 'MMMM yyyy', { locale: th })}</span>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} className="p-2 rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors">→</button>
        <button onClick={() => setViewMonth(new Date())} className="px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition-colors">เดือนนี้</button>
      </div>

      <Card className="p-6 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border-indigo-500/20">
        <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
          <Target size={20} className="text-indigo-400" />
          ภาพรวมงบประมาณ
        </h2>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-[color:var(--text-secondary)]">ใช้ไปแล้ว {formatMoney(totalSpent, currency)}</span>
            <span className="text-[color:var(--text-secondary)]">ทั้งหมด {formatMoney(totalBudget, currency)}</span>
          </div>
          <div className="w-full bg-[color:var(--bg-primary)] rounded-full h-4 overflow-hidden border border-[color:var(--border-color)]">
            <div 
              className={`h-full transition-all duration-1000 ${
                overallProgress > 90 ? 'bg-rose-500' : overallProgress > 75 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <p className={`text-sm font-medium ${totalRemaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            คงเหลือ: {formatMoney(totalRemaining, currency)}
          </p>
        </div>
      </Card>

      {isAdding && (
        <Card className="p-6 border-indigo-500/30 shadow-indigo-500/10">
          <h3 className="text-lg font-bold text-[color:var(--text-primary)] mb-4">ตั้งงบประมาณใหม่</h3>
          <form onSubmit={handleAddBudget} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs text-[color:var(--text-secondary)] mb-1">หมวดหมู่</label>
              <select 
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-indigo-500"
                value={newBudget.category}
                onChange={e => setNewBudget({ ...newBudget, category: e.target.value })}
              >
                {CATEGORIES.expense.map(cat => (
                  <option key={`new-${cat.id}`} value={cat.id} disabled={!!budgets[cat.id] && budgets[cat.id] > 0}>
                    {cat.label} {budgets[cat.id] > 0 ? '(ตั้งไว้แล้ว)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[color:var(--text-secondary)] mb-1">จำนวนเงิน ({currencySymbol})</label>
              <input 
                type="number" 
                required 
                min="1"
                placeholder="เช่น 5000"
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-indigo-500"
                value={newBudget.amount}
                onChange={e => setNewBudget({ ...newBudget, amount: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>ยกเลิก</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 border-none">บันทึก</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Transfer Budget Form */}
      {transferMode && (
        <Card className="p-6 border-blue-500/30 shadow-blue-500/10 border-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <ArrowRightLeft size={16} />
            </div>
            <h3 className="text-lg font-bold text-[color:var(--text-primary)]">
              โยกย้ายงบประมาณจาก "{getCategory('expense', transferMode.fromCategoryId).label}"
            </h3>
          </div>
          
          <form onSubmit={handleTransfer} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs text-[color:var(--text-secondary)] mb-1">โยกไปยังหมวดหมู่</label>
              <select 
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                value={transferForm.toCategory}
                onChange={e => setTransferForm({ ...transferForm, toCategory: e.target.value })}
                required
              >
                <option value="" disabled>เลือกหมวดหมู่ปลายทาง</option>
                {CATEGORIES.expense.map(cat => (
                  <option key={`to-${cat.id}`} value={cat.id} disabled={cat.id === transferMode.fromCategoryId}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs text-[color:var(--text-secondary)] mb-1">จำนวนเงินที่ต้องการโยก ({currencySymbol})</label>
              <input 
                type="number" 
                required 
                max={budgets[transferMode.fromCategoryId] || 0}
                min="1"
                placeholder={`สูงสุด ${budgets[transferMode.fromCategoryId] || 0}`}
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                value={transferForm.amount}
                onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setTransferMode(null)}>ยกเลิก</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-500 flex-1 border-none">ยืนยัน</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgetProgress.filter(b => b.amount > 0).map(budget => {
          const cat = getCategory('expense', budget.category);
          const Icon = cat.icon;
          
          return (
            <Card key={budget.id} className="p-5 flex flex-col group transition-all hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[color:var(--bg-secondary)] shadow-inner" style={{ color: cat.color }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[color:var(--text-primary)]">{cat.label}</h3>
                    <p className="text-xs text-[color:var(--text-secondary)]">งบ: {formatMoney(budget.amount, currency)}</p>
                  </div>
                </div>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setTransferMode({ fromCategoryId: budget.id })}
                    className="p-1.5 text-[color:var(--text-secondary)] hover:text-blue-400 hover:bg-[color:var(--bg-card-hover)] rounded-lg transition-colors"
                    title="โยกย้ายงบ"
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteBudget(budget.id)}
                    className="p-1.5 text-[color:var(--text-secondary)] hover:text-rose-400 hover:bg-[color:var(--bg-card-hover)] rounded-lg transition-colors"
                    title="ลบงบประมาณ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[color:var(--text-secondary)]">{formatMoney(budget.spent, currency)}</span>
                  <span className={budget.isExceeded ? 'text-rose-400 font-bold' : 'text-[color:var(--text-secondary)]'}>
                    {budget.isExceeded ? `เกินมา ${formatMoney(Math.abs(budget.remaining), currency)}` : `เหลือ ${formatMoney(budget.remaining, currency)}`}
                  </span>
                </div>
                <div className="w-full bg-[color:var(--bg-primary)] rounded-full h-2.5 overflow-hidden border border-[color:var(--border-color)]">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      budget.isExceeded ? 'bg-rose-500' : budget.isNearLimit ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${budget.progress}%` }}
                  />
                </div>
                {budget.isNearLimit && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    ใกล้ถึงขีดจำกัดแล้ว
                  </p>
                )}
                {budget.isExceeded && (
                  <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    ใช้งบประมาณเกินกำหนด
                  </p>
                )}
              </div>
            </Card>
          );
        })}
        {budgetProgress.filter(b => b.amount > 0).length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-[color:var(--text-muted)] border-2 border-dashed border-[color:var(--border-color)] rounded-2xl">
            ยังไม่มีการตั้งงบประมาณ <br/>
            กด "ตั้งงบประมาณใหม่" เพื่อเริ่มควบคุมค่าใช้จ่ายของคุณ
          </div>
        )}
      </div>
      {/* Delete Budget Confirmation Modal */}
      {pendingDeleteBudget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[color:var(--bg-secondary)]/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)]">ลบงบประมาณนี้?</h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              {getCategory('expense', pendingDeleteBudget).label} — {formatMoney(budgets[pendingDeleteBudget] || 0, currency)}
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setPendingDeleteBudget(null)}>ยกเลิก</Button>
              <Button variant="danger" className="flex-1" onClick={confirmDeleteBudget}>ลบ</Button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Error Display */}
      {transferError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-rose-500/20 border border-rose-500/40 text-rose-300 px-4 py-2 rounded-xl text-xs font-bold animate-pulse">
          {transferError}
        </div>
      )}
    </div>
  );
};
