import { format, subDays } from 'date-fns';

export const generateDemoData = () => {
  const today = new Date();
  
  const formatDate = (date) => format(date, 'yyyy-MM-dd');

  const wallets = [
    { id: 'wallet-cash', name: 'เงินสด', color: '#10b981', type: 'cash' },
    { id: 'wallet-kbank', name: 'บัญชีเงินฝาก กสิกรไทย', color: '#3b82f6', type: 'bank' },
    { id: 'wallet-scb', name: 'บัญชีออมทรัพย์ ไทยพาณิชย์', color: '#8b5cf6', type: 'bank' },
    { id: 'wallet-ktc', name: 'บัตรเครดิต KTC', color: '#f43f5e', type: 'credit' }
  ];

  const budgets = {
    food: 12000,
    home: 15000,
    transport: 6000,
    shopping: 5000,
    family: 10000,
    health: 4000
  };

  const goals = [
    { id: 'goal-emergency', name: 'เงินสำรองฉุกเฉิน 6 เดือน', targetAmount: 180000, currentAmount: 120000 },
    { id: 'goal-japan', name: 'กองทุนเที่ยวญี่ปุ่นกับครอบครัว', targetAmount: 80000, currentAmount: 45000 },
    { id: 'goal-kids', name: 'ทุนการศึกษาสำหรับลูกปฐมวัย', targetAmount: 150000, currentAmount: 150000 } // Complete!
  ];

  const transactions = [
    {
      id: 'tx-demo-1',
      type: 'income',
      category: 'salary',
      amount: 68000,
      date: formatDate(subDays(today, 1)),
      walletId: 'wallet-scb',
      note: 'เงินเดือนประจำเดือนนี้',
      timestamp: Date.now() - 1000000
    },
    {
      id: 'tx-demo-2',
      type: 'income',
      category: 'business',
      amount: 14500,
      date: formatDate(subDays(today, 4)),
      walletId: 'wallet-kbank',
      note: 'รายได้โปรเจกต์เสริมพิเศษ',
      timestamp: Date.now() - 2000000
    },
    {
      id: 'tx-demo-3',
      type: 'expense',
      category: 'home',
      amount: 8500,
      date: formatDate(subDays(today, 2)),
      walletId: 'wallet-scb',
      note: 'ค่าเช่าคอนโดประจำเดือน',
      timestamp: Date.now() - 3000000
    },
    {
      id: 'tx-demo-4',
      type: 'expense',
      category: 'home',
      amount: 2150,
      date: formatDate(subDays(today, 3)),
      walletId: 'wallet-scb',
      note: 'ค่าน้ำค่าไฟส่วนกลาง',
      timestamp: Date.now() - 4000000
    },
    {
      id: 'tx-demo-5',
      type: 'expense',
      category: 'food',
      amount: 1200,
      date: formatDate(today),
      walletId: 'wallet-cash',
      note: 'ทานมื้อเย็นบุฟเฟต์ปิ้งย่างครอบครัว',
      timestamp: Date.now() - 50000
    },
    {
      id: 'tx-demo-6',
      type: 'expense',
      category: 'food',
      amount: 180,
      date: formatDate(today),
      walletId: 'wallet-cash',
      note: 'กาแฟและขนมหวานยามบ่าย',
      timestamp: Date.now() - 100000
    },
    {
      id: 'tx-demo-7',
      type: 'expense',
      category: 'food',
      amount: 320,
      date: formatDate(subDays(today, 1)),
      walletId: 'wallet-cash',
      note: 'มื้อกลางวันสั่งเดลิเวอรี่',
      timestamp: Date.now() - 1200000
    },
    {
      id: 'tx-demo-8',
      type: 'expense',
      category: 'transport',
      amount: 1200,
      date: formatDate(subDays(today, 2)),
      walletId: 'wallet-kbank',
      note: 'เติมน้ำมันเต็มถังรถครอบครัว',
      timestamp: Date.now() - 3100000
    },
    {
      id: 'tx-demo-9',
      type: 'expense',
      category: 'shopping',
      amount: 2490,
      date: formatDate(subDays(today, 3)),
      walletId: 'wallet-ktc',
      note: 'ซื้อรองเท้าวิ่งคู่ออกกำลังกาย',
      timestamp: Date.now() - 4100000
    },
    {
      id: 'tx-demo-10',
      type: 'expense',
      category: 'family',
      amount: 3500,
      date: formatDate(subDays(today, 5)),
      walletId: 'wallet-scb',
      note: 'ค่าหนังสือและของเล่นเสริมพัฒนาการ',
      timestamp: Date.now() - 5000000
    },
    {
      id: 'tx-demo-11',
      type: 'saving',
      category: 'investment',
      amount: 10000,
      date: formatDate(subDays(today, 1)),
      walletId: 'wallet-scb',
      note: 'ซื้อกองทุนรวมปันผล (DCA)',
      timestamp: Date.now() - 1100000
    },
    {
      id: 'tx-demo-12',
      type: 'saving',
      category: 'emergency',
      amount: 5000,
      date: formatDate(subDays(today, 6)),
      walletId: 'wallet-kbank',
      note: 'โอนสะสมเงินสำรองส่วนตัว',
      timestamp: Date.now() - 6000000
    },
    {
      id: 'tx-demo-13',
      type: 'expense',
      category: 'health',
      amount: 850,
      date: formatDate(subDays(today, 5)),
      walletId: 'wallet-ktc',
      note: 'ค่ายาและวิตามินบำรุงสุขภาพ',
      timestamp: Date.now() - 5200000
    },
    {
      id: 'tx-demo-14',
      type: 'expense',
      category: 'parents',
      amount: 5000,
      date: formatDate(subDays(today, 4)),
      walletId: 'wallet-kbank',
      note: 'เงินโอนเลี้ยงดูคุณพ่อคุณแม่ประจำเดือน',
      timestamp: Date.now() - 2500000
    },
    {
      id: 'tx-demo-15',
      type: 'expense',
      category: 'shopping',
      amount: 790,
      date: formatDate(subDays(today, 6)),
      walletId: 'wallet-ktc',
      note: 'สมัครบริการรายเดือน Netflix & Spotify',
      timestamp: Date.now() - 6200000
    }
  ];

  return { wallets, budgets, goals, transactions };
};
