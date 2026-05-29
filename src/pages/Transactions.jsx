import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney, getCategory, CURRENCY_MAP } from '../utils/constants';
import { PlusCircle, Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import { TransactionModal } from '../components/TransactionModal';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export const Transactions = () => {
  const { transactions, wallets, deleteTransaction, currency } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTxs = useMemo(() => {
    let result = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.note && t.note.toLowerCase().includes(lower)) ||
        getCategory(t.type, t.category).label.toLowerCase().includes(lower) ||
        t.amount.toString().includes(lower)
      );
    }
    
    return result;
  }, [transactions, filterType, searchTerm]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--text-primary)]">รายการเคลื่อนไหว</h1>
          <p className="text-[color:var(--text-secondary)] text-sm mt-1">ประวัติการรับ-จ่ายทั้งหมดของคุณ</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 shadow-blue-500/20">
          <PlusCircle size={18} /> เพิ่มรายการใหม่
        </Button>
      </header>

      <Card className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-[color:var(--text-muted)]" />
            </div>
            <input 
              type="text" 
              placeholder="ค้นหารายการ, หมวดหมู่, หรือจำนวนเงิน..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'income', 'expense'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterType === type 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] border border-[color:var(--border-color)] hover:text-[color:var(--text-primary)]'
                }`}
              >
                {type === 'all' ? 'ทั้งหมด' : type === 'income' ? 'รายรับ' : 'รายจ่าย'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[color:var(--border-color)] text-[color:var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="pb-3 px-4 font-semibold">วันเวลา</th>
                <th className="pb-3 px-4 font-semibold">หมวดหมู่</th>
                <th className="pb-3 px-4 font-semibold">กระเป๋าเงิน</th>
                <th className="pb-3 px-4 font-semibold text-right">จำนวน</th>
                <th className="pb-3 px-4 font-semibold text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.length > 0 ? (
                filteredTxs.map(tx => {
                  const catObj = getCategory(tx.type, tx.category);
                  const CatIcon = catObj.icon;
                  const walletObj = wallets.find(w => w.id === tx.walletId) || { name: 'Cash', color: '#94a3b8' };
                  
                  return (
                    <tr key={tx.id} className="border-b border-[color:var(--border-color)] last:border-0 hover:bg-[color:var(--bg-secondary)] transition-colors group">
                      <td className="py-4 px-4">
                        <div className="text-sm text-[color:var(--text-primary)]">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: th })}</div>
                        <div className="text-[10px] text-[color:var(--text-muted)] mt-0.5">{format(parseISO(tx.date), 'HH:mm')}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                            style={{ backgroundColor: `${catObj.color}15`, color: catObj.color }}
                          >
                            <CatIcon size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[color:var(--text-primary)]">{catObj.label}</div>
                            {tx.note && <div className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 truncate max-w-[150px]">{tx.note}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span 
                          className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border"
                          style={{ borderColor: `${walletObj.color}30`, backgroundColor: `${walletObj.color}10`, color: walletObj.color }}
                        >
                          {walletObj.name}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className={`text-sm font-black tracking-tight ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount, currency)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => deleteTransaction(tx.id)}
                          className="p-2 rounded-xl text-[color:var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="ลบรายการ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-[color:var(--text-muted)] text-sm">
                    ไม่มีรายการเคลื่อนไหวที่ตรงกับการค้นหา
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isAdding && <TransactionModal onClose={() => setIsAdding(false)} />}
    </div>
  );
};
