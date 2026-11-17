'use client';

import { useState, useCallback } from 'react';
import { EmailThread, EmailAccount } from '@/types';

export function useGmail() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  const fetchThreads = useCallback(async (params?: { maxResults?: number; q?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      if (params?.maxResults) searchParams.set('maxResults', params.maxResults.toString());
      if (params?.q) searchParams.set('q', params.q);

      const response = await fetch(`/api/threads?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch threads');
      const data = await response.json();
      setThreads(data.threads || []);
      return data.threads;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch threads';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchThread = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/threads/${id}`);
      if (!response.ok) throw new Error('Failed to fetch thread');
      const data = await response.json();
      return data.thread;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch thread';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
      return data.accounts;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch accounts';
      setError(message);
      return [];
    }
  }, []);

  const connectAccount = useCallback(async () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/signin?provider=google&callbackUrl=/dashboard/clients';
  }, []);

  const disconnectAccount = useCallback(async (accountId: string) => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (!response.ok) throw new Error('Failed to disconnect account');
      await fetchAccounts();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disconnect account';
      setError(message);
      return false;
    }
  }, [fetchAccounts]);

  return {
    threads,
    loading,
    error,
    accounts,
    fetchThreads,
    fetchThread,
    fetchAccounts,
    connectAccount,
    disconnectAccount,
  };
}