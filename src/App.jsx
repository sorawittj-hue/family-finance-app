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
const WealthCoach = lazy(() => import('./pages/WealthCoach').then((module) => ({ default: module.WealthCoach })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));
const Portfolio = lazy(() => import('./pages/Portfolio').then((module) => ({ default: module.Portfolio })));

// Loading skeleton component
const SkeletonPulse = ({ className }) => (
  <div className={`animate-pulse bg-white/[0.06] rounded-xl ${className}`} />
);

const PageLoader = () => (
  <div className="space-y-6 py-4">
    <SkeletonPulse className="h-8 w-48" />
    <SkeletonPulse className="h-4 w-72" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <SkeletonPulse className="h-28" />
      <SkeletonPulse className="h-28" />
      <SkeletonPulse className="h-28" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonPulse className="h-64" />
      <SkeletonPulse className="h-64" />
    </div>
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
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="wealth" element={<WealthCoach />} />
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
