import React, { useRef, useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CloudSyncPanel } from '../components/CloudSyncPanel';
import { getCategory, CURRENCY_MAP, CATEGORIES, formatMoney } from '../utils/constants';
import { 
  Download, Upload, ShieldAlert, CheckCircle2, Moon, Sun, 
  Smartphone, Eye, Sparkles, Printer, FileSpreadsheet, 
  Trash2, Plus, Edit2, Database, AlertTriangle, X,
  Clock, Landmark, CreditCard
} from 'lucide-react';

export const Settings = () => {
  const { 
    exportData, 
    importData, 
    theme, 
    setTheme, 
    loadDemoData, 
    resetAllData, 
    transactions, 
    budgets,
    goals,
    wallets,
    addWallet,
    updateWallet,
    deleteWallet,
    currency,
    setCurrency,
    recurringTxs,
    addRecurringTx,
    deleteRecurringTx,
    triggerRecurringTx
  } = useFinance();
  
  const fileInputRef = useRef(null);
  
  const [importStatus, setImportStatus] = useState(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState(null);
  
  const [editingWalletId, setEditingWalletId] = useState(null);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [walletForm, setWalletForm] = useState({ name: '', color: '#3b82f6', type: 'bank' });

  const [isAddingBill, setIsAddingBill] = useState(false);
  const [billForm, setBillForm] = useState({ name: '', type: 'expense', category: 'food', amount: '', walletId: wallets[0]?.id || '', interval: 'monthly', dueDay: '1' });

  const THEMES = [
    { id: 'dark', name: 'มืด (Dark)', icon: Moon, desc: 'สบายตา ถนอมสายตา' },
    { id: 'light', name: 'สว่าง (Light)', icon: Sun, desc: 'ชัดเจน อ่านง่าย' },
    { id: 'oled', name: 'ดำสนิท (OLED)', icon: Smartphone, desc: 'ประหยัดแบตเตอรี่หน้าจอ OLED' },
    { id: 'nordic', name: 'นอร์ดิก (Nordic)', icon: Sparkles, desc: 'โทนสีพาสเทล ละมุนตา' }
  ];

  const WALLET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  const storageStats = useMemo(() => {
    const data = JSON.stringify({ transactions, wallets, goals, budgets, recurringTxs });
    const bytes = new Blob([data]).size;
    return {
      size: (bytes / 1024).toFixed(2),
      txCount: transactions.length,
      limit: (bytes / (5 * 1024 * 1024) * 100).toFixed(2)
    };
  }, [transactions, wallets, goals, budgets, recurringTxs]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const success = importData(event.target.result);
      if (success) {
        setImportStatus('success');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('error');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleLoadDemo = () => {
    loadDemoData();
    setDemoLoaded(true);
    setTimeout(() => setDemoLoaded(false), 3000);
  };

  const handleReset = () => {
    resetAllData();
    setShowResetModal(false);
  };

  const exportCSV = () => {
    const headers = ['วันที่', 'เวลา', 'ประเภท', 'หมวดหมู่', 'กระเป๋าเงิน', 'จำนวนเงิน', 'หมายเหตุ'];
    const rows = transactions.map(tx => {
      const typeLabel = tx.type === 'income' ? 'รายรับ' : tx.type === 'expense' ? 'รายจ่าย' : 'เงินออม';
      const catLabel = getCategory(tx.type, tx.category).label;
      const walletName = wallets.find(w => w.id === tx.walletId)?.name || 'เงินสด';
      const dateObj = new Date(tx.date);
      const dateStr = dateObj.toLocaleDateString('th-TH');
      const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      return `"${dateStr}","${timeStr}","${typeLabel}","${catLabel}","${walletName}","${tx.amount}","${tx.note || ''}"`;
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleWalletSubmit = (e) => {
    e.preventDefault();
    if (!walletForm.name.trim()) return;

    if (editingWalletId) {
      updateWallet(editingWalletId, walletForm);
      setEditingWalletId(null);
    } else {
      addWallet(walletForm);
      setIsAddingWallet(false);
    }
    setWalletForm({ name: '', color: '#3b82f6', type: 'bank' });
  };

  const handleDeleteWalletClick = (wallet) => {
    if (wallets.length <= 1) return;
    const linkedCount = transactions.filter(t => t.walletId === wallet.id).length;
    if (linkedCount > 0) {
      setWalletToDelete({ wallet, count: linkedCount });
    } else {
      deleteWallet(wallet.id);
    }
  };

  const confirmDeleteWallet = () => {
    if (walletToDelete) {
      deleteWallet(walletToDelete.wallet.id);
      setWalletToDelete(null);
    }
  };

  const handleBillSubmit = (e) => {
    e.preventDefault();
    if (!billForm.name || !billForm.amount) return;
    const amt = Number(billForm.amount);
    
    addRecurringTx({
      name: billForm.name,
      type: billForm.type,
      category: billForm.category,
      amount: amt,
      walletId: billForm.walletId,
      interval: billForm.interval,
      dueDay: Number(billForm.dueDay) || 1
    });

    setBillForm({ name: '', type: 'expense', category: 'food', amount: '', walletId: wallets[0]?.id || '', interval: 'monthly', dueDay: '1' });
    setIsAddingBill(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[color:var(--text-primary)]">ตั้งค่าระบบ</h1>
          <p className="text-[color:var(--text-secondary)] text-sm mt-1">จัดการบัญชี สกุลเงิน ธีม และข้อมูลของคุณ</p>
        </div>
      </header>

      <CloudSyncPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Currency Card */}
        <Card className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Landmark size={20} />
            </div>
            <h3 className="text-lg font-bold text-[color:var(--text-primary)]">สกุลเงินหลัก (Currency)</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {Object.keys(CURRENCY_MAP).map(code => {
              const isActive = currency === code;
              return (
                <button
                  key={code}
                  onClick={() => setCurrency(code)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                    isActive 
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 border-blue-400/20' 
                      : 'bg-[color:var(--bg-secondary)] border-[color:var(--border-color)] hover:bg-[color:var(--bg-card-hover)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                  }`}
                >
                  <span className={`text-xl font-bold ${isActive ? 'text-white' : 'text-[color:var(--text-primary)]'}`}>{CURRENCY_MAP[code].symbol}</span>
                  <span className="text-[10px] mt-1 opacity-80">{code}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[color:var(--text-muted)] mt-4">มีผลกับการแสดงผลตัวเลขและกราฟทั้งหมดในแอป</p>
        </Card>

        {/* Theme Card */}
        <Card className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Eye size={20} />
            </div>
            <h3 className="text-lg font-bold text-[color:var(--text-primary)]">ธีมและหน้าตา (Theme)</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map(t => {
              const isActive = theme === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                    isActive 
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25 border-violet-400/20' 
                      : 'bg-[color:var(--bg-secondary)] border-[color:var(--border-color)] hover:bg-[color:var(--bg-card-hover)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                  }`}
                >
                  <Icon size={24} className={`mb-2 ${isActive ? 'text-white' : 'text-[color:var(--text-muted)]'}`} />
                  <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-[color:var(--text-primary)]'}`}>{t.name}</span>
                  <span className={`text-[10px] mt-1 text-center ${isActive ? 'text-violet-100' : 'text-[color:var(--text-muted)]'}`}>{t.desc}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Wallet Management Card */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Landmark size={20} />
              </div>
              <h3 className="text-lg font-bold text-[color:var(--text-primary)]">จัดการบัญชี / กระเป๋าเงิน</h3>
            </div>
            {!isAddingWallet && !editingWalletId && (
              <Button size="sm" onClick={() => setIsAddingWallet(true)} className="flex items-center gap-1">
                <Plus size={14} /> เพิ่มกระเป๋า
              </Button>
            )}
          </div>

          {(isAddingWallet || editingWalletId) && (
            <form onSubmit={handleWalletSubmit} className="mb-6 bg-[color:var(--bg-secondary)] p-4 rounded-xl border border-[color:var(--border-color)]">
              <h4 className="text-sm font-bold text-[color:var(--text-primary)] mb-4">{editingWalletId ? 'แก้ไขกระเป๋าเงิน' : 'เพิ่มกระเป๋าเงินใหม่'}</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-[color:var(--text-muted)] mb-1.5">ชื่อกระเป๋าเงิน</label>
                  <input 
                    type="text" 
                    value={walletForm.name}
                    onChange={e => setWalletForm({ ...walletForm, name: e.target.value })}
                    placeholder="เช่น เงินสด, KBank, SCB"
                    className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[color:var(--text-muted)] mb-2">เลือกสีประจำกระเป๋า</label>
                  <div className="flex gap-2 flex-wrap">
                    {WALLET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setWalletForm({ ...walletForm, color: c })}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${walletForm.color === c ? 'scale-125 ring-2 ring-offset-2 ring-[color:var(--bg-primary)] ring-offset-[color:var(--border-color)]' : 'hover:scale-110'}`}
                        style={{ backgroundColor: c, ringColor: c }}
                      >
                        {walletForm.color === c && <CheckCircle2 size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[color:var(--border-color)]">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setIsAddingWallet(false); setEditingWalletId(null); }}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 border-none">
                    บันทึก
                  </Button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {wallets.map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] group hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-8 rounded-full" style={{ backgroundColor: w.color }} />
                  <div>
                    <h4 className="font-bold text-[color:var(--text-primary)] text-sm">{w.name}</h4>
                    <p className="text-[10px] text-[color:var(--text-secondary)]">ID: {w.id.substring(0,8)}...</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingWalletId(w.id); setWalletForm({ name: w.name, color: w.color, type: w.type || 'bank' }); }}
                    className="p-1.5 rounded-lg text-[color:var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteWalletClick(w)}
                    disabled={wallets.length <= 1}
                    className="p-1.5 rounded-lg text-[color:var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    title={wallets.length <= 1 ? "ไม่สามารถลบกระเป๋าสุดท้ายได้" : "ลบกระเป๋า"}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recurring Bills Card */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <h3 className="text-lg font-bold text-[color:var(--text-primary)]">บิลและรายจ่ายประจำ</h3>
            </div>
            {!isAddingBill && (
              <Button size="sm" onClick={() => setIsAddingBill(true)} className="flex items-center gap-1">
                <Plus size={14} /> เพิ่มบิลประจำ
              </Button>
            )}
          </div>

          {isAddingBill && (
            <form onSubmit={handleBillSubmit} className="mb-6 bg-[color:var(--bg-secondary)] p-4 rounded-xl border border-[color:var(--border-color)]">
              <h4 className="text-sm font-bold text-[color:var(--text-primary)] mb-4">ตั้งค่าบิลประจำใหม่</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-[color:var(--text-muted)] mb-1.5">ชื่อรายการบิล (เช่น Netflix, ค่าอินเทอร์เน็ต)</label>
                  <input 
                    type="text" 
                    value={billForm.name}
                    onChange={e => setBillForm({ ...billForm, name: e.target.value })}
                    className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[color:var(--text-muted)] mb-1.5">ประเภทการเงิน</label>
                    <select 
                      value={billForm.type}
                      onChange={e => setBillForm({ ...billForm, type: e.target.value })}
                      className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-cyan-500"
                    >
                      <option value="expense">รายจ่ายประจำ</option>
                      <option value="income">รายรับประจำ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[color:var(--text-muted)] mb-1.5">หมวดหมู่</label>
                    <select 
                      value={billForm.category}
                      onChange={e => setBillForm({ ...billForm, category: e.target.value })}
                      className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-cyan-500"
                    >
                      {(CATEGORIES[billForm.type] || []).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[color:var(--text-muted)] mb-1.5">กระเป๋าเงินที่ใช้ตัดยอด</label>
                    <select 
                      value={billForm.walletId}
                      onChange={e => setBillForm({ ...billForm, walletId: e.target.value })}
                      className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-cyan-500"
                      required
                    >
                      <option value="">-- เลือกกระเป๋าเงิน --</option>
                      {wallets.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[color:var(--text-muted)] mb-1.5">จำนวนเงิน (บาท)</label>
                    <input 
                      type="number" 
                      value={billForm.amount}
                      onChange={e => setBillForm({ ...billForm, amount: e.target.value })}
                      placeholder="เช่น 419"
                      className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-cyan-500"
                      required min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-[color:var(--text-muted)] mb-1.5">วันครบกำหนดทุกเดือน</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={billForm.dueDay}
                    onChange={e => setBillForm({ ...billForm, dueDay: e.target.value })}
                    className="w-full bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[color:var(--border-color)]">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingBill(false)}>ยกเลิก</Button>
                  <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-500 border-none">บันทึกบิลประจำ</Button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {recurringTxs && recurringTxs.length > 0 ? (
              recurringTxs.map(bill => {
                const catObj = getCategory(bill.type, bill.category);
                const CatIcon = catObj.icon;
                const targetWallet = wallets.find(w => w.id === bill.walletId);
                const today = new Date().toISOString().split('T')[0];
                const isTriggeredToday = bill.lastTriggered === today;

                return (
                  <div 
                    key={bill.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] group hover:border-[color:var(--border-hover)] transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${catObj.color}15`, color: catObj.color }}
                      >
                        <CatIcon size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[color:var(--text-primary)] text-sm">{bill.name}</h4>
                        <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5 font-medium">
                          {bill.type === 'income' ? 'รายรับประจำ' : 'รายจ่ายประจำ'} • ทุกวันที่ {bill.dueDay || 1} • บัญชี: <span className="font-semibold" style={{ color: targetWallet?.color || 'var(--text-secondary)' }}>{targetWallet?.name || 'เงินสด'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <span className={`text-sm font-black ${bill.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {bill.type === 'income' ? '+' : '-'}{formatMoney(bill.amount, currency)}
                      </span>
                      <div className="flex gap-2 ml-2 border-l border-[color:var(--border-color)] pl-3">
                        <Button 
                          size="sm" 
                          variant={isTriggeredToday ? "secondary" : "primary"}
                          disabled={isTriggeredToday}
                          onClick={() => {
                            triggerRecurringTx(bill.id, bill.walletId);
                            alert(`ระบบได้บันทึกธุรกรรม "${bill.name}" เรียบร้อยแล้ว!`);
                          }}
                          className={`text-[10px] px-2 py-1 h-auto ${isTriggeredToday ? "opacity-50" : ""}`}
                        >
                          {isTriggeredToday ? <CheckCircle2 size={12} /> : <CreditCard size={12} />} 
                          {isTriggeredToday ? 'ชำระแล้ว' : 'กดชำระด่วน'}
                        </Button>
                        <button 
                          onClick={() => deleteRecurringTx(bill.id)}
                          className="p-1.5 rounded-lg text-[color:var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              !isAddingBill && (
                <div className="py-6 text-center text-[color:var(--text-muted)] text-xs">
                  ยังไม่มีการตั้งค่าบิลหรือรายจ่ายประจำ
                </div>
              )
            )}
          </div>
        </Card>

      </div>

      {/* Storage Stats */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Database size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">พื้นที่จัดเก็บข้อมูล (Local Storage)</h3>
            <p className="text-xs text-[color:var(--text-secondary)] mt-1">ข้อมูลทั้งหมดถูกเก็บไว้ในเครื่องของคุณ 100% ปลอดภัยและเป็นส่วนตัว</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-6">
          <div className="flex-1 bg-[color:var(--bg-secondary)] rounded-full h-3 border border-[color:var(--border-color)] overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${storageStats.limit}%` }}></div>
          </div>
          <span className="text-xs text-[color:var(--text-secondary)] font-mono">{storageStats.size} KB</span>
        </div>
      </Card>

      {/* Data Backup / Export Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[color:var(--border-color)] no-print">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Download size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">สำรองข้อมูลและการนำเข้า (Backup & Restore)</h3>
            <p className="text-xs text-[color:var(--text-secondary)] mt-1">สำรองข้อมูลของคุณเพื่อป้องกันการสูญหาย หรือย้ายไปใช้เครื่องอื่น</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
            <div className="bg-[color:var(--bg-secondary)] p-5 rounded-xl border border-[color:var(--border-color)]">
              <h4 className="font-bold text-[color:var(--text-primary)] mb-2 flex items-center gap-2 text-xs">
                <Download size={16} className="text-emerald-400" /> นำออกข้อมูล (JSON Export)
              </h4>
              <p className="text-[11px] text-[color:var(--text-secondary)] mb-4">ดาวน์โหลดข้อมูลทั้งหมดของคุณในรูปแบบไฟล์ JSON เพื่อเก็บสำรองไว้ในเครื่อง</p>
              <Button onClick={exportData} className="w-full bg-emerald-600 hover:bg-emerald-500 border-none text-xs text-white">
                ส่งออก Backup (.json)
              </Button>
            </div>
            
            <div className="bg-[color:var(--bg-secondary)] p-5 rounded-xl border border-[color:var(--border-color)]">
              <h4 className="font-bold text-[color:var(--text-primary)] mb-2 flex items-center gap-2 text-xs">
                <Upload size={16} className="text-blue-400" /> นำเข้าข้อมูล (JSON Import)
              </h4>
              <p className="text-[11px] text-[color:var(--text-secondary)] mb-4">อัปโหลดไฟล์ JSON ที่สำรองไว้ (ระบบจะนำข้อมูลเก่าทั้งหมดออกแล้วแทนที่ด้วยไฟล์นี้)</p>
              <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full text-xs">
                เลือกไฟล์ Backup (.json)
              </Button>
              {importStatus === 'success' && (
                <p className="text-emerald-400 text-xs mt-3 flex items-center gap-1 animate-pulse">
                  <CheckCircle2 size={14} /> นำเข้าข้อมูลสำเร็จเรียบร้อย!
                </p>
              )}
              {importStatus === 'error' && (
                <p className="text-rose-400 text-xs mt-3 flex items-center gap-1 animate-pulse">
                  <ShieldAlert size={14} /> เกิดข้อผิดพลาด ไฟล์ไม่ถูกต้อง
                </p>
              )}
            </div>
          </div>

          {/* Premium Excel & PDF Reports */}
          <div className="bg-[color:var(--bg-secondary)] p-5 rounded-xl border border-[color:var(--border-color)]">
            <h4 className="font-bold text-[color:var(--text-primary)] mb-2 flex items-center gap-2 text-xs">
              <Printer size={16} className="text-blue-400" /> ส่งออกรายงานสรุปสำหรับพิมพ์
            </h4>
            <p className="text-[11px] text-[color:var(--text-secondary)] mb-4">สร้างไฟล์สรุปประวัติรายรับรายจ่ายทั้งหมด หรือบันทึกหน้าเว็บนี้เป็น PDF</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={exportCSV} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white border-none flex items-center justify-center gap-2 no-print text-xs">
                <FileSpreadsheet size={14} /> นำออกไปใช้ใน Excel (.csv)
              </Button>
              <Button onClick={() => window.print()} variant="secondary" className="flex-1 flex items-center justify-center gap-2 text-xs">
                <Printer size={14} /> พิมพ์รายงาน / บันทึก PDF
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Admin / Demo Tools Card */}
      <Card className="p-6 border-rose-500/20 bg-rose-500/5 no-print">
        <h3 className="text-base font-bold text-[color:var(--text-primary)] mb-2 flex items-center gap-2">
          <ShieldAlert size={18} className="text-rose-400" /> เครื่องมือสำหรับนักพัฒนา
        </h3>
        <p className="text-xs text-[color:var(--text-secondary)] mb-6">โซนสำหรับทดสอบระบบ การกดปุ่มในส่วนนี้อาจทำให้ข้อมูลปัจจุบันของคุณสูญหายได้</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[color:var(--bg-secondary)] p-5 rounded-xl border border-[color:var(--border-color)] flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-[color:var(--text-primary)] text-xs mb-1">โหลดข้อมูลทดสอบ (Demo Data)</h4>
              <p className="text-[11px] text-[color:var(--text-secondary)] mb-4">ระบบจะลบข้อมูลปัจจุบันทิ้งทั้งหมด และแทนที่ด้วยข้อมูลตัวอย่าง เพื่อดูการทำงานของแอป</p>
            </div>
            <div>
              <Button onClick={handleLoadDemo} variant="secondary" className="w-full text-xs">
                โหลด Demo Data
              </Button>
              {demoLoaded && (
                <p className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
                  <CheckCircle2 size={14} /> โหลดข้อมูลตัวอย่างเสร็จสิ้น!
                </p>
              )}
            </div>
          </div>

          <div className="bg-rose-900/10 p-5 rounded-xl border border-rose-500/20 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-rose-400 text-xs mb-1">ล้างข้อมูลทั้งหมด (Factory Reset)</h4>
              <p className="text-[11px] text-[color:var(--text-secondary)] mb-4">ลบข้อมูลรายรับรายจ่าย บัญชี และเป้าหมายทิ้งทั้งหมด เพื่อเริ่มต้นใช้งานแอปใหม่ตั้งแต่ศูนย์</p>
            </div>
            <div>
              <Button onClick={() => setShowResetModal(true)} className="w-full border-none bg-rose-600 hover:bg-rose-500 text-white text-xs">
                <Trash2 size={14} /> เริ่มต้นใช้งานใหม่ทั้งหมด
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Double Confirmation Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6 space-y-4 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold text-[color:var(--text-primary)]">ยืนยันการล้างข้อมูล</h3>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] p-1 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[color:var(--text-primary)] leading-relaxed">
              คุณกำลังจะ <strong className="text-rose-400">ลบข้อมูลทั้งหมดในระบบ</strong> การกระทำนี้ไม่สามารถย้อนกลับได้ คุณต้องการดำเนินการต่อหรือไม่?
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setShowResetModal(false)}>ยกเลิก</Button>
              <Button className="flex-1 bg-rose-600 hover:bg-rose-500 text-white border-none" onClick={handleReset}>ล้างข้อมูลทั้งหมด</Button>
            </div>
          </div>
        </div>
      )}

      {/* Linked Transactions Delete Wallet Modal */}
      {walletToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6 space-y-4 animate-fade-in-up">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-bold text-[color:var(--text-primary)]">ยืนยันการลบกระเป๋า</h3>
              </div>
              <button onClick={() => setWalletToDelete(null)} className="text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] p-1 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[color:var(--text-primary)] leading-relaxed">
              กระเป๋า <strong>"{walletToDelete.wallet.name}"</strong> มีธุรกรรมผูกอยู่ <strong className="text-amber-400">{walletToDelete.count} รายการ</strong><br/><br/>
              หากทำการลบ ธุรกรรมเหล่านั้นจะถูกโอนไปผูกกับกระเป๋าอื่นโดยอัตโนมัติ คุณยืนยันที่จะลบหรือไม่?
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setWalletToDelete(null)}>ยกเลิก</Button>
              <Button className="flex-1 bg-rose-600 hover:bg-rose-500 text-white border-none" onClick={confirmDeleteWallet}>ยืนยันการลบ</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
