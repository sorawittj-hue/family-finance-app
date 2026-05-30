import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { AIAssistantBubble } from '../AIAssistantBubble';
import { LoginBanner } from '../ui/LoginBanner';
import { SyncStatusBanner } from '../ui/SyncStatusBanner';

export const Layout = () => {
  return (
    <div className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] selection:bg-blue-500/30">
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="md:ml-64 pb-24 md:pb-8 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
          <LoginBanner />
          <SyncStatusBanner />
          <Outlet />
        </div>
      </main>

      <BottomNav />
      <AIAssistantBubble />
    </div>
  );
};

