import React, { useState, useMemo, useEffect } from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  PlusCircle,
  Calendar,
  List,
  Utensils,
  Home,
  Car,
  Baby,
  Activity,
  CreditCard,
  ShoppingBag,
  Heart,
  MoreHorizontal,
  Briefcase,
  Gift,
  Landmark,
  LineChart,
  ShieldCheck,
  Trash2,
  RefreshCcw,
  AlertTriangle,
  Download,
  Cloud,
  Wifi,
  Users
} from 'lucide-react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db, APP_ID } from './firebase';

// --- Configuration & Categories ---
const CATEGORIES = {
  income: [
    { id: 'salary', label: 'เงินเดือน', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-500' },
    { id: 'business', label: 'ธุรกิจส่วนตัว', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500' },
    { id: 'bonus', label: 'โบนัส/เงินพิเศษ', icon: Gift, color: 'text-emerald-500', bg: 'bg-emerald-500' },
    { id: 'dividend', label: 'ดอกเบี้ย/ปันผล', icon: LineChart, color: 'text-emerald-500', bg: 'bg-emerald-500' },
    { id: 'other_in', label: 'รายได้อื่นๆ', icon: PlusCircle, color: 'text-emerald-500', bg: 'bg-emerald-500' }
  ],
  expense: [
    { id: 'food', label: 'อาหาร/เครื่องดื่ม', icon: Utensils, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'home', label: 'ที่อยู่อาศัย/น้ำไฟเน็ต', icon: Home, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'transport', label: 'เดินทาง/รถยนต์', icon: Car, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'family', label: 'ลูกและการศึกษา', icon: Baby, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'health', label: 'สุขภาพ/ของใช้', icon: Activity, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'debt', label: 'หนี้สิน/บัตรเครดิต', icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'shopping', label: 'บันเทิง/ช้อปปิ้ง', icon: ShoppingBag, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'parents', label: 'ให้พ่อแม่/ญาติ', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500' },
    { id: 'other_ex', label: 'จิปาถะอื่นๆ', icon: MoreHorizontal, color: 'text-rose-500', bg: 'bg-rose-500' }
  ],
  saving: [
    { id: 'emergency', label: 'เงินออมฉุกเฉิน', icon: PiggyBank, color: 'text-indigo-500', bg: 'bg-indigo-500' },
    { id: 'investment', label: 'กองทุน/หุ้น/คริปโต', icon: LineChart, color: 'text-indigo-500', bg: 'bg-indigo-500' },
    { id: 'insurance', label: 'ประกันสะสมทรัพย์', icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-500' },
    { id: 'kids_saving', label: 'เงินออมเพื่อลูก', icon: Baby, color: 'text-indigo-500', bg: 'bg-indigo-500' },
    { id: 'deposit', label: 'เงินฝากประจำ', icon: Landmark, color: 'text-indigo-500', bg: 'bg-indigo-500' }
  ]
};

const getCurrentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMoney = (amount) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0
  }).format(amount);
};

export default function App() {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthStr());
  const [deleteId, setDeleteId] = useState(null);

  // Form State
  const defaultFormState = {
    type: 'expense',
    amount: '',
    category: 'food',
    date: new Date().toISOString().split('T')[0],
    note: ''
  };
  const [formData, setFormData] = useState(defaultFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initialize Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth error:", error);
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch Data from Firestore (Real-time Sync via Public Channel)
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    // เส้นทาง Public เพื่อให้แชร์ข้อมูลตรงกันทุกอุปกรณ์ในครอบครัว
    const collectionRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'family_transactions');

    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
      const data = [];
      snapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });

      // เรียงลำดับด้วย JavaScript (ป้องกัน Error จาก index)
      data.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.timestamp || 0) - (a.timestamp || 0);
      });

      setTransactions(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Sync error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Derived State: Filtered by Month
  const monthlyData = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Derived State: Summaries
  const summary = useMemo(() => {
    const totalIncome = monthlyData.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = monthlyData.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const totalSaving = monthlyData.filter(t => t.type === 'saving').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense - totalSaving;

    return { totalIncome, totalExpense, totalSaving, balance };
  }, [monthlyData]);

  // Derived State: Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown = { expense: {}, saving: {} };

    monthlyData.forEach(t => {
      if (t.type === 'expense' || t.type === 'saving') {
        breakdown[t.type][t.category] = (breakdown[t.type][t.category] || 0) + t.amount;
      }
    });

    const formatBreakdown = (type) => {
      const total = summary[type === 'expense' ? 'totalExpense' : 'totalSaving'];
      if (total === 0) return [];

      return Object.entries(breakdown[type])
        .map(([catId, amount]) => {
          const catInfo = CATEGORIES[type].find(c => c.id === catId);
          return {
            id: catId,
            label: catInfo?.label || 'อื่นๆ',
            amount,
            percentage: ((amount / total) * 100).toFixed(1),
            bg: catInfo?.bg || 'bg-slate-500'
          };
        })
        .sort((a, b) => b.amount - a.amount);
    };

    return {
      expense: formatBreakdown('expense'),
      saving: formatBreakdown('saving')
    };
  }, [monthlyData, summary]);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'type') {
      setFormData(prev => ({ ...prev, [name]: value, category: CATEGORIES[value][0].id }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleClearForm = () => {
    setFormData({
      ...defaultFormState,
      date: new Date().toISOString().split('T')[0]
    });
  };

  // 3. Add Data to Firestore
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0 || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const collectionRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'family_transactions');
      await addDoc(collectionRef, {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        note: formData.note,
        addedBy: user.uid,
        timestamp: Date.now()
      });

      setFormData(prev => ({ ...prev, amount: '', note: '' }));
    } catch (error) {
      console.error("Error adding document: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDelete = (id) => setDeleteId(id);

  // 4. Delete Data from Firestore
  const confirmDelete = async () => {
    if (deleteId && user) {
      try {
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'family_transactions', deleteId);
        await deleteDoc(docRef);
        setDeleteId(null);
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  const cancelDelete = () => setDeleteId(null);

  // Render Helpers
  const getCategoryIcon = (type, categoryId) => {
    const cat = CATEGORIES[type]?.find(c => c.id === categoryId);
    if (!cat) return <MoreHorizontal className="w-5 h-5" />;
    const Icon = cat.icon;
    return <Icon className={`w-5 h-5 ${cat.color}`} />;
  };

  const getCategoryLabel = (type, categoryId) => {
    const cat = CATEGORIES[type]?.find(c => c.id === categoryId);
    return cat ? cat.label : 'อื่นๆ';
  };

  const exportToCSV = () => {
    if (monthlyData.length === 0) return;

    const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'จำนวนเงิน', 'บันทึก'];
    const csvRows = [headers.join(',')];

    monthlyData.forEach(t => {
      const typeLabel = t.type === 'income' ? 'รายรับ' : t.type === 'expense' ? 'รายจ่าย' : 'เงินออม';
      const catLabel = getCategoryLabel(t.type, t.category);
      csvRows.push(`${t.date},${typeLabel},${catLabel},${t.amount},"${t.note || ''}"`);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `family_finance_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          {/* Connection Status */}
          <div className="absolute top-0 right-0 p-3 flex gap-2">
            <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${user ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Wifi className="w-3 h-3" />
              {user ? 'ออนไลน์' : 'กำลังเชื่อมต่อ'}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
              <Users className="w-3 h-3" />
              Sync ครอบครัว
            </div>
          </div>

          <div className="mt-4 md:mt-0">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="text-blue-600" />
              บัญชีครอบครัว (Real-time)
            </h1>
            <p className="text-slate-500 text-sm mt-1">อัปเดตข้อมูลตรงกันทุกเครื่องในเสี้ยววินาที</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors text-sm font-medium border border-slate-200"
              title="ส่งออกข้อมูลเป็น Excel (CSV)"
            >
              <Download className="w-4 h-4" />
              ส่งออก Excel
            </button>
            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg">
              <Calendar className="text-slate-500 w-5 h-5" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-semibold text-slate-700 outline-none cursor-pointer"
              />
            </div>
          </div>
        </header>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">รายรับรวม</p>
              <p className="text-xl font-bold text-slate-800">{formatMoney(summary.totalIncome)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">รายจ่ายรวม</p>
              <p className="text-xl font-bold text-slate-800">{formatMoney(summary.totalExpense)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">เงินออม/ลงทุน</p>
              <p className="text-xl font-bold text-slate-800">{formatMoney(summary.totalSaving)}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${summary.balance >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">เงินคงเหลือเดือนนี้</p>
              <p className={`text-xl font-bold ${summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatMoney(summary.balance)}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Form & Visual Breakdown */}
          <div className="lg:col-span-1 space-y-6">

            {/* Add Transaction Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-600" />
                  เพิ่มรายการ
                </h2>
                <button
                  onClick={handleClearForm}
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  <RefreshCcw className="w-3 h-3" /> ล้างค่า
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income', category: CATEGORIES.income[0].id })}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${formData.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    รายรับ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense', category: CATEGORIES.expense[0].id })}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${formData.type === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    รายจ่าย
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'saving', category: CATEGORIES.saving[0].id })}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${formData.type === 'saving' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    เงินออม
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">วันที่</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">จำนวนเงิน (บาท)</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      min="1"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500 text-lg font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">หมวดหมู่</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
                    >
                      {CATEGORIES[formData.type].map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">บันทึกช่วยจำ (ถ้ามี)</label>
                    <input
                      type="text"
                      name="note"
                      value={formData.note}
                      onChange={handleInputChange}
                      placeholder="เช่น ค่ากับข้าว, โบนัสกลางปี"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !user}
                  className={`w-full font-medium py-3 rounded-lg transition-colors mt-4 flex items-center justify-center gap-2
                    ${(isSubmitting || !user) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {isSubmitting ? (
                    <><RefreshCcw className="w-5 h-5 animate-spin" /> กำลังบันทึก...</>
                  ) : (
                    'บันทึกข้อมูล'
                  )}
                </button>
              </form>
            </div>

            {/* Analysis: Expense Breakdown */}
            {categoryBreakdown.expense.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                  สัดส่วนรายจ่าย
                </h3>
                <div className="space-y-4">
                  {categoryBreakdown.expense.map(cat => (
                    <div key={cat.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 font-medium">{cat.label}</span>
                        <span className="text-slate-800 font-bold">{formatMoney(cat.amount)} ({cat.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`${cat.bg} h-2 rounded-full transition-all duration-500`} style={{ width: `${cat.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analysis: Saving Breakdown */}
            {categoryBreakdown.saving.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <PiggyBank className="w-5 h-5 text-indigo-500" />
                  สัดส่วนการออม/ลงทุน
                </h3>
                <div className="space-y-4">
                  {categoryBreakdown.saving.map(cat => (
                    <div key={cat.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 font-medium">{cat.label}</span>
                        <span className="text-slate-800 font-bold">{formatMoney(cat.amount)} ({cat.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`${cat.bg} h-2 rounded-full transition-all duration-500`} style={{ width: `${cat.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Transaction List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full min-h-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <List className="w-5 h-5 text-slate-500" />
                  ประวัติรายการ (เดือน {selectedMonth})
                </h2>
                <span className="text-sm font-medium px-3 py-1 bg-slate-100 text-slate-600 rounded-full flex items-center gap-1">
                  <Cloud className="w-4 h-4 text-blue-500" />
                  {monthlyData.length} รายการ
                </span>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCcw className="w-8 h-8 mb-4 animate-spin text-blue-500" />
                  <p>กำลังดึงข้อมูลจาก Cloud...</p>
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <List className="w-16 h-16 mb-4 opacity-20" />
                  <p>ยังไม่มีรายการในเดือนนี้</p>
                  <p className="text-sm mt-2">ข้อมูลจะซิงค์หากันอัตโนมัติเมื่อมีการเพิ่มรายการ</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monthlyData.map((tx) => (
                    <div key={tx.id} className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:shadow-sm transition-all bg-slate-50 hover:bg-white relative overflow-hidden">

                      {/* Indicator for items added by others */}
                      {tx.addedBy && tx.addedBy !== user?.uid && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-400" title="เพิ่มโดยคนอื่น"></div>
                      )}

                      <div className="flex items-center gap-4 pl-2">
                        <div className="p-3 rounded-full bg-white shadow-sm border border-slate-100">
                          {getCategoryIcon(tx.type, tx.category)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{getCategoryLabel(tx.type, tx.category)}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-md">{tx.date}</span>
                            {tx.note && (
                              <span className="text-slate-600 truncate max-w-[150px] md:max-w-[300px] inline-block">
                                • {tx.note}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`font-bold text-lg whitespace-nowrap
                          ${tx.type === 'income' ? 'text-emerald-600' :
                            tx.type === 'expense' ? 'text-rose-600' : 'text-indigo-600'}`}
                        >
                          {tx.type === 'expense' ? '-' : '+'}{formatMoney(tx.amount)}
                        </span>

                        <button
                          onClick={() => requestDelete(tx.id)}
                          className="opacity-100 md:opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-2 rounded-full hover:bg-red-50"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl transform transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">ยืนยันการลบข้อมูล</h3>
              <p className="text-slate-500 text-sm mb-6">
                คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? ข้อมูลจะหายไปจากทุกเครื่องทันที
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={cancelDelete}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-sm"
                >
                  ลบข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
