import React, { useState, useEffect, useCallback } from 'react';
import { X, Undo2 } from 'lucide-react';
import { addToastListener } from './toastStore';

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t]);
      if (t.duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(x => x.id !== t.id));
        }, t.duration);
      }
    };
    return addToastListener(handler);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[90vw] max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-up ${
            t.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200' :
            t.type === 'error' ? 'bg-rose-500/20 border-rose-500/30 text-rose-200' :
            'bg-[color:var(--bg-card)] border-[color:var(--border-color)] text-[color:var(--text-primary)]'
          }`}
        >
          <span className="text-xs font-bold flex-1">{t.message}</span>
          {t.onUndo && (
            <button
              onClick={() => { t.onUndo(); remove(t.id); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-bold hover:bg-blue-500/30 transition-colors"
            >
              <Undo2 size={12} /> เลิกทำ
            </button>
          )}
          <button onClick={() => remove(t.id)} className="p-1 rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
