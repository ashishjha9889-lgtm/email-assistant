'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EmailThreadCard } from '@/components/EmailThreadCard';
import { EmailThread } from '@/types';
import {
  Mail,
  Flag,
  Users,
  User,
  Zap,
  Brain,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Inbox,
  ArrowRight,
  Plus,
  Settings,
  Filter,
  Search,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchThreads(): Promise<EmailThread[]> {
  const res = await fetch(`${API_URL}/api/threads`);
  if (!res.ok) throw new Error('Failed to fetch threads');
  const data = await res.json();
  return data.threads;
}

async function fetchClientChoices(): Promise<Record<string, 'client' | 'assistant' | 'pending'>> {
  const res = await fetch(`${API_URL}/api/client/threads`);
  if (!res.ok) return {};
  const data = await res.json();
  return data.choices || {};
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'needs-client' | 'needs-assistant' | 'unread'>('overview');
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [responderChoices, setResponderChoices] = useState<Record<string, 'client' | 'assistant' | 'pending'>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [threadsData, choicesData] = await Promise.all([
          fetchThreads(),
          fetchClientChoices(),
        ]);
        setThreads(threadsData);
        setResponderChoices(choicesData);
      } catch (e) {
        setError('Failed to load dashboard data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const stats = {
    total: threads.length,
    unread: threads.filter(t => t.isUnread).length,
    important: threads.filter(t => t.isImportant).length,
    needsClient: threads.filter(t => t.aiInsight?.suggestedResponder === 'client').length,
    needsAssistant: threads.filter(t => t.aiInsight?.suggestedResponder === 'assistant').length,
  };

  const getFilteredThreads = () => {
    switch (activeTab) {
      case 'needs-client':
        return threads.filter(t => t.aiInsight?.suggestedResponder === 'client');
      case 'needs-assistant':
        return threads.filter(t => t.aiInsight?.suggestedResponder === 'assistant');
      case 'unread':
        return threads.filter(t => t.isUnread);
      default:
        return threads;
    }
  };

  const filteredThreads = getFilteredThreads().filter(t => !unreadOnly || t.isUnread);

  const statCards = [
    { label: 'Total Threads', value: stats.total, icon: Mail, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Unread', value: stats.unread, icon: Inbox, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Important', value: stats.important, icon: Flag, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    { label: 'Needs Client', value: stats.needsClient, icon: User, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Needs Assistant', value: stats.needsAssistant, icon: Users, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Error loading data</p>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your email management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={unreadOnly ? "default" : "outline"} className="gap-2" onClick={() => setUnreadOnly(v => !v)}>
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button className="gap-2" onClick={() => setShowCompose(true)}>
            <Plus className="h-4 w-4" />
            Compose
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-gray-200 dark:border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                </div>
                <div className={cn('p-3 rounded-xl', stat.bg)}>
                  <stat.icon className={cn('h-6 w-6', stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Insights Summary */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <InsightStat 
              label="High Urgency" 
              value={threads.filter(t => t.aiInsight?.urgency === 'high').length}
              icon={AlertTriangle}
              color="text-red-500"
              description="Require immediate attention"
            />
            <InsightStat 
              label="Client Actions" 
              value={stats.needsClient}
              icon={User}
              color="text-blue-500"
              description="Awaiting client response"
            />
            <InsightStat 
              label="Assistant Tasks" 
              value={stats.needsAssistant}
              icon={Users}
              color="text-green-500"
              description="Ready for assistant handling"
            />
            <InsightStat 
              label="Meetings Pending" 
              value={threads.filter(t => t.aiInsight?.category === 'meeting').length}
              icon={Clock}
              color="text-purple-500"
              description="Scheduling needed"
            />
          </div>
        </CardContent>
      </Card>

      {/* Threads List */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Threads
            </CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-4 h-auto bg-transparent">
                <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
                <TabsTrigger value="needs-client" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Client</TabsTrigger>
                <TabsTrigger value="needs-assistant" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">Assistant</TabsTrigger>
                <TabsTrigger value="unread" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">Unread</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-3">
              {filteredThreads.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No threads found</p>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <EmailThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => setSelectedThread(thread)}
                    compact
                    responderChoice={responderChoices[thread.id]}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} />}

      {/* Thread Detail Modal */}
      {selectedThread && (
        <ThreadDetailModal
          thread={selectedThread}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
}

function InsightStat({ label, value, icon: Icon, color, description }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className={cn('p-3 rounded-xl', color.replace('text-', 'bg-').replace('500', '100'))}>
          <Icon className={cn('h-6 w-6', color)} />
        </div>
      </div>
    </div>
  );
}

function ThreadDetailModal({ thread, onClose }: { thread: EmailThread; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-xl">
          <h2 className="font-semibold">Thread Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ThreadDetailContent thread={thread} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

function ThreadDetailContent({ thread, onClose }: { thread: EmailThread; onClose: () => void }) {
  const { aiInsight, lastMessage } = thread;
  const labels = thread.labels ?? [];
  const participants = thread.participants ?? [];
  const actionItems = aiInsight?.actionItems ?? [];
  const attachments = lastMessage.attachments ?? [];
  const clientParticipant = participants.find(p => p.isClient);
  const assistantParticipant = participants.find(p => p.isAssistant);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-words">{thread.subject}</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {labels.map((label) => (
            <Badge key={label.id} variant="outline" style={{ borderColor: label.color, color: label.color }}>
              {label.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary font-medium">AI Analysis</span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
              {aiInsight.importanceScore}/100 importance
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 break-words">{aiInsight.summary}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 break-words">{aiInsight.reasoning}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={aiInsight.suggestedResponder === 'client' ? 'border-blue-500 text-blue-700' : 'border-green-500 text-green-700'}>
              {aiInsight.suggestedResponder === 'client' ? '👤 Client Action' : '🤖 Assistant Handle'}
            </Badge>
            <Badge variant="secondary">{aiInsight.category.replace('-', ' ')}</Badge>
            <Badge variant="outline" className={aiInsight.urgency === 'high' ? 'border-red-500 text-red-700' : aiInsight.urgency === 'medium' ? 'border-orange-500 text-orange-700' : 'border-gray-500 text-gray-700'}>
              {aiInsight.urgency} urgency
            </Badge>
          </div>
          {actionItems.length > 0 && (
            <ul className="mt-3 space-y-1">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-green-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Participants */}
      <div>
        <h4 className="font-medium mb-2">Participants</h4>
        <div className="flex flex-wrap gap-2">
          {clientParticipant && (
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {clientParticipant.name} (Client)
            </Badge>
          )}
          {assistantParticipant && (
            <Badge variant="outline" className="gap-1">
              <User className="h-3 w-3" />
              {assistantParticipant.name} (Assistant)
            </Badge>
          )}
          {participants.filter(p => !p.isClient && !p.isAssistant).map((p) => (
            <Badge key={p.email} variant="secondary" className="gap-1">
              {p.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Last Message Preview */}
      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span className="font-medium">{lastMessage.from.name}</span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true })}</span>
        </div>
        <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{lastMessage.body}</p>
        {attachments.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            📎 {attachments.length} attachment(s)
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
        <Button className="gap-2" onClick={onClose}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Close
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => { toast.success("Reply sent (demo)"); onClose(); }}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Reply
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => { toast.success("Forwarded (demo)"); onClose(); }}>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12,5 19,12 12,19" />
          </svg>
          Forward
        </Button>
      </div>
    </div>
  );
}

function ComposeModal({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold">New Message</h2>
        <input className="w-full rounded-md border bg-transparent p-2 text-sm" placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
        <input className="w-full rounded-md border bg-transparent p-2 text-sm" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="w-full rounded-md border bg-transparent p-2 text-sm min-h-32" placeholder="Message" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { toast.success('Email sent (demo)'); onClose(); }}>Send</Button>
        </div>
      </div>
    </div>
  );
}
