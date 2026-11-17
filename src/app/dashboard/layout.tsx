'use client';

import { useState, useEffect } from 'react';
import { ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { EmailAccount } from '@/types';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [currentAccount, setCurrentAccount] = useState<EmailAccount | null>(null);
  const [viewMode, setViewMode] = useState<'assistant' | 'client'>('assistant');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const demo: EmailAccount = {
      id: 'demo',
      email: 'client@example.com',
      name: 'Demo Client',
      provider: 'gmail',
      connected: true,
    };
    async function fetchAccount() {
      try {
        const res = await fetch('/api/accounts');
        if (res.ok) {
          const data = await res.json();
          const acc =
            (Array.isArray(data) ? data[0] : null) ||
            data.accounts?.[0] ||
            data.client?.accounts?.[0];
          setCurrentAccount(acc || demo);
          return;
        }
      } catch (e) {
        console.error('Failed to fetch account:', e);
      }
      setCurrentAccount(demo);
    }
    fetchAccount().finally(() => setLoading(false));
  }, []);

  if (loading || !currentAccount) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <Layout
      currentAccount={currentAccount}
      onAccountChange={setCurrentAccount}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    >
      {children}
    </Layout>
  );
}
