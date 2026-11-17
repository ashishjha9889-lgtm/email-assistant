'use client';

import { useState, useEffect } from 'react';
import { EmailThread } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { EmailThreadCard } from '@/components/EmailThreadCard';
import { ThreadDetail } from '@/components/ThreadDetail';
import { Loader2 } from 'lucide-react';
import {
  Brain,
  Zap,
  Users,
  User,
  Flag,
  Clock,
  Target,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  CheckCircle,
  ChevronLeft,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchThreads(): Promise<EmailThread[]> {
  const res = await fetch(`${API_URL}/api/threads`);
  if (!res.ok) throw new Error('Failed to fetch threads');
  const data = await res.json();
  return data.threads;
}

const categoryConfig = {
  meeting: { label: 'Meeting Request', icon: Users, color: 'bg-purple-500' },
  'follow-up': { label: 'Follow-up', icon: Flag, color: 'bg-yellow-500' },
  'decision-needed': { label: 'Decision Needed', icon: Target, color: 'bg-blue-500' },
  urgent: { label: 'Urgent', icon: AlertTriangle, color: 'bg-red-500' },
  informational: { label: 'Informational', icon: Lightbulb, color: 'bg-gray-500' },
  other: { label: 'Other', icon: Brain, color: 'bg-slate-500' },
};

const urgencyConfig = {
  high: { label: 'High', color: 'bg-red-500', text: 'text-red-500' },
  medium: { label: 'Medium', color: 'bg-orange-500', text: 'text-orange-500' },
  low: { label: 'Low', color: 'bg-green-500', text: 'text-green-500' },
};

const responderConfig = {
  client: { label: 'Client Action', icon: User, color: 'bg-blue-500' },
  assistant: { label: 'Assistant Handle', icon: Users, color: 'bg-green-500' },
  either: { label: 'Either', icon: Users, color: 'bg-purple-500' },
};

export default function InsightsPage() {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'urgency' | 'responder'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchThreads();
        setThreads(data);
      } catch (e) {
        setError('Failed to load insights data');
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const threadsWithAI = threads.filter(t => t.aiInsight);

  // Calculate stats
  const stats = {
    totalAnalyzed: threadsWithAI.length,
    avgImportance: threadsWithAI.length > 0 
      ? Math.round(threadsWithAI.reduce((sum, t) => sum + (t.aiInsight?.importanceScore || 0), 0) / threadsWithAI.length)
      : 0,
    highUrgency: threadsWithAI.filter(t => t.aiInsight?.urgency === 'high').length,
    clientActions: threadsWithAI.filter(t => t.aiInsight?.suggestedResponder === 'client').length,
    assistantActions: threadsWithAI.filter(t => t.aiInsight?.suggestedResponder === 'assistant').length,
    meetings: threadsWithAI.filter(t => t.aiInsight?.category === 'meeting').length,
  };

  const categoryCounts = threadsWithAI.reduce((acc, t) => {
    const cat = t.aiInsight?.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const urgencyCounts = threadsWithAI.reduce((acc, t) => {
    const urg = t.aiInsight?.urgency || 'low';
    acc[urg] = (acc[urg] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const responderCounts = threadsWithAI.reduce((acc, t) => {
    const resp = t.aiInsight?.suggestedResponder || 'either';
    acc[resp] = (acc[resp] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Insights
            </h1>
            <p className="text-muted-foreground mt-1">Loading insights...</p>
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Insights
            </h1>
          </div>
        </div>
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (selectedThread) {
    return (
      <ThreadDetail
        thread={selectedThread}
        onBack={() => setSelectedThread(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered analysis of your email threads</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            {stats.totalAnalyzed} threads analyzed
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard 
          label="Analyzed" 
          value={stats.totalAnalyzed} 
          icon={Brain} 
          color="text-primary" 
          bg="bg-primary/10" 
          trend="+12%"
        />
        <MetricCard 
          label="Avg Importance" 
          value={`${stats.avgImportance}/100`} 
          icon={TrendingUp} 
          color="text-green-500" 
          bg="bg-green-100 dark:bg-green-900/30" 
          trend="+5%"
        />
        <MetricCard 
          label="High Urgency" 
          value={stats.highUrgency} 
          icon={AlertTriangle} 
          color="text-red-500" 
          bg="bg-red-100 dark:bg-red-900/30" 
          trend="-2"
        />
        <MetricCard 
          label="Client Actions" 
          value={stats.clientActions} 
          icon={User} 
          color="text-blue-500" 
          bg="bg-blue-100 dark:bg-blue-900/30" 
          trend="+3"
        />
        <MetricCard 
          label="Assistant Tasks" 
          value={stats.assistantActions} 
          icon={Users} 
          color="text-green-500" 
          bg="bg-green-100 dark:bg-green-900/30" 
          trend="+8"
        />
        <MetricCard 
          label="Meetings" 
          value={stats.meetings} 
          icon={Clock} 
          color="text-purple-500" 
          bg="bg-purple-100 dark:bg-purple-900/30" 
          trend="+2"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="urgency">Urgency</TabsTrigger>
          <TabsTrigger value="responder">Responder</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const count = categoryCounts[key] || 0;
                  const percentage = stats.totalAnalyzed > 0 ? Math.round((count / stats.totalAnalyzed) * 100) : 0;
                  const Icon = config.icon;
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.color + '20' }}>
                        <Icon className="h-5 w-5" style={{ color: config.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{config.label}</span>
                          <span className="text-muted-foreground">{count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Urgency Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Urgency Levels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(urgencyConfig).map(([key, config]) => {
                  const count = urgencyCounts[key] || 0;
                  const percentage = stats.totalAnalyzed > 0 ? Math.round((count / stats.totalAnalyzed) * 100) : 0;
                  return (
                    <div key={key} className="text-center p-4 rounded-lg" style={{ backgroundColor: config.color + '10' }}>
                      <div className="text-3xl font-bold" style={{ color: config.color }}>{count}</div>
                      <div className="text-sm text-muted-foreground">{config.label} Urgency</div>
                      <div className="text-xs mt-1" style={{ color: config.color }}>{percentage}% of threads</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Responder Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Suggested Responder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(responderConfig).map(([key, config]) => {
                  const count = responderCounts[key] || 0;
                  const percentage = stats.totalAnalyzed > 0 ? Math.round((count / stats.totalAnalyzed) * 100) : 0;
                  const Icon = config.icon;
                  return (
                    <div key={key} className="text-center p-4 rounded-lg" style={{ backgroundColor: config.color + '10' }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: config.color + '20' }}>
                        <Icon className="h-6 w-6" style={{ color: config.color }} />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                      <div className="text-sm text-muted-foreground">{config.label}</div>
                      <div className="text-xs mt-1" style={{ color: config.color }}>{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-3">
              {threadsWithAI
                .sort((a, b) => (b.aiInsight?.importanceScore || 0) - (a.aiInsight?.importanceScore || 0))
                .map((thread) => (
                  <EmailThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => setSelectedThread(thread)}
                    compact
                  />
                ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="urgency" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(urgencyConfig).map(([key, config]) => {
              const filtered = threadsWithAI.filter(t => t.aiInsight?.urgency === key);
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.color + '20' }}>
                        <Zap className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      {config.label} Urgency ({filtered.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {filtered.map((thread) => (
                          <EmailThreadCard
                            key={thread.id}
                            thread={thread}
                            onClick={() => setSelectedThread(thread)}
                            compact
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="responder" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(responderConfig).map(([key, config]) => {
              const filtered = threadsWithAI.filter(t => t.aiInsight?.suggestedResponder === key);
              const Icon = config.icon;
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.color + '20' }}>
                        <Icon className="h-4 w-4" style={{ color: config.color }} />
                      </div>
                      {config.label} ({filtered.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {filtered.map((thread) => (
                          <EmailThreadCard
                            key={thread.id}
                            thread={thread}
                            onClick={() => setSelectedThread(thread)}
                            compact
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, bg, trend }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  trend: string;
}) {
  const isPositive = trend.startsWith('+') && !trend.includes('-');
  const isNegative = trend.startsWith('-');
  
  return (
    <Card className="border-gray-200 dark:border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
          <div className={cn('p-3 rounded-xl', bg)}>
            <Icon className={cn('h-6 w-6', color)} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1">
          <span className={cn('text-xs font-medium', isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground')}>
            {trend}
          </span>
          <span className="text-xs text-muted-foreground">vs last week</span>
        </div>
      </CardContent>
    </Card>
  );
}