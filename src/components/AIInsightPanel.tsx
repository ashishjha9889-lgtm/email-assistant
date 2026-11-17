'use client';

import { AIInsight, EmailThread } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Zap,
  Brain,
  Users,
  User,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  TrendingUp,
  Lightbulb,
  Flag,
} from 'lucide-react';

interface AIInsightPanelProps {
  thread: EmailThread;
  className?: string;
}

const categoryIcons: Record<string, typeof Brain> = {
  meeting: Users,
  'follow-up': Flag,
  'decision-needed': Target,
  urgent: AlertTriangle,
  informational: Lightbulb,
  other: Brain,
};

const categoryLabels: Record<string, string> = {
  meeting: 'Meeting Request',
  'follow-up': 'Follow-up Needed',
  'decision-needed': 'Decision Required',
  urgent: 'Urgent',
  informational: 'Informational',
  other: 'Other',
};

export function AIInsightPanel({ thread, className }: AIInsightPanelProps) {
  const { aiInsight } = thread;
  
  if (!aiInsight) {
    return (
      <Card className={cn('bg-gray-50 dark:bg-gray-800/50', className)}>
        <CardContent className="py-6 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">AI analysis not available for this thread</p>
        </CardContent>
      </Card>
    );
  }

  const actionItems = aiInsight.actionItems ?? [];
  const CategoryIcon = categoryIcons[aiInsight.category] || Brain;
  const responderColors = {
    client: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    assistant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    either: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };

  const urgencyColors = {
    high: 'bg-red-500',
    medium: 'bg-orange-500',
    low: 'bg-green-500',
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Analysis
          </CardTitle>
          <Badge variant="outline" className={cn(responderColors[aiInsight.suggestedResponder])}>
            {aiInsight.suggestedResponder === 'client' && <User className="h-3 w-3 mr-1" />}
            {aiInsight.suggestedResponder === 'assistant' && <Users className="h-3 w-3 mr-1" />}
            {aiInsight.suggestedResponder === 'either' && <Users className="h-3 w-3 mr-1" />}
            {aiInsight.suggestedResponder.charAt(0).toUpperCase() + aiInsight.suggestedResponder.slice(1)} Action
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Importance Score */}
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Importance Score</span>
            <span className="font-bold text-primary">{aiInsight.importanceScore}/100</span>
          </div>
          <Progress value={aiInsight.importanceScore} className="h-2" />
        </div>

        {/* Urgency & Category */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 text-sm mb-1">
              <Zap className={cn('h-4 w-4', urgencyColors[aiInsight.urgency])} />
              <span className="font-medium capitalize">{aiInsight.urgency} Urgency</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {aiInsight.urgency === 'high' ? 'Immediate attention required' :
               aiInsight.urgency === 'medium' ? 'Address within 24 hours' :
               'Low priority, handle when convenient'}
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2 text-sm mb-1">
              <CategoryIcon className="h-4 w-4 text-primary" />
              <span className="font-medium">{categoryLabels[aiInsight.category] || aiInsight.category}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI-categorized based on content analysis
            </p>
          </div>
        </div>

        <Separator />

        {/* Summary */}
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
            <Lightbulb className="h-4 w-4 text-primary" />
            Summary
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
            {aiInsight.summary}
          </p>
        </div>

        {/* Reasoning */}
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
            <Brain className="h-4 w-4 text-primary" />
            AI Reasoning
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border-l-4 border-primary">
            {aiInsight.reasoning}
          </p>
        </div>

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3 flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Suggested Actions
            </h4>
            <div className="space-y-2">
              {actionItems.map((item, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left gap-2 hover:bg-green-50 dark:hover:bg-green-900/20',
                    'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                  )}
                  onClick={() => {
                    // In a real app, this would create a task or mark action as done
                    console.log('Action clicked:', item);
                  }}
                >
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <Separator />
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1"
            onClick={() => console.log('Accept AI suggestion')}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Accept Suggestion
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-1"
            onClick={() => console.log('Modify AI suggestion')}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Modify
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-1"
            onClick={() => console.log('Dismiss AI suggestion')}
          >
            <Flag className="h-3.5 w-3.5" />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}