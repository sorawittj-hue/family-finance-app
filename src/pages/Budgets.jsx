import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney, CATEGORIES, getCategory, CURRENCY_MAP } from '../utils/constants';
import { Target, PlusCircle, Trash2, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { isSameMonth, parseISO } from 'date-fns';

export const Budgets = () => {
  const { budgets, updateBudget, transferBudget, transactions, currency } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: 'food', amount: '' });
  const [transferMode, setTransferMode] = useState(null); // { fromCategoryId: '' }
  const [transferForm, setTransferForm] = useState({ toCategory: '', amount: '' });

  const currentMonth = new Date();

  // Convert { categoryId: amount } to array and calculate spent amounts
  const budgetProgress = useMemo(() => {
    return Object.entries(budgets).map(([categoryId, limitAmount]) => {
      const spent = transactions
        .filter(t => 
          t.type === 'expense' && 
          t.category === categoryId &&
          isSameMonth(parseISO(t.date), currentMonth)
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
  }, [budgets, transactions]);

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
    if (window.confirm('คุณต้องการลบงบประมาณนี้ใช่หรือไม่?')) {
      const newBudgets = { ...budgets };
      delete newBudgets[categoryId];
      // Since context doesn't expose deleteBudget, we can emulate it by updating state manually,
      // but the safest way is to update it to 0, which functionally disables it, or 
      // wait, we can just use updateBudget(categoryId, undefined) ?
      // FinanceContext: setBudgets((prev) => ({ ...prev, [categoryId]: amount }));
      // Actually we can set it to 0, or just leave it. Let's set it to 0.
      updateBudget(categoryId, 0);
    }
  };

  const handleTransfer = (e) => {
    e.preventDefault();
    if (!transferForm.amount || !transferForm.toCategory || !transferMode) return;
    
    const amt = Number(transferForm.amount);
    const fromCategoryId = transferMode.fromCategoryId;
    
    if (amt <= 0 || amt > (budgets[fromCategoryId] || 0)) {
      alert('จำนวนเงินไม่ถูกต้อง หรือเกินงบประมาณที่มีอยู่');
      return;
    }

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

      <Card className="p-6 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border-indigo-500/20">
        <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
          <Target size={20} className="text-indigo-400" />
          ภาพรวมงบประมาณเดือนนี้
        </h2>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-[color:var(--text-secondary)]">ใช้ไปแล้ว {formatMoney(totalSpent)} {currencySymbol}</span>
            <span className="text-[color:var(--text-secondary)]">ทั้งหมด {formatMoney(totalBudget)} {currencySymbol}</span>
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
            คงเหลือ: {formatMoney(totalRemaining)} {currencySymbol}
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
                    <p className="text-xs text-[color:var(--text-secondary)]">งบ: {formatMoney(budget.amount)} {currencySymbol}</p>
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
                  <span className="text-[color:var(--text-secondary)]">{formatMoney(budget.spent)}</span>
                  <span className={budget.isExceeded ? 'text-rose-400 font-bold' : 'text-[color:var(--text-secondary)]'}>
                    {budget.isExceeded ? `เกินมา ${formatMoney(Math.abs(budget.remaining))}` : `เหลือ ${formatMoney(budget.remaining)}`}
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
    </div>
  );
};
