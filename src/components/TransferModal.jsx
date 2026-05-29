import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Button } from './ui/Button';

export const TransferModal = ({ onClose }) => {
  const { transferWallet, wallets } = useFinance();
  const [formData, setFormData] = useState({
    fromWalletId: '',
    toWalletId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: 'โอนเงิน'
  });

  useEffect(() => {
    if (wallets.length >= 2) {
      setFormData(prev => ({ 
        ...prev, 
        fromWalletId: wallets[0].id,
        toWalletId: wallets[1].id
      }));
    }
  }, [wallets]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fromWalletId || !formData.toWalletId || !formData.amount) return;
    if (formData.fromWalletId === formData.toWalletId) {
      alert('กระเป๋าเงินต้นทางและปลายทางต้องไม่เหมือนกัน');
      return;
    }

    transferWallet({
      fromWalletId: formData.fromWalletId,
      toWalletId: formData.toWalletId,
      amount: Number(formData.amount),
      date: formData.date,
      note: formData.note
    });
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
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ArrowRightLeft size={20} />
          </div>
          <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
            โอนเงินระหว่างกระเป๋า
          </h2>
        </div>

        {wallets.length < 2 ? (
          <div className="py-6 text-center text-[color:var(--text-muted)]">
            คุณต้องมีกระเป๋าเงินอย่างน้อย 2 กระเป๋าเพื่อใช้งานฟังก์ชันนี้<br/>
            (เพิ่มกระเป๋าเงินได้ที่หน้าตั้งค่า)
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[color:var(--text-secondary)]">จากกระเป๋าเงิน (ต้นทาง)</label>
                <select
                  required
                  className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  value={formData.fromWalletId}
                  onChange={e => setFormData(prev => ({ ...prev, fromWalletId: e.target.value }))}
                >
                  <option value="" disabled>เลือกกระเป๋าเงิน</option>
                  {wallets.map(w => (
                    <option key={`from-${w.id}`} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[color:var(--text-secondary)]">ไปกระเป๋าเงิน (ปลายทาง)</label>
                <select
                  required
                  className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  value={formData.toWalletId}
                  onChange={e => setFormData(prev => ({ ...prev, toWalletId: e.target.value }))}
                >
                  <option value="" disabled>เลือกกระเป๋าเงิน</option>
                  {wallets.map(w => (
                    <option key={`to-${w.id}`} value={w.id} disabled={w.id === formData.fromWalletId}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[color:var(--text-secondary)]">จำนวนเงินโอน</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                placeholder={`เช่น 1000`}
                className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors text-lg font-bold"
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[color:var(--text-secondary)]">วันที่</label>
                <input
                  type="date"
                  required
                  className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[color:var(--text-secondary)]">บันทึกช่วยจำ</label>
                <input
                  type="text"
                  placeholder="เช่น โอนเงินออม"
                  className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-4 py-2.5 text-[color:var(--text-primary)] focus:outline-none focus:border-indigo-500 transition-colors"
                  value={formData.note}
                  onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))}
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button type="button" variant="ghost" className="flex-1 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 border-none shadow-lg shadow-indigo-500/25">
                ยืนยันการโอน
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
