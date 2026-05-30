import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Cloud, Loader2, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const statusCopy = {
  online: 'Cloud sync active',
  syncing: 'Syncing finance data',
  checking: 'Checking cloud session',
  'signed-out': 'Sign in to sync devices',
  local: 'Local-only mode',
  error: 'Sync needs attention',
};

export const CloudSyncPanel = () => {
  const { cloud } = useFinance();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [authMessage, setAuthMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthMessage('');

    const action = authMode === 'signup' ? cloud.signUpWithEmail : cloud.signInWithEmail;
    const { error } = await action(email.trim(), password);
    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage(authMode === 'signup' ? 'Account created. Check email if confirmation is enabled.' : 'Signed in and syncing.');
      setPassword('');
    }
    setIsSubmitting(false);
  };

  if (!cloud.isConfigured) {
    return (
      <Card className="p-5 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-amber-300 shrink-0" size={22} />
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-[color:var(--text-primary)]">Supabase sync is not connected</h3>
            <p className="text-xs leading-relaxed text-[color:var(--text-secondary)]">
              Add the missing Vite public env vars in Vercel and local development: {cloud.missingKeys.join(', ')}.
              The app is still usable, but data stays on this device.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-blue-500/20 bg-blue-500/5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center shrink-0">
            {cloud.status === 'syncing' ? <Loader2 size={22} className="animate-spin" /> : <Cloud size={22} />}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-muted)] font-bold">Supabase secure sync</p>
            <h3 className="text-base font-black text-[color:var(--text-primary)]">
              {statusCopy[cloud.status] || statusCopy.local}
            </h3>
            <p className="text-xs text-[color:var(--text-secondary)] mt-1">
              {cloud.isAuthenticated
                ? `${cloud.user.email} - last synced ${cloud.lastSyncedAt ? new Date(cloud.lastSyncedAt).toLocaleString() : 'just now'}`
                : 'Use the same login on every device to share one encrypted Supabase session.'}
            </p>
            {cloud.error && <p className="text-xs text-rose-300 mt-2">{cloud.error}</p>}
          </div>
        </div>

        {cloud.isAuthenticated ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={cloud.refresh} className="gap-2">
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="ghost" onClick={cloud.signOut} className="gap-2">
              <LogOut size={14} /> Sign out
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 w-full lg:max-w-2xl">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              className="bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="password"
              minLength={6}
              className="bg-[color:var(--bg-card)] border border-[color:var(--border-color)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] focus:outline-none focus:border-blue-500"
              required
            />
            <Button type="submit" disabled={isSubmitting} className="gap-2 whitespace-nowrap">
              <ShieldCheck size={14} /> {authMode === 'signup' ? 'Create' : 'Sign in'}
            </Button>
            <div className="sm:col-span-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                className="text-xs text-blue-300 hover:text-blue-200 text-left"
              >
                {authMode === 'signup' ? 'Already have an account? Sign in' : 'New device or first time? Create account'}
              </button>
              {authMessage && (
                <span className="text-xs text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 size={12} /> {authMessage}
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </Card>
  );
};
