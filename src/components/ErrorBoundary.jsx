import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application render failure.', { error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--bg-primary)] p-6 text-[color:var(--text-primary)]">
        <div className="glass-card max-w-md w-full p-6 text-center space-y-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">ระบบขัดข้องชั่วคราว</h1>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
              ข้อมูลในเครื่องยังอยู่ครบ ลองโหลดหน้าใหม่อีกครั้งเพื่อกลับมาใช้งานต่อ
            </p>
          </div>
          <Button type="button" onClick={this.handleReload} className="w-full">
            <RotateCcw size={16} />
            โหลดหน้าใหม่
          </Button>
        </div>
      </div>
    );
  }
}
