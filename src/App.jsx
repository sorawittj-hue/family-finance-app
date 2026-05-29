import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Transactions = lazy(() => import('./pages/Transactions').then((module) => ({ default: module.Transactions })));
const Budgets = lazy(() => import('./pages/Budgets').then((module) => ({ default: module.Budgets })));
const Goals = lazy(() => import('./pages/Goals').then((module) => ({ default: module.Goals })));
const Reports = lazy(() => import('./pages/Reports').then((module) => ({ default: module.Reports })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));

const PageLoader = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm font-medium text-[color:var(--text-secondary)]">
    กำลังโหลดข้อมูล...
  </div>
);

export default function App() {
  return (
    <FinanceProvider>
      <ErrorBoundary>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="transactions" element={<Transactions />} />
                <Route path="budgets" element={<Budgets />} />
                <Route path="goals" element={<Goals />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </FinanceProvider>
  );
}
