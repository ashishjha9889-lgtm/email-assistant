'use client';

import { useState, useEffect } from 'react';
import { EmailAccount, EmailThread } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EmailThreadCard } from '@/components/EmailThreadCard';
import { ThreadDetail } from '@/components/ThreadDetail';
import {
  Users,
  Mail,
  Inbox,
  Flag,
  Settings,
  Plus,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Link,
  Unlink,
  Loader2,
} from 'lucide-react';
import { useGmail } from '@/hooks/useGmail';
import { cn } from '@/lib/utils';

export default function ClientsPage() {
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [viewMode, setViewMode] = useState<'accounts' | 'threads' | 'detail'>('accounts');
  const [connecting, setConnecting] = useState(false);
  
  const { accounts: gmailAccounts, fetchAccounts, connectAccount, disconnectAccount, loading: accountsLoading, threads, loading: threadsLoading, fetchThreads } = useGmail();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const getAccountStatus = (account: EmailAccount) => {
    if (!account.connected) return { label: 'Disconnected', icon: WifiOff, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' };
    return { 
      label: 'Connected', 
      icon: Wifi, 
      color: 'text-green-500', 
      bg: 'bg-green-100 dark:bg-green-900/30',
      unread: 0,
      important: 0,
      total: 0,
    };
  };

  const handleConnectGmail = async () => {
    setConnecting(true);
    await connectAccount();
    setConnecting(false);
  };

  const handleDisconnect = async (accountId: string) => {
    await disconnectAccount(accountId);
  };

  // Fetch threads when viewMode changes to 'threads' and account is selected
  useEffect(() => {
    if (viewMode === 'threads' && selectedAccount) {
      fetchThreads();
    }
  }, [viewMode, selectedAccount, fetchThreads]);

  if (viewMode === 'detail' && selectedThread) {
    return (
      <ThreadDetail
        thread={selectedThread}
        onBack={() => setViewMode('threads')}
      />
    );
  }

  if (viewMode === 'threads' && selectedAccount) {

    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <Button variant="ghost" size="icon" onClick={() => setViewMode('accounts')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">{selectedAccount.name}</h1>
            <p className="text-sm text-muted-foreground">{selectedAccount.email}</p>
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-full lg:w-96 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {threadsLoading ? (
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
                ) : (
                  threads.map((thread) => (
                    <EmailThreadCard
                      key={thread.id}
                      thread={thread}
                      onClick={() => { setSelectedThread(thread); setViewMode('detail'); }}
                      compact
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select an email</h3>
                <p className="text-muted-foreground">Choose a thread to view details</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage connected email accounts</p>
        </div>
        <Button onClick={handleConnectGmail} disabled={connecting} className="gap-2">
          <Plus className="h-4 w-4" />
          {connecting ? 'Connecting...' : 'Connect Gmail'}
        </Button>
      </div>

      {accountsLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <ScrollArea className="flex-1 p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {gmailAccounts.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">No accounts connected</h3>
                <p className="text-muted-foreground mb-4">Connect your Gmail account to start managing emails</p>
                <Button onClick={handleConnectGmail} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Connect Gmail
                </Button>
              </div>
            ) : (
              gmailAccounts.map((account) => {
                const status = getAccountStatus(account);
                const StatusIcon = status.icon;
                return (
                  <Card 
                    key={account.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => { setSelectedAccount(account); setViewMode('threads'); }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Mail className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{account.name}</h3>
                            <p className="text-sm text-muted-foreground">{account.email}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={cn('gap-1', status.bg, status.color)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      
                      {account.connected && (
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{status.total}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-500">{status.unread}</p>
                            <p className="text-xs text-muted-foreground">Unread</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-500">{status.important}</p>
                            <p className="text-xs text-muted-foreground">Important</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 flex items-center gap-2">
                        {!account.connected && (
                          <Button variant="outline" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); handleConnectGmail(); }}>
                            <Link className="h-4 w-4" />
                            Connect
                          </Button>
                        )}
                        {account.connected && (
                          <Button variant="destructive" className="flex-1 gap-1" onClick={(e) => { e.stopPropagation(); handleDisconnect(account.id); }}>
                            <Unlink className="h-4 w-4" />
                            Disconnect
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function getAccountStatus(account: EmailAccount) {
  if (!account.connected) return { label: 'Disconnected', icon: WifiOff, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' };
  return { 
    label: 'Connected', 
    icon: Wifi, 
    color: 'text-green-500', 
    bg: 'bg-green-100 dark:bg-green-900/30',
    unread: 0,
    important: 0,
    total: 0,
  };
}