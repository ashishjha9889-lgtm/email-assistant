'use client';

import { useState, useEffect } from 'react';
import { EmailThread } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Flag,
  AlertTriangle,
  User,
  Clock,
  CheckCircle,
  Mail,
  Brain,
  Zap,
  Target,
  Users,
  Bot,
  Check,
  Loader2,
  Shield,
  Download,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { draftReply } from '@/lib/ai-service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

type ResponderChoice = 'client' | 'assistant' | 'pending';

async function fetchClientThreads(): Promise<EmailThread[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/client/threads`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.threads || [];
  } catch (e) {
    console.error('Failed to load client threads:', e);
    return null;
  }
}

async function setResponderChoice(threadId: string, choice: ResponderChoice): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/client/threads/${threadId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice }),
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to set responder choice:', e);
    return false;
  }
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  return format(d, 'MMM d, h:mm a');
}

function getUrgencyStyles(urgency: 'high' | 'medium' | 'low'): string {
  switch (urgency) {
    case 'high':
      return 'border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30';
    case 'medium':
      return 'border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30';
    case 'low':
      return 'border-l-4 border-gray-300 dark:border-gray-700';
    default:
      return 'border-l-4 border-gray-300 dark:border-gray-700';
  }
}

function getUrgencyColor(urgency: 'high' | 'medium' | 'low'): string {
  switch (urgency) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#f97316';
    case 'low':
      return '#22c55e';
    default:
      return '#22c55e';
  }
}

export default function ClientAttentionPage() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'decision' | 'meeting'>('all');
  const [responderChoices, setResponderChoices] = useState<Record<string, ResponderChoice>>({});
  const [demoMode, setDemoMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generatingDraft, setGeneratingDraft] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { draft: string; subject?: string; confidence: number; reasoning: string; demoMode?: boolean }>>({});

  function getChoice(thread: EmailThread): ResponderChoice {
    return responderChoices[thread.id] ?? thread.responderChoice ?? 'pending';
  }

  async function loadDemoInbox() {
    setLoading(true);
    const data = await fetchClientThreads();
    if (data) setThreads(data);
    setLoading(false);
  }

  async function handleResponderChoice(threadId: string, choice: 'client' | 'assistant') {
    // Instant local update
    setResponderChoices(prev => ({ ...prev, [threadId]: choice }));
    const ok = await setResponderChoice(threadId, choice);
    if (ok) {
      setThreads(prev => prev.map(t => (t.id === threadId ? { ...t, responderChoice: choice } : t)));
    }
    // Drop the local override so later changes from the assistant show up via polling
    setResponderChoices(prev => {
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
  }

  async function handleGenerateDraft(threadId: string) {
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const source = thread.messages?.length ? thread.messages : [thread.lastMessage];

    setGeneratingDraft(threadId);
    try {
      const result = await draftReply({
        thread: {
          subject: thread.subject,
          messages: source.map(m => ({
            from: m.from,
            body: m.body,
            timestamp: new Date(m.timestamp).toISOString(),
          })),
        },
        responder: 'client',
      });
      setDrafts(prev => ({ ...prev, [threadId]: result }));
    } catch (e) {
      console.error('Failed to generate draft:', e);
    } finally {
      setGeneratingDraft(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const data = await fetchClientThreads();
      if (!cancelled && data) {
        setThreads(data);
      }
    }

    async function initialLoad() {
      await refresh();
      if (!cancelled) {
        const hasKey = localStorage.getItem('user_ai_api_key');
        setDemoMode(!hasKey);
        setLoading(false);
      }
    }

    initialLoad();
    const interval = setInterval(refresh, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Only threads that need the client: AI says client/either, or a choice is already set
  const relevantThreads = threads.filter(thread => {
    const suggested = thread.aiInsight?.suggestedResponder as string | undefined;
    const choice = getChoice(thread);
    return suggested === 'client' || suggested === 'either' || choice !== 'pending';
  });

  const filteredThreads = relevantThreads.filter(thread => {
    switch (filter) {
      case 'urgent':
        return thread.aiInsight?.urgency === 'high';
      case 'decision':
        return thread.aiInsight?.category === 'decision-needed';
      case 'meeting':
        return thread.aiInsight?.category === 'meeting';
      default:
        return true;
    }
  });

  const stats = {
    total: relevantThreads.length,
    urgent: relevantThreads.filter(t => t.aiInsight?.urgency === 'high').length,
    decisions: relevantThreads.filter(t => t.aiInsight?.category === 'decision-needed').length,
    meetings: relevantThreads.filter(t => t.aiInsight?.category === 'meeting').length,
    pending: relevantThreads.filter(t => getChoice(t) === 'pending').length,
    clientWillReply: relevantThreads.filter(t => getChoice(t) === 'client').length,
    assistantWillHandle: relevantThreads.filter(t => getChoice(t) === 'assistant').length,
  };

  const selectedThread = selectedThreadId ? threads.find(t => t.id === selectedThreadId) ?? null : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Attention Required</h1>
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Flag className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Attention Required</h1>
            <p className="text-muted-foreground text-sm">AI has identified {relevantThreads.length} emails that need your personal response</p>
          </div>
        </div>

        {/* Demo Mode Badge */}
        {demoMode && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Demo Mode Active</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Using rule-based analysis (not real AI). <a href="/dashboard/settings" className="underline">Add your API key</a> to enable real AI analysis.
              </p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="gap-1"
          >
            <Flag className="h-3.5 w-3.5" />
            All ({stats.total})
          </Button>
          <Button
            variant={filter === 'urgent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('urgent')}
            className="gap-1"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Urgent ({stats.urgent})
          </Button>
          <Button
            variant={filter === 'decision' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('decision')}
            className="gap-1"
          >
            <Target className="h-3.5 w-3.5" />
            Decisions ({stats.decisions})
          </Button>
          <Button
            variant={filter === 'meeting' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('meeting')}
            className="gap-1"
          >
            <Clock className="h-3.5 w-3.5" />
            Meetings ({stats.meetings})
          </Button>
        </div>
      </div>

      {/* AI Explanation */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">How this works</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                AI analyzes each email and determines which ones require your personal attention versus
                what your assistant can handle. Tap <strong>{'"'}I&apos;ll Reply{' "'}</strong> to take ownership, or
                <strong>{'"'}Assistant, Handle It{' "'}</strong> to delegate. Your choice syncs instantly with your assistant&apos;s view.
                {demoMode && <span className="text-yellow-600"> (Demo mode: rule-based, not real AI)</span>}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="border-blue-500 text-blue-700 dark:border-blue-500 dark:text-blue-400">
                  <User className="h-3 w-3 mr-1" />
                  Client Action
                </Badge>
                <Badge variant="secondary">
                  <Zap className="h-3 w-3 mr-1" />
                  High urgency = respond ASAP
                </Badge>
                <Badge variant="secondary">
                  <Target className="h-3 w-3 mr-1" />
                  Decisions need your input
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge variant="secondary" className="gap-1">
          <Flag className="h-3 w-3" />
          Pending: {stats.pending}
        </Badge>
        <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
          <User className="h-3 w-3" />
          I&apos;ll Reply: {stats.clientWillReply}
        </Badge>
        <Badge variant="outline" className="gap-1 border-blue-500 text-blue-700">
          <Users className="h-3 w-3" />
          Assistant: {stats.assistantWillHandle}
        </Badge>
      </div>

      {/* Threads List */}
      <Card className="border-gray-200 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails Requiring Your Response
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[70vh]">
            <div className="p-4 space-y-3">
              {filteredThreads.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">Nothing needs your attention</h3>
                  <p className="text-muted-foreground mb-4">All caught up! Your assistant is handling the rest.</p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={loadDemoInbox}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4" />
                    Load Demo Inbox
                  </Button>
                </div>
              ) : (
                filteredThreads.map((thread) => (
                  <ClientThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => setSelectedThreadId(thread.id)}
                    onResponderChoice={handleResponderChoice}
                    responderChoice={getChoice(thread)}
                    demoMode={demoMode}
                    draft={drafts[thread.id]}
                    generatingDraft={generatingDraft === thread.id}
                    onGenerateDraft={() => handleGenerateDraft(thread.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Thread Detail Modal */}
      {selectedThread && (
        <ClientThreadDetailModal
          thread={selectedThread}
          onClose={() => setSelectedThreadId(null)}
          onResponderChoice={handleResponderChoice}
          responderChoice={getChoice(selectedThread)}
          demoMode={demoMode}
          draft={drafts[selectedThread.id]}
          generatingDraft={generatingDraft === selectedThread.id}
          onGenerateDraft={() => handleGenerateDraft(selectedThread.id)}
        />
      )}
    </div>
  );
}

function ClientThreadCard({
  thread,
  onClick,
  onResponderChoice,
  responderChoice,
  demoMode,
  draft,
  generatingDraft,
  onGenerateDraft,
}: {
  thread: EmailThread;
  onClick: () => void;
  onResponderChoice: (threadId: string, choice: 'client' | 'assistant') => void;
  responderChoice: ResponderChoice;
  demoMode: boolean;
  draft?: { draft: string; subject?: string; confidence: number; reasoning: string; demoMode?: boolean };
  generatingDraft: boolean;
  onGenerateDraft: () => void;
}) {
  const { aiInsight, lastMessage, isImportant, subject } = thread;
  const labels = thread.labels ?? [];
  const actionItems = aiInsight?.actionItems ?? [];
  const urgency = aiInsight?.urgency || 'low';
  const category = aiInsight?.category || 'other';

  return (
    <div
      className={cn(
        'group relative p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer',
        getUrgencyStyles(urgency as 'high' | 'medium' | 'low')
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 break-words flex-1 min-w-0">
              {subject}
            </h3>
            {isImportant && (
              <span className="text-yellow-500" aria-label="Important">★</span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
            <span className="font-medium">{lastMessage.from.name}</span>
            <span>·</span>
            <span>{formatTime(lastMessage.timestamp)}</span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {lastMessage.body.slice(0, 150)}...
          </p>

          {/* AI Insight Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge
              variant="outline"
              className="gap-1 border-blue-500 text-blue-700 dark:border-blue-500 dark:text-blue-400"
            >
              <User className="h-3 w-3" />
              Your Action
            </Badge>

            <Badge
              variant={urgency === 'high' ? 'destructive' : urgency === 'medium' ? 'default' : 'outline'}
              className="gap-1"
            >
              <Zap className="h-3 w-3" />
              {urgency} urgency
            </Badge>

            {category !== 'other' && (
              <Badge variant="secondary" className="gap-1">
                <Target className="h-3 w-3" />
                {category.replace('-', ' ')}
              </Badge>
            )}

            {labels.map((label) => (
              <Badge key={label.id} variant="outline" className="text-xs" style={{ borderColor: label.color, color: label.color }}>
                {label.name}
              </Badge>
            ))}

            {/* Demo Mode Badge */}
            {demoMode && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                <Bot className="h-3 w-3 mr-1" />
                Demo
              </Badge>
            )}
          </div>

          {/* Action Items Preview */}
          {aiInsight && actionItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
              <p className="text-xs font-medium text-muted-foreground mb-2">Suggested actions for you:</p>
              <ul className="space-y-1">
                {actionItems.slice(0, 3).map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="truncate">{item}</span>
                  </li>
                ))}
                {actionItems.length > 3 && (
                  <li className="text-xs text-muted-foreground">+{actionItems.length - 3} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Who will respond */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className={cn(
                'w-full sm:flex-1 min-h-[44px] gap-2 justify-center',
                responderChoice === 'client'
                  ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:text-white'
                  : 'text-green-700 border-green-500 hover:bg-green-50'
              )}
              onClick={(e) => { e.stopPropagation(); onResponderChoice(thread.id, 'client'); }}
            >
              <User className="h-4 w-4 flex-shrink-0" />
              {responderChoice === 'client' ? "✓ I'll Reply" : "I'll Reply"}
            </Button>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:flex-1 min-h-[44px] gap-2 justify-center',
                responderChoice === 'assistant'
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                  : 'text-blue-700 border-blue-500 hover:bg-blue-50'
              )}
              onClick={(e) => { e.stopPropagation(); onResponderChoice(thread.id, 'assistant'); }}
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              {responderChoice === 'assistant' ? '✓ Assistant, Handle It' : 'Assistant, Handle It'}
            </Button>
          </div>

          {/* Draft Reply Preview */}
          {draft && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">AI Draft Reply</p>
                {draft.demoMode && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                    <Bot className="h-2.5 w-2.5 mr-0.5" />
                    Demo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200 line-clamp-3">{draft.draft}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-blue-600 dark:text-blue-400">Confidence: {draft.confidence}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(draft.draft); }}
                >
                  <Check className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          {generatingDraft && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Generating AI draft reply...
              </div>
            </div>
          )}

          {!draft && !generatingDraft && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full min-h-[40px] gap-1"
              onClick={(e) => { e.stopPropagation(); onGenerateDraft(); }}
            >
              <Bot className="h-3.5 w-3.5" />
              Generate AI Draft Reply
            </Button>
          )}
        </div>

        {/* Urgency Indicator (hidden on phones to save space) */}
        <div className="hidden sm:block flex-shrink-0 text-right">
          <div className={cn(
            'w-16 h-16 rounded-full flex flex-col items-center justify-center text-white font-bold',
            urgency === 'high' && 'bg-red-500',
            urgency === 'medium' && 'bg-orange-500',
            urgency === 'low' && 'bg-green-500'
          )}>
            <Zap className="h-5 w-5 mb-1" />
            <span className="text-xs">{urgency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientThreadDetailModal({
  thread,
  onClose,
  onResponderChoice,
  responderChoice,
  demoMode,
  draft,
  generatingDraft,
  onGenerateDraft,
}: {
  thread: EmailThread;
  onClose: () => void;
  onResponderChoice: (threadId: string, choice: 'client' | 'assistant') => void;
  responderChoice: ResponderChoice;
  demoMode: boolean;
  draft?: { draft: string; subject?: string; confidence: number; reasoning: string; demoMode?: boolean };
  generatingDraft: boolean;
  onGenerateDraft: () => void;
}) {
  const { aiInsight, lastMessage } = thread;
  const displayMessages = thread.messages?.length ? thread.messages : [lastMessage];
  const actionItems = aiInsight?.actionItems ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-xl">
          <h2 className="font-semibold">Email Details</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Demo Mode Banner */}
          {demoMode && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
              <Bot className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-800 dark:text-yellow-200">Demo mode: rule-based analysis, not real AI</span>
            </div>
          )}

          {/* AI Insight Banner */}
          {aiInsight && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">AI Analysis</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Confidence: {aiInsight.confidence}% · Recommended: {aiInsight.suggestedResponder}
                    {demoMode && <span className="text-yellow-600"> (Demo)</span>}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-blue-500">{aiInsight.importanceScore}</p>
                  <p className="text-xs text-muted-foreground">Importance</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold" style={{ color: getUrgencyColor(aiInsight.urgency as 'high' | 'medium' | 'low') }}>
                    {aiInsight.urgency.charAt(0).toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">Urgency</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-purple-500">{aiInsight.confidence}%</p>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                </div>
              </div>

              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3 break-words">{aiInsight.summary}</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3 break-words">{aiInsight.reasoning}</p>

              {actionItems.length > 0 && (
                <div>
                  <p className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">Suggested Actions:</p>
                  <ul className="space-y-1">
                    {actionItems.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                        <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Responder Choice */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
            <h3 className="font-medium mb-3">Who will respond?</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className={cn(
                  'w-full sm:flex-1 gap-2 py-3 h-auto justify-center',
                  responderChoice === 'client'
                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 hover:text-white'
                    : 'text-green-700 border-green-500 hover:bg-green-50'
                )}
                onClick={() => onResponderChoice(thread.id, 'client')}
              >
                <User className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">I&apos;ll Reply</p>
                  <p className={cn('text-xs', responderChoice === 'client' ? 'text-green-100' : 'text-muted-foreground')}>
                    I&apos;ll handle this personally
                  </p>
                </div>
              </Button>
              <Button
                variant="outline"
                className={cn(
                  'w-full sm:flex-1 gap-2 py-3 h-auto justify-center',
                  responderChoice === 'assistant'
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white'
                    : 'text-blue-700 border-blue-500 hover:bg-blue-50'
                )}
                onClick={() => onResponderChoice(thread.id, 'assistant')}
              >
                <Users className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium">Assistant, Handle It</p>
                  <p className={cn('text-xs', responderChoice === 'assistant' ? 'text-blue-100' : 'text-muted-foreground')}>
                    Delegate to my assistant
                  </p>
                </div>
              </Button>
            </div>
            {responderChoice !== 'pending' && (
              <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                ✓ Set to: {responderChoice === 'client' ? 'You will reply' : 'Assistant will handle'}
              </p>
            )}
          </div>

          {/* Draft Reply Section */}
          {draft && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">AI Draft Reply</h3>
                {draft.demoMode && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    <Bot className="h-3 w-3 mr-1" />
                    Demo
                  </Badge>
                )}
              </div>
              {draft.subject && <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Subject: {draft.subject}</p>}
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">{draft.draft}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-600 dark:text-blue-400">Confidence: {draft.confidence}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => navigator.clipboard.writeText(draft.draft)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          {generatingDraft && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Generating AI draft reply...</p>
            </div>
          )}

          {!draft && !generatingDraft && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={onGenerateDraft}
            >
              <Bot className="h-4 w-4" />
              Generate AI Draft Reply
            </Button>
          )}

          {/* Email Thread */}
          <div className="space-y-4">
            {displayMessages.map((message) => (
              <div key={message.id} className={cn(
                'rounded-xl p-4',
                message.from.isAssistant ? 'bg-gray-100 dark:bg-gray-800 ml-8' : 'bg-blue-50 dark:bg-blue-900/20 mr-8 border-l-4 border-blue-500'
              )}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="font-medium">
                    {message.from.isClient ? 'You' : message.from.isAssistant ? 'Assistant' : message.from.name}
                  </span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
              </div>
            ))}
          </div>

          {/* Quick Reply */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button className="w-full gap-2" onClick={() => { toast.success("Reply sent (demo)"); onClose(); }}>
              <Mail className="h-4 w-4" />
              Reply to this email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
