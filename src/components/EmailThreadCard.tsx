'use client';

import { EmailThread, AIInsight } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Mail,
  Star,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Users,
  MoreHorizontal,
  Download,
  Reply,
  Flag,
  Trash2,
  Eye,
  EyeOff,
  Zap,
  Brain,
} from 'lucide-react';
interface EmailThreadCardProps {
  thread: EmailThread;
  onClick?: () => void;
  onAction?: (action: string, thread: EmailThread) => void;
  compact?: boolean;
  showAccount?: boolean;
  responderChoice?: 'client' | 'assistant' | 'pending';
}

const responderIcons = {
  client: User,
  assistant: Users,
  either: Users,
};

const responderLabels = {
  client: 'Client Action',
  assistant: 'Assistant Handle',
  either: 'Either',
};

const responderColors = {
  client: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  assistant: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  either: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const urgencyColors = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

export function EmailThreadCard({ 
  thread, 
  onClick, 
  onAction,
  compact = false,
  showAccount = false,
  responderChoice,
}: EmailThreadCardProps) {
  const { aiInsight, lastMessage, isImportant, isUnread } = thread;
  const labels = thread.labels ?? [];
  const participants = thread.participants ?? [];
  const attachments = lastMessage.attachments ?? [];
  const actionItems = aiInsight?.actionItems ?? [];
  const responder = aiInsight?.suggestedResponder || 'either';
  const urgency = aiInsight?.urgency || 'low';
  const ResponderIcon = responderIcons[responder];

  const clientParticipant = participants.find(p => p.isClient);
  const assistantParticipant = participants.find(p => p.isAssistant);
  const otherParticipants = participants.filter(p => !p.isClient && !p.isAssistant);

  const formatTime = (date: Date | string) => {
    // Simple format that doesn't rely on current time during prerender
    return format(new Date(date), 'MMM d, h:mm a');
  };

  const getSenderName = () => {
    if (lastMessage.from.isClient) return 'Client';
    if (lastMessage.from.isAssistant) return 'You';
    return lastMessage.from.name;
  };

  if (compact) {
    return (
      <div 
        className={cn(
          'group flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors cursor-pointer border border-transparent',
          isUnread && 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30',
          isImportant && 'border-yellow-200 dark:border-yellow-800'
        )}
        onClick={onClick}
      >
        <Avatar className="flex-shrink-0 w-10 h-10">
          <AvatarImage src={lastMessage.from.avatar} alt={lastMessage.from.name} className="w-full h-full object-cover" />
          <AvatarFallback className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {lastMessage.from.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium truncate', isUnread ? 'font-semibold' : '')}>
                {lastMessage.subject}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {getSenderName()}: {lastMessage.body.slice(0, 80)}...
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {aiInsight && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className={cn(
                      'px-2 py-0.5 text-xs rounded-full border',
                      urgencyColors[urgency]
                    )}>
                      <Zap className="h-2.5 w-2.5 mr-0.5" />
                      {urgency}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center">
                    <div className="space-y-1">
                      <p className="font-medium">{aiInsight.summary}</p>
                      <p className="text-xs text-muted-foreground">{aiInsight.reasoning}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTime(lastMessage.timestamp)}
              </span>
            </div>
          </div>
          
          {aiInsight && (
            <div className="mt-2 flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn('text-xs gap-1', responderColors[responder])}
              >
                <ResponderIcon className="h-3 w-3" />
                {responderLabels[responder]}
              </Badge>
              {aiInsight.category !== 'other' && (
                <Badge variant="secondary" className="text-xs">
                  {aiInsight.category.replace('-', ' ')}
                </Badge>
              )}
            </div>
          )}
          
          {/* Responder Choice (from client) */}
          {responderChoice && responderChoice !== 'pending' && (
            <div className="mt-2 flex items-center gap-2">
              <Badge 
                variant={responderChoice === 'client' ? 'default' : 'secondary'}
                className={cn('text-xs gap-1', responderChoice === 'client' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}
              >
                {responderChoice === 'client' ? (
                  <>
                    <User className="h-3 w-3" />
                    Client will reply
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" />
                    Assistant will handle
                  </>
                )}
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'group relative bg-white dark:bg-gray-900 rounded-xl border transition-all duration-200',
        isUnread 
          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 shadow-sm' 
          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md',
        isImportant && 'ring-1 ring-yellow-300 dark:ring-yellow-700'
      )}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Sender Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-10 w-10">
                <AvatarImage src={lastMessage.from.avatar} alt={lastMessage.from.name} />
                <AvatarFallback className="text-sm font-medium">
                  {lastMessage.from.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            {/* Subject & Sender */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn(
                  'text-base font-semibold truncate flex-1',
                  isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                )}>
                  {lastMessage.subject}
                </h3>
                {isImportant && (
                  <Tooltip>
                    <TooltipTrigger render={<Button variant="ghost" size="icon" className="text-yellow-500 h-6 w-6" aria-label="Marked important" />}>
                      <Star className="h-4 w-4 fill-current" />
                    </TooltipTrigger>
                    <TooltipContent>Marked as important</TooltipContent>
                  </Tooltip>
                )}
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-label="Unread" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                <span className="font-medium">{getSenderName()}</span>
                <span>·</span>
                <span>{formatTime(lastMessage.timestamp)}</span>
                {showAccount && (
                  <>
                    <span>·</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                      {thread.accountId}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* AI Insight Badges */}
          {aiInsight && (
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <Tooltip>
                <TooltipTrigger>
                  <Badge 
                    variant="outline" 
                    className={cn('gap-1.5', responderColors[responder])}
                  >
                    <ResponderIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{responderLabels[responder]}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" align="center" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{aiInsight.summary}</p>
                    <p className="text-xs text-muted-foreground">{aiInsight.reasoning}</p>
                    {actionItems.length > 0 && (
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {actionItems.map((item, i) => (
                          <li key={i} className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger>
                  <Badge 
                    variant="outline" 
                    className={cn('gap-1.5', urgencyColors[urgency])}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span className="capitalize">{urgency}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Urgency: {urgency}</p>
                  <p className="text-xs text-muted-foreground">Importance score: {aiInsight.importanceScore}/100</p>
                </TooltipContent>
              </Tooltip>

              {aiInsight.category !== 'other' && (
                <Badge variant="secondary" className="gap-1">
                  <Brain className="h-3 w-3" />
                  {aiInsight.category.replace('-', ' ')}
                </Badge>
              )}
              
              {/* Responder Choice (from client) */}
              {responderChoice && responderChoice !== 'pending' && (
                <Badge 
                  variant={responderChoice === 'client' ? 'default' : 'secondary'}
                  className={cn('gap-1.5', responderChoice === 'client' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}
                >
                  {responderChoice === 'client' ? (
                    <>
                      <User className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Client will reply</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Assistant will handle</span>
                    </>
                  )}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {clientParticipant && (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-gray-900 -ml-1 hover:ring-2 hover:ring-primary transition-colors" style={{ marginLeft: 0 }}>
                  <AvatarImage src={clientParticipant.avatar} alt={clientParticipant.name} />
                  <AvatarFallback className="text-xs">C</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{clientParticipant.name} (Client)</TooltipContent>
            </Tooltip>
          )}
          {assistantParticipant && (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-gray-900 -ml-1 hover:ring-2 hover:ring-primary transition-colors">
                  <AvatarImage src={assistantParticipant.avatar} alt={assistantParticipant.name} />
                  <AvatarFallback className="text-xs">A</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{assistantParticipant.name} (Assistant)</TooltipContent>
            </Tooltip>
          )}
          {otherParticipants.slice(0, 3).map((p, i) => (
            <Tooltip key={p.email}>
              <TooltipTrigger>
                <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-gray-900 -ml-1 hover:ring-2 hover:ring-primary transition-colors">
                  <AvatarImage src={p.avatar} alt={p.name} />
                  <AvatarFallback className="text-xs">{p.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{p.name}</TooltipContent>
            </Tooltip>
          ))}
          {otherParticipants.length > 3 && (
            <Tooltip>
              <TooltipTrigger>
                <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-gray-900 -ml-1 bg-gray-100 dark:bg-gray-800">
                  <AvatarFallback className="text-xs">+{otherParticipants.length - 3}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{otherParticipants.length - 3} more</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Preview */}
        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
          {lastMessage.body.slice(0, 200)}...
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Download className="h-3.5 w-3.5" />
            <span>{attachments.length} attachment{attachments.length > 1 ? 's' : ''}</span>
            {attachments.map((att) => (
              <span key={att.id} className="hidden sm:inline">
                {att.name} ({(att.size / 1024).toFixed(0)} KB)
              </span>
            ))}
          </div>
        )}

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {labels.map((label) => (
              <Badge 
                key={label.id} 
                variant="outline" 
                className="text-xs gap-1 h-5"
                style={{ borderColor: label.color, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Items Preview */}
        {aiInsight && actionItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-muted-foreground mb-2">Suggested actions:</p>
            <ul className="space-y-1">
              {actionItems.slice(0, 2).map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="truncate">{item}</span>
                </li>
              ))}
              {actionItems.length > 2 && (
                <li className="text-xs text-muted-foreground flex items-center gap-1">
                  <span>+{actionItems.length - 2} more actions</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onAction?.('reply', thread)}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.('forward', thread)}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Forward
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction?.('markImportant', thread)}>
              {isImportant ? (
                <>
                  <Star className="h-4 w-4 mr-2" />
                  Remove from Important
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2 fill-current" />
                  Mark Important
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.('markRead', thread)}>
              {isUnread ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Mark as Read
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Mark as Unread
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.('archive', thread)}>
              <Flag className="h-4 w-4 mr-2" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onAction?.('delete', thread)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}