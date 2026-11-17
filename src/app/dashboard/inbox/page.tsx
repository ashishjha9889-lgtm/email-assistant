'use client';

import { useState, useEffect, useRef } from 'react';
import { EmailThread } from '@/types';
import { toast } from 'sonner';
import { EmailThreadCard } from '@/components/EmailThreadCard';
import { ThreadDetail } from '@/components/ThreadDetail';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Mail, Bell, Loader2, RotateCcw, Download } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

type InboxFilter = 'all' | 'unread' | 'important' | 'ai-client' | 'ai-assistant' | 'client-will-reply' | 'assistant-will-handle';

const FILTER_BUTTONS: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'important', label: 'Important' },
  { value: 'ai-client', label: 'AI: Client' },
  { value: 'ai-assistant', label: 'AI: Assistant' },
  { value: 'client-will-reply', label: 'Client will reply' },
  { value: 'assistant-will-handle', label: 'Assistant will handle' },
];

async function fetchThreads(): Promise<EmailThread[]> {
  const response = await fetch(`${API_URL}/api/threads`);
  if (!response.ok) throw new Error('Failed to fetch threads');
  const data = await response.json();
  return data.threads || [];
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

export default function InboxPage() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // One loader for the first load, Refresh, Retry, Load Demo Inbox and polling.
  // silent = true (polling): no spinner states, and the error state is left alone on failure.
  async function handleRefresh(silent = false) {
    if (!silent) setRefreshing(true);
    try {
      const data = await fetchThreads();
      if (!mountedRef.current) return;
      setThreads(data);
      setError(null);
    } catch (e) {
      console.error('Failed to load threads:', e);
      if (!silent && mountedRef.current) {
        setError('Could not load your emails. Please check your connection and try again.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    handleRefresh();
    const interval = setInterval(() => {
      handleRefresh(true);
    }, 10000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedThread = selectedThreadId
    ? threads.find(t => t.id === selectedThreadId) ?? null
    : null;

  const filteredThreads = threads.filter(thread => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSubject = thread.subject.toLowerCase().includes(query);
      const matchesSender = thread.lastMessage.from.name.toLowerCase().includes(query);
      const matchesBody = thread.lastMessage.body.toLowerCase().includes(query);
      if (!matchesSubject && !matchesSender && !matchesBody) return false;
    }

    switch (filter) {
      case 'unread':
        return thread.isUnread;
      case 'important':
        return thread.isImportant;
      case 'ai-client':
        return thread.aiInsight?.suggestedResponder === 'client';
      case 'ai-assistant':
        return thread.aiInsight?.suggestedResponder === 'assistant';
      case 'client-will-reply':
        return thread.responderChoice === 'client';
      case 'assistant-will-handle':
        return thread.responderChoice === 'assistant';
      default:
        return true;
    }
  });

  const unreadCount = threads.filter(t => t.isUnread).length;

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search emails..." className="pl-10" disabled value="" />
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
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => handleRefresh()} disabled={refreshing}>
            <RotateCcw className="h-4 w-4" />
            Refresh
          </Button>
          <div className="flex items-center gap-1">
            <Bell className="h-4 w-4" />
            <span className="text-sm font-medium">{unreadCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        {FILTER_BUTTONS.map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? 'default' : 'outline'}
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Thread List */}
        <div className={`w-full lg:w-96 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col ${selectedThread ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <h2 className="font-semibold text-gray-900 dark:text-white">Inbox</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">{unreadCount} unread</Badge>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {error && threads.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Something went wrong</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleRefresh()}
                    disabled={refreshing}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No emails found</h3>
                  <p className="text-muted-foreground mb-4">Your inbox is empty or no emails match your filters.</p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleRefresh()}
                    disabled={refreshing}
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
                    onClick={() => setSelectedThreadId(thread.id)}
                    compact
                    responderChoice={thread.responderChoice}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Thread Detail */}
        <div className={`flex-1 min-w-0 flex-col ${selectedThread ? 'flex' : 'hidden lg:flex'}`}>
          {selectedThread ? (
            <div className="flex flex-col h-full">
              <ThreadDetail
                thread={selectedThread}
                onBack={() => setSelectedThreadId(null)}
                onAction={(action) => {
                  if (action === 'markImportant') toast.success('Important toggled (demo)');
                  else if (action === 'markRead') toast.success('Read status toggled (demo)');
                  else if (action === 'archive') { toast.success('Archived (demo)'); setSelectedThreadId(null); }
                  else if (action === 'delete') { toast.success('Deleted (demo)'); setSelectedThreadId(null); }
                }}
                responderChoice={selectedThread.responderChoice}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50">
              <div className="text-center p-8">
                <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select an email</h3>
                <p className="text-muted-foreground">Choose a thread from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
