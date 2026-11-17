'use client';

import { useState, useEffect } from 'react';
import { EmailThread } from '@/types';
import { EmailThreadCard } from '@/components/EmailThreadCard';
import { ThreadDetail } from '@/components/ThreadDetail';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Flag, Mail, Loader2, RotateCcw, ChevronLeft, Download } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchThreads(): Promise<EmailThread[]> {
  const response = await fetch(`${API_URL}/api/threads`);
  if (!response.ok) throw new Error('Failed to fetch threads');
  const data = await response.json();
  return data.threads;
}

function EmailThreadCardSkeleton() {
  return (
    <div className="p-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ImportantPage() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const threadsData = await fetchThreads();
      const importantThreads = threadsData.filter(t => t.isImportant);
      setThreads(importantThreads);
    } catch (e) {
      console.error('Failed to load important threads:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadDemoInbox() {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/threads`);
      if (response.ok) {
        const data = await response.json();
        const importantThreads = (data.threads || []).filter((t: EmailThread) => t.isImportant);
        setThreads(importantThreads);
      }
    } catch (e) {
      console.error('Failed to load demo inbox:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const threadsData = await fetchThreads();
        if (!cancelled) {
          const importantThreads = threadsData.filter(t => t.isImportant);
          setThreads(importantThreads);
        }
      } catch (e) {
        console.error('Failed to load important threads:', e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredThreads = threads.filter(thread => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSubject = thread.subject.toLowerCase().includes(query);
      const matchesSender = thread.lastMessage.from.name.toLowerCase().includes(query);
      const matchesBody = thread.lastMessage.body.toLowerCase().includes(query);
      if (!matchesSubject && !matchesSender && !matchesBody) return false;
    }
    return true;
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search important emails..." className="pl-10" disabled value="" />
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-full lg:w-96 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {[1,2,3,4,5].map(i => <EmailThreadCardSkeleton key={i} />)}
              </div>
            </ScrollArea>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search important emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{threads.length} important threads</span>
          <Button variant="outline" className="gap-1" onClick={handleRefresh} disabled={refreshing}>
            <RotateCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Thread List */}
        <div className={`w-full lg:w-96 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col ${isMobile && selectedThread ? 'hidden' : ''}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Flag className="h-5 w-5 text-yellow-500" />
              Important
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                {threads.length}
              </span>
            </h2>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredThreads.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted_foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No important emails</h3>
                  <p className="text-muted_foreground mb-4">No important emails found.</p>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={loadDemoInbox}
                  >
                    <Download className="h-4 w-4" />
                    Load Demo Inbox
                  </Button>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <EmailThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => setSelectedThread(thread)}
                    compact
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Thread Detail */}
        <div className={`flex-1 flex flex-col min-w-0 ${isMobile ? (selectedThread ? '' : 'hidden') : ''}`}>
          {selectedThread ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
                <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Button>
                <h2 className="font-semibold text-gray-900 dark:text-white truncate">Email Detail</h2>
                <div className="w-10" />
              </div>
              <ThreadDetail
                thread={selectedThread}
                onBack={() => setSelectedThread(null)}
              />
            </div>
          ) : !isMobile && (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50">
              <div className="text-center p-8">
                <Flag className="h-16 w-16 text-yellow-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select an important email</h3>
                <p className="text-muted_foreground">Choose a thread from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}