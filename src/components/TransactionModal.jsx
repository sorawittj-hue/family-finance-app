import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { CATEGORIES } from '../utils/constants';
import { Button } from './ui/Button';

export const TransactionModal = ({ onClose, transactionToEdit = null }) => {
  const { addTransaction, updateTransaction, wallets } = useFinance();
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: 'food',
    date: new Date().toISOString().split('T')[0],
    note: '',
    walletId: ''
  });

  useEffect(() => {
    if (transactionToEdit) {
      setFormData({
        ...transactionToEdit,
        amount: transactionToEdit.amount.toString()
      });
    } else if (wallets.length > 0) {
      setFormData(prev => ({ ...prev, walletId: wallets[0].id }));
    }
  }, [transactionToEdit, wallets]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.walletId) return;

    const txData = {
      ...formData,
      amount: Number(formData.amount)
    };

    if (transactionToEdit) {
      updateTransaction(transactionToEdit.id, txData);
    } else {
      addTransaction(txData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[color:var(--bg-secondary)]/80 backdrop-blur-sm">
      <div className="bg-[color:var(--bg-card)] border border-[color:var(--border-color)] w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-fade-in-up">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-card-hover)] p-1.5 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-6">
          {transactionToEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-[color:var(--bg-secondary)] p-1 rounded-xl border border-[color:var(--border-color)]">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.type === 'expense' ? 'bg-rose-500 text-white shadow-md' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'}`}
              onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category: 'food' }))}
            >
              รายจ่าย
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'}`}
              onClick={() => setFormData(prev => ({ ...prev, type: 'income', category: 'salary' }))}
            >
              รายรับ
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${formData.type === 'saving' ? 'bg-blue-500 text-white shadow-md' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'}`}
              onClick={() => setFormData(prev => ({ ...prev, type: 'saving', category: 'investment' }))}
            >
              เงินออม
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[color:var(--text-secondary)]">หมวดหมู่</label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES[formData.type].map(cat => {
                const Icon = cat.icon;
                const isSelected = formData.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-[color:var(--bg-primary)] border-blue-500 text-blue-400 shadow-sm' 
                        : 'bg-[color:var(--bg-secondary)] border-[color:var(--border-color)] text-[color:var(--text-muted)] hover:border-[color:var(--border-hover)] hover:text-[color:var(--text-primary)]'
                    }`}
                  >
                    <Icon size={18} className="mb-1" />
                    <span className="text-[10px] text-center leading-tight font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[color:var(--text-secondary)]">จำนวนเงิน</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                placeholder={`เช่น 150`}
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[color:var(--text-secondary)]">กระเป๋าเงิน / บัญชี</label>
              <select
                required
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
                value={formData.walletId}
                onChange={e => setFormData(prev => ({ ...prev, walletId: e.target.value }))}
              >
                <option value="" disabled>เลือกกระเป๋าเงิน</option>
                {wallets.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[color:var(--text-secondary)]">วันที่</label>
            <input
              type="date"
              required
              className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
              value={formData.date}
              onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[color:var(--text-secondary)]">หมายเหตุ (ไม่บังคับ)</label>
            <input
              type="text"
              placeholder="บันทึกช่วยจำ..."
              className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
              value={formData.note}
              onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <Button type="button" variant="ghost" className="flex-1 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 border-none shadow-lg shadow-blue-500/25">
              บันทึกรายการ
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
