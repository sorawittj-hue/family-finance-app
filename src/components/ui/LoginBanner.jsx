import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { Cloud, LogIn, UserPlus, ShieldAlert, CheckCircle2, Loader2, X, Eye, EyeOff } from 'lucide-react';

export const LoginBanner = () => {
  const { user, login, signUp, syncing } = useFinance();

  const [visible, setVisible] = useState(true);
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'collapsed'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Don't show banner if already logged in or dismissed
  if (user || !visible) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.trim() || !password.trim()) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setLoading(true);
    const res = mode === 'login'
      ? await login(email, password)
      : await signUp(email, password);
    setLoading(false);

    if (res.success) {
      if (mode === 'signup') {
        setSuccess('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลยืนยัน');
      }
      // On successful login, banner will auto-hide because user state changes
    } else {
      setError(res.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/60 via-blue-900/30 to-slate-900/60 backdrop-blur-sm overflow-hidden shadow-lg shadow-blue-500/10">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Cloud size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">เข้าสู่ระบบเพื่อ Sync ข้ามอุปกรณ์</p>
            <p className="text-[11px] text-blue-300/70 mt-0.5">ข้อมูลจะถูกบันทึกบนคลาวด์และซิงก์ทุกเครื่อง</p>
          </div>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
          aria-label="ปิด"
        >
          <X size={15} />
        </button>
      </div>

      {/* Form */}
      <div className="px-5 py-4">
        {/* Error / Success */}
        {error && (
          <div className="mb-3 flex items-center gap-2 text-rose-400 text-xs bg-rose-500/5 border border-rose-500/10 rounded-xl px-3 py-2.5">
            <ShieldAlert size={13} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-3 flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2.5">
            <CheckCircle2 size={13} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
          {/* Email */}
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] text-blue-300/70 mb-1 font-medium">อีเมล</label>
            <input
              id="login-banner-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              autoComplete="email"
              className="w-full bg-slate-800/60 border border-blue-500/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="flex-1 min-w-0 relative">
            <label className="block text-[10px] text-blue-300/70 mb-1 font-medium">รหัสผ่าน</label>
            <div className="relative">
              <input
                id="login-banner-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full bg-slate-800/60 border border-blue-500/20 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-banner-submit"
            type="submit"
            disabled={loading || syncing}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-md shadow-blue-500/20 whitespace-nowrap"
          >
            {loading || syncing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : mode === 'login' ? (
              <LogIn size={15} />
            ) : (
              <UserPlus size={15} />
            )}
            {loading || syncing
              ? 'กำลังโหลด...'
              : mode === 'login'
              ? 'เข้าสู่ระบบ'
              : 'สมัครสมาชิก'}
          </button>
        </form>

        {/* Mode toggle */}
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setSuccess(''); }}
            className="text-[11px] text-blue-400/70 hover:text-blue-300 transition-colors"
          >
            {mode === 'login' ? '📝 ยังไม่มีบัญชี? สมัครสมาชิก' : '🔑 มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ข้อมูลถูก encrypt และปลอดภัย
          </div>
        </div>
      </div>
    </div>
  );
};
