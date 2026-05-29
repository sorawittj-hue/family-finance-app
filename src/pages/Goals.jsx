import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney } from '../utils/constants';
import { Target, PlusCircle, Trash2, Trophy } from 'lucide-react';

export const Goals = () => {
  const { goals, addGoal, updateGoal, deleteGoal, currency } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '' });
  const [addFundsId, setAddFundsId] = useState(null);
  const [fundsAmount, setFundsAmount] = useState('');

  const handleAddGoal = (e) => {
    e.preventDefault();
    if (newGoal.name && newGoal.targetAmount) {
      addGoal({ name: newGoal.name, targetAmount: Number(newGoal.targetAmount) });
      setNewGoal({ name: '', targetAmount: '' });
      setIsAdding(false);
    }
  };

  const handleAddFunds = (e, goal) => {
    e.preventDefault();
    if (fundsAmount) {
      updateGoal(goal.id, goal.currentAmount + Number(fundsAmount));
      setAddFundsId(null);
      setFundsAmount('');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--text-primary)]">เป้าหมายการออม</h1>
          <p className="text-[color:var(--text-secondary)] text-sm mt-1">ตั้งเป้าหมายและติดตามความคืบหน้าของคุณ</p>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
            <PlusCircle size={18} /> สร้างเป้าหมาย
          </Button>
        )}
      </header>

      {isAdding && (
        <Card className="p-6 mb-6 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)] animate-fade-in-up">
          <h3 className="text-lg font-bold text-[color:var(--text-primary)] mb-4">เป้าหมายใหม่</h3>
          <form onSubmit={handleAddGoal} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1.5">ชื่อเป้าหมาย</label>
              <input 
                type="text" 
                value={newGoal.name}
                onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                placeholder="เช่น ดาวน์รถ, ท่องเที่ยว"
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-3 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-[color:var(--text-secondary)] mb-1.5">จำนวนเงินเป้าหมาย</label>
              <input 
                type="number" 
                value={newGoal.targetAmount}
                onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})}
                placeholder={`เช่น 100000`}
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-3 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                required
                min="1"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>ยกเลิก</Button>
              <Button type="submit">บันทึกเป้าหมาย</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map(goal => {
          const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isComplete = percentage >= 100;

          return (
            <Card key={goal.id} className={`p-6 relative overflow-hidden transition-transform duration-300 hover:scale-[1.02] ${isComplete ? 'border-emerald-500/50 bg-emerald-500/5' : ''}`}>
              {isComplete && (
                <div className="absolute top-4 right-4 text-emerald-400">
                  <Trophy size={32} className="animate-pulse" />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[color:var(--text-primary)]">{goal.name}</h3>
                  <p className="text-[color:var(--text-secondary)] text-sm mt-1">
                    เป้าหมาย: {formatMoney(goal.targetAmount, currency)}
                  </p>
                </div>
                <button 
                  onClick={() => deleteGoal(goal.id)}
                  className="p-2 rounded-xl text-[color:var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors z-10"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mb-6 relative">
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-[color:var(--text-primary)] font-bold">{formatMoney(goal.currentAmount, currency)}</span>
                  <span className="text-blue-400">{percentage.toFixed(1)}%</span>
                </div>
                <div className="h-4 w-full bg-[color:var(--bg-secondary)] rounded-full overflow-hidden border border-[color:var(--border-color)]">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                      isComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  >
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-20"></div>
                  </div>
                </div>
              </div>

              {!isComplete && (
                addFundsId === goal.id ? (
                  <form onSubmit={(e) => handleAddFunds(e, goal)} className="flex gap-2">
                    <input 
                      type="number" 
                      value={fundsAmount}
                      onChange={e => setFundsAmount(e.target.value)}
                      placeholder="ระบุจำนวนเงิน..."
                      className="flex-1 bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                      required
                      min="1"
                    />
                    <Button type="submit" size="sm">เพิ่ม</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setAddFundsId(null)}>ยกเลิก</Button>
                  </form>
                ) : (
                  <Button variant="secondary" className="w-full" onClick={() => setAddFundsId(goal.id)}>
                    + เพิ่มเงินออม
                  </Button>
                )
              )}
            </Card>
          );
        })}

        {goals.length === 0 && !isAdding && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-[color:var(--bg-secondary)] rounded-full flex items-center justify-center text-[color:var(--text-muted)] mb-4">
              <Target size={32} />
            </div>
            <h3 className="text-lg font-bold text-[color:var(--text-primary)] mb-2">ยังไม่มีเป้าหมายการออม</h3>
            <p className="text-[color:var(--text-secondary)] max-w-sm mb-6">สร้างเป้าหมายการออมเพื่อสร้างแรงบันดาลใจในการเก็บเงิน</p>
            <Button onClick={() => setIsAdding(true)}>สร้างเป้าหมายแรก</Button>
          </div>
        )}
      </div>
    </div>
  );
};
