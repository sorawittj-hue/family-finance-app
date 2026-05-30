import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatMoney, getCategory } from '../utils/constants';
import { Edit2, Filter, PlusCircle, Search, Trash2, Download } from 'lucide-react';
import { TransactionModal } from '../components/TransactionModal';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { getMonthKey } from '../utils/financeAnalytics';
import { toast } from '../components/ui/Toast';

export const Transactions = () => {
  const { transactions, wallets, deleteTransaction, addTransaction, currency } = useFinance();
  const [isAdding, setIsAdding] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterWallet, setFilterWallet] = useState('all');
  const [filterMonth, setFilterMonth] = useState(() => getMonthKey());
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingId, setDeletingId] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const filteredTxs = useMemo(() => {
    let result = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }

    if (filterWallet !== 'all') {
      result = result.filter(t => t.walletId === filterWallet);
    }

    if (filterMonth) {
      result = result.filter(t => t.date?.startsWith(filterMonth));
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
  }, [transactions, filterType, filterWallet, filterMonth, searchTerm]);

  const filteredTotals = useMemo(() => {
    return filteredTxs.reduce((acc, tx) => {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'income') acc.income += amount;
      if (tx.type === 'expense') acc.expense += amount;
      if (tx.type === 'saving') acc.saving += amount;
      return acc;
    }, { income: 0, expense: 0, saving: 0 });
  }, [filteredTxs]);

  const requestDelete = (transaction) => {
    setDeleteError('');
    setPendingDelete(transaction);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    const success = await deleteTransaction(pendingDelete.id);
    setDeletingId('');

    if (success) {
      const deletedTx = { ...pendingDelete };
      setPendingDelete(null);
      toast.show({
        message: 'ลบรายการแล้ว',
        type: 'info',
        duration: 5000,
        onUndo: () => {
          addTransaction({
            type: deletedTx.type,
            category: deletedTx.category,
            amount: deletedTx.amount,
            date: deletedTx.date,
            note: deletedTx.note,
            walletId: deletedTx.walletId,
          });
          toast.show({ message: 'กู้คืนรายการแล้ว', type: 'success', duration: 2000 });
        },
      });
      return;
    }

    setDeleteError('ลบรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  };

  const handleExportFiltered = () => {
    const toCsvCell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['วันที่', 'ประเภท', 'หมวดหมู่', 'จำนวน', 'กระเป๋าเงิน', 'บันทึก'],
      ...filteredTxs.map(tx => {
        const cat = getCategory(tx.type, tx.category);
        const wallet = wallets.find(w => w.id === tx.walletId);
        return [tx.date, tx.type === 'income' ? 'รายรับ' : tx.type === 'expense' ? 'รายจ่าย' : 'เงินออม', cat.label, tx.amount, wallet?.name || 'เงินสด', tx.note || ''];
      }),
    ];
    const csv = rows.map(r => r.map(toCsvCell).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transactions_${filterMonth || 'all'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--text-primary)]">รายการเคลื่อนไหว</h1>
          <p className="text-[color:var(--text-secondary)] text-sm mt-1">ประวัติการรับ-จ่ายทั้งหมดของคุณ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExportFiltered} className="flex items-center gap-2">
            <Download size={16} /> Export
          </Button>
          <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 shadow-blue-500/20">
            <PlusCircle size={18} /> เพิ่มรายการใหม่
          </Button>
        </div>
      </header>

      <Card className="p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
            <p className="text-xs text-[color:var(--text-secondary)]">รายรับจากผลค้นหา</p>
            <p className="text-xl font-black text-emerald-400 mt-1">+{formatMoney(filteredTotals.income, currency)}</p>
          </div>
          <div className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
            <p className="text-xs text-[color:var(--text-secondary)]">รายจ่ายจากผลค้นหา</p>
            <p className="text-xl font-black text-rose-400 mt-1">-{formatMoney(filteredTotals.expense, currency)}</p>
          </div>
          <div className="rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] p-4">
            <p className="text-xs text-[color:var(--text-secondary)]">เงินออมจากผลค้นหา</p>
            <p className="text-xl font-black text-blue-400 mt-1">{formatMoney(filteredTotals.saving, currency)}</p>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4 mb-6">
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
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex items-center gap-2 bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-secondary)]">
              <Filter size={16} />
              <input
                type="month"
                value={filterMonth}
                onChange={e => setFilterMonth(e.target.value)}
                className="bg-transparent text-[color:var(--text-primary)] outline-none"
              />
            </label>
            <select
              value={filterWallet}
              onChange={e => setFilterWallet(e.target.value)}
              className="bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded-xl px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
            >
              <option value="all">ทุกกระเป๋า</option>
              {wallets.map(wallet => (
                <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
            {['all', 'income', 'expense', 'saving'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filterType === type 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] border border-[color:var(--border-color)] hover:text-[color:var(--text-primary)]'
                }`}
              >
                {type === 'all' ? 'ทั้งหมด' : type === 'income' ? 'รายรับ' : type === 'expense' ? 'รายจ่าย' : 'เงินออม'}
              </button>
            ))}
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
                  const walletObj = wallets.find(w => w.id === tx.walletId) || { name: 'เงินสด', color: '#94a3b8' };
                  
                  return (
                    <tr key={tx.id} className="border-b border-[color:var(--border-color)] last:border-0 hover:bg-[color:var(--bg-secondary)] transition-colors group">
                      <td className="py-4 px-4">
                        <div className="text-sm text-[color:var(--text-primary)]">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: th })}</div>
                        <div className="text-[10px] text-[color:var(--text-muted)] mt-0.5">{tx.timestamp ? format(new Date(tx.timestamp), 'HH:mm') : ''}</div>
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
                        <div className={`text-sm font-black tracking-tight ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'saving' ? 'text-blue-400' : 'text-rose-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount, currency)}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!tx.isTransfer && (
                            <button
                              onClick={() => setEditingTransaction(tx)}
                              className="p-2 rounded-xl text-[color:var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="แก้ไขรายการ"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => requestDelete(tx)}
                            className="p-2 rounded-xl text-[color:var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="ลบรายการ"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
      {editingTransaction && (
        <TransactionModal
          transactionToEdit={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
      {pendingDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[color:var(--bg-secondary)]/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-card)] p-5 shadow-2xl">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)]">ลบรายการนี้?</h2>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              {getCategory(pendingDelete.type, pendingDelete.category).label} จำนวน {formatMoney(pendingDelete.amount, currency)}
            </p>
            {deleteError && (
              <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
                {deleteError}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setPendingDelete(null)}
                disabled={Boolean(deletingId)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1"
                onClick={confirmDelete}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? 'กำลังลบ...' : 'ลบ'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
