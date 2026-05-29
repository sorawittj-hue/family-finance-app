import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  TrendingDown,
  TrendingUp,
  PiggyBank,
  PlusCircle,
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
} from 'lucide-react';

export const CATEGORIES = {
  income: [
    { id: 'salary',    label: 'เงินเดือน',          icon: Briefcase,   color: '#3b82f6' },
    { id: 'business',  label: 'ธุรกิจส่วนตัว',      icon: TrendingUp,  color: '#8b5cf6' },
    { id: 'bonus',     label: 'โบนัส/เงินพิเศษ',    icon: Gift,        color: '#f59e0b' },
    { id: 'dividend',  label: 'ดอกเบี้ย/ปันผล',     icon: LineChart,   color: '#10b981' },
    { id: 'transfer_in', label: 'รับโอนจากบัญชีอื่น', icon: ArrowDownRight, color: '#10b981' },
    { id: 'other_in',  label: 'รายได้อื่นๆ',         icon: PlusCircle,  color: '#64748b' },
  ],
  expense: [
    { id: 'food',      label: 'อาหาร/เครื่องดื่ม',   icon: Utensils,    color: '#f43f5e' },
    { id: 'home',      label: 'ที่อยู่อาศัย/น้ำไฟ',   icon: Home,        color: '#0ea5e9' },
    { id: 'transport', label: 'เดินทาง/รถยนต์',      icon: Car,         color: '#f59e0b' },
    { id: 'family',    label: 'ลูกและการศึกษา',      icon: Baby,        color: '#8b5cf6' },
    { id: 'health',    label: 'สุขภาพ/ของใช้',       icon: Activity,    color: '#10b981' },
    { id: 'debt',      label: 'หนี้สิน/บัตรเครดิต',  icon: CreditCard,  color: '#ef4444' },
    { id: 'shopping',  label: 'บันเทิง/ช้อปปิ้ง',    icon: ShoppingBag, color: '#ec4899' },
    { id: 'parents',   label: 'ให้พ่อแม่/ญาติ',      icon: Heart,       color: '#f43f5e' },
    { id: 'transfer_out', label: 'โอนไปบัญชีอื่น',    icon: ArrowUpRight, color: '#f43f5e' },
    { id: 'other_ex',  label: 'จิปาถะอื่นๆ',          icon: MoreHorizontal, color: '#64748b' },
  ],
  saving: [
    { id: 'emergency',   label: 'เงินออมฉุกเฉิน',       icon: PiggyBank,   color: '#8b5cf6' },
    { id: 'investment',  label: 'กองทุน/หุ้น/คริปโต',   icon: LineChart,   color: '#3b82f6' },
    { id: 'insurance',   label: 'ประกันสะสมทรัพย์',     icon: ShieldCheck, color: '#10b981' },
    { id: 'kids_saving', label: 'เงินออมเพื่อลูก',      icon: Baby,        color: '#f472b6' },
    { id: 'deposit',     label: 'เงินฝากประจำ',         icon: Landmark,    color: '#f59e0b' },
  ],
};

export const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export const CURRENCY_MAP = {
  THB: { locale: 'th-TH', symbol: '฿', code: 'THB', minDigits: 0 },
  USD: { locale: 'en-US', symbol: '$', code: 'USD', minDigits: 2 },
  EUR: { locale: 'de-DE', symbol: '€', code: 'EUR', minDigits: 2 },
  JPY: { locale: 'ja-JP', symbol: '¥', code: 'JPY', minDigits: 0 },
  GBP: { locale: 'en-GB', symbol: '£', code: 'GBP', minDigits: 2 }
};

export const formatMoney = (amount, currency = 'THB') => {
  const config = CURRENCY_MAP[currency] || CURRENCY_MAP.THB;
  const val = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.minDigits,
    maximumFractionDigits: config.minDigits
  }).format(val);
};

export const formatMoneyShort = (amount, currency = 'THB') => {
  const config = CURRENCY_MAP[currency] || CURRENCY_MAP.THB;
  const val = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const absAmount = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absAmount >= 1_000_000) {
    return `${sign}${config.symbol}${(absAmount / 1_000_000).toFixed(1)}M`;
  }
  if (absAmount >= 1_000) {
    return `${sign}${config.symbol}${(absAmount / 1_000).toFixed(1)}K`;
  }
  return formatMoney(val, currency);
};

export const getCategory = (type, id) => {
  return CATEGORIES[type]?.find(c => c.id === id) || { label: 'อื่นๆ', icon: MoreHorizontal, color: '#64748b' };
};
