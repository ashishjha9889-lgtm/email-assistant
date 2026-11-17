'use client';

import { useState } from 'react';
import { EmailThread, EmailMessage, EmailParticipant } from '@/types';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AIInsightPanel } from './AIInsightPanel';
import {
  ArrowLeft,
  Reply,
  ArrowRight,
  Star,
  Flag,
  MoreHorizontal,
  Download,
  Paperclip,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Send,
  X,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Brain,
} from 'lucide-react';
interface ThreadDetailProps {
  thread: EmailThread;
  onBack: () => void;
  onAction?: (action: string, thread: EmailThread) => void;
  responderChoice?: 'client' | 'assistant' | 'pending';
}

const formatTime = (date: Date | string) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = diff / (1000 * 60 * 60);
  
  if (hours < 1) {
    return formatDistanceToNow(d, { addSuffix: true });
  } else if (hours < 24) {
    return format(d, 'h:mm a');
  } else {
    return format(d, 'MMM d, yyyy h:mm a');
  }
};

const formatDate = (date: Date | string) => format(new Date(date), 'EEEE, MMMM d, yyyy');

export function ThreadDetail({ thread, onBack, onAction, responderChoice }: ThreadDetailProps) {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const messages = thread.messages?.length ? thread.messages : [thread.lastMessage];
  const participants = thread.participants ?? [];
  const labels = thread.labels ?? [];
  const { isImportant, isUnread, aiInsight, subject } = thread;
  const clientParticipant = participants.find(p => p.isClient);
  const assistantParticipant = participants.find(p => p.isAssistant);

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleSendReply = (messageId: string) => {
    if (replyText.trim()) {
      toast.success('Reply sent (demo)');
      setReplyTo(null);
      setReplyText('');
      // In a real app, this would send the email
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onBack} className="hidden lg:flex">
          <ArrowLeft className="h-5 w-5" />
          <span className="ml-1">Back</span>
        </Button>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate">{subject}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {labels.map((label) => (
              <Badge 
                key={label.id} 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: label.color, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
            {isImportant && (
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon" className="h-5 w-5 text-yellow-500 p-0" aria-label="Important" />}>
                  <Star className="h-4 w-4 fill-current" />
                </TooltipTrigger>
                <TooltipContent>Marked important</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => { const last = messages[messages.length - 1]; if (last) setReplyTo(last.id); onAction?.('reply', thread); }} />}>
              <Reply className="h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => { toast.success('Forwarded (demo)'); onAction?.('forward', thread); }} />}>
              <ArrowRight className="h-5 w-5" />
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => onAction?.('markImportant', thread)} />}>
              {isImportant ? <Star className="h-5 w-5 fill-current" /> : <Star className="h-5 w-5" />}
            </TooltipTrigger>
            <TooltipContent>{isImportant ? 'Remove from Important' : 'Mark Important'}</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More actions" />}>
                <MoreHorizontal className="h-5 w-5" />
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
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

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Messages List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                index={index}
                participants={participants}
                isExpanded={expandedMessages.has(message.id)}
                onToggleExpand={() => toggleExpanded(message.id)}
                onReply={() => setReplyTo(message.id)}
              />
            ))}

            {/* Reply Composer */}
            {replyTo && (
              <ReplyComposer
                threadId={thread.id}
                replyToMessageId={replyTo}
                participants={participants}
                text={replyText}
                onChange={setReplyText}
                onSend={handleSendReply}
                onCancel={() => setReplyTo(null)}
              />
            )}
          </div>
        </ScrollArea>

        {/* Responder Choice */}
        {responderChoice && responderChoice !== 'pending' && (
          <div className="hidden lg:block border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center gap-3 p-3 rounded-lg"
              style={{ backgroundColor: responderChoice === 'client' ? '#eff6ff' : '#f0fdf4' }}
            >
              <div className={cn('p-2 rounded-full', responderChoice === 'client' ? 'bg-blue-100' : 'bg-green-100')}>
                {responderChoice === 'client' ? (
                  <User className="h-5 w-5 text-blue-600" />
                ) : (
                  <Users className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {responderChoice === 'client' ? 'Client will reply' : 'Assistant will handle'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {responderChoice === 'client' 
                    ? 'The client has indicated they will personally respond to this email.' 
                    : 'The client has delegated this to you. Please handle it.'}
                </p>
              </div>
              <div className="ml-auto">
                <span className={cn('px-2 py-1 text-xs rounded-full', responderChoice === 'client' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>
                  {responderChoice === 'client' ? '✅ Client Action' : '🤖 Assistant Action'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AI Insight Panel - Sticky at bottom on mobile, sidebar on desktop */}
        <div className="hidden lg:block border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <AIInsightPanel thread={thread} />
        </div>
      </div>

      {/* Mobile AI Insight Sheet */}
      <div className="lg:hidden">
        <MobileAIInsightSheet thread={thread} responderChoice={responderChoice} />
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: EmailMessage;
  index: number;
  participants: EmailParticipant[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onReply: () => void;
}

function MessageBubble({ message, index, participants, isExpanded, onToggleExpand, onReply }: MessageBubbleProps) {
  const isFromClient = message.from.isClient;
  const to = message.to ?? [];
  const cc = message.cc ?? [];
  const attachments = message.attachments ?? [];
  const isFromAssistant = message.from.isAssistant;
  const isCurrentUser = isFromAssistant; // Assuming assistant is the current user

  const showFull = isExpanded || index === 0 || message.id === message.threadId + '-latest';

  return (
    <div className={cn(
      'relative',
      isCurrentUser ? 'flex justify-end' : 'flex justify-start'
    )}>
      <div className={cn(
        'max-w-[85%] w-full',
        isCurrentUser ? 'order-2' : 'order-1'
      )}>
        {/* Sender Info */}
        <div className={cn(
          'flex items-center gap-2 mb-1',
          isCurrentUser ? 'justify-end' : 'justify-start'
        )}>
          {!isCurrentUser && (
            <Avatar className="h-7 w-7">
              <AvatarImage src={message.from.avatar} alt={message.from.name} />
              <AvatarFallback className="text-xs">
                {message.from.isClient ? 'C' : message.from.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}
          <div className={cn('text-xs text-muted-foreground', isCurrentUser ? 'text-right' : '')}>
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {message.from.isClient ? 'Client' : message.from.isAssistant ? 'You' : message.from.name}
              </span>
              {message.from.isClient && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  <User className="h-2.5 w-2.5 mr-0.5" />
                  Client
                </Badge>
              )}
              {message.from.isAssistant && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  <Users className="h-2.5 w-2.5 mr-0.5" />
                  Assistant
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              <span>{formatTime(message.timestamp)}</span>
              {!message.isRead && !isCurrentUser && (
                <span className="text-primary">· Unread</span>
              )}
            </div>
          </div>
          {isCurrentUser && (
            <Avatar className="h-7 w-7">
              <AvatarImage src={message.from.avatar} alt={message.from.name} />
              <AvatarFallback className="text-xs">You</AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Message Content */}
        <div className={cn(
          'rounded-2xl px-4 py-3',
          isCurrentUser 
            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm'
        )}>
          <div className={cn(
            'whitespace-pre-wrap break-words',
            !showFull && 'line-clamp-3'
          )}>
            {message.body}
          </div>
          
          {!showFull && message.body.split('\n').length > 3 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 p-0 text-xs"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <span className="flex items-center gap-1">
                  <ChevronUp className="h-3.5 w-3.5" />
                  Show less
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  Show more
                  <ChevronDown className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          )}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-3 space-y-1">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 p-2 bg-white/20 dark:bg-black/20 rounded-lg">
                  <Paperclip className={cn('h-4 w-4 flex-shrink-0', isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium truncate">{att.name}</p>
                    <p className="text-xs opacity-70">{(att.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Recipients */}
          {(to.length > 0 || cc.length > 0) && (
            <div className="mt-2 pt-2 border-t border-white/20 dark:border-black/20 text-xs opacity-70">
              <div className="flex items-center gap-1 flex-wrap">
                <span>To:</span>
                {to.map((p: EmailParticipant, i: number) => (
                  <span key={p.email} className="font-medium">{p.name}{i < to.length - 1 ? ',' : ''}</span>
                ))}
              </div>
              {cc.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  <span>Cc:</span>
                  {cc.map((p: EmailParticipant, i: number) => (
                    <span key={p.email} className="font-medium">{p.name}{i < cc.length - 1 ? ',' : ''}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reply Button */}
        <div className={cn('mt-1 flex gap-1', isCurrentUser ? 'justify-end' : 'justify-start')}>
          {!isCurrentUser && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 h-7 px-2"
              onClick={onReply}
            >
              <Reply className="h-3.5 w-3.5" />
              <span className="text-xs">Reply</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReplyComposerProps {
  threadId: string;
  replyToMessageId: string;
  participants: EmailParticipant[];
  text: string;
  onChange: (text: string) => void;
  onSend: (messageId: string) => void;
  onCancel: () => void;
}

function ReplyComposer({ threadId, replyToMessageId, participants, text, onChange, onSend, onCancel }: ReplyComposerProps) {
  const clientParticipant = participants.find(p => p.isClient);
  const assistantParticipant = participants.find(p => p.isAssistant);
  const otherParticipants = participants.filter(p => !p.isClient && !p.isAssistant);

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback>You</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Label className="text-sm font-medium">Replying to</Label>
            <Badge variant="outline" className="text-xs">
              {clientParticipant?.name || 'Thread'}
            </Badge>
            {otherParticipants.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{otherParticipants.length} others
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={onCancel} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={text}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your reply..."
            className="min-h-[80px] resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Will send to: {clientParticipant?.name}</span>
              {otherParticipants.length > 0 && (
                <span>+ {otherParticipants.length} CC&apos;d</span>
              )}
            </div>
            <Button 
              onClick={() => onSend(replyToMessageId)}
              disabled={!text.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileAIInsightSheet({ thread, responderChoice }: { thread: EmailThread; responderChoice?: 'client' | 'assistant' | 'pending' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        className="w-full mt-4 gap-2 border-primary text-primary hover:bg-primary/10"
        onClick={() => setOpen(true)}
      >
        <Brain className="h-4 w-4" />
        View AI Analysis
      </Button>
      
      {/* This would be a Sheet component in a real implementation */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold">AI Analysis</h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              {responderChoice && responderChoice !== 'pending' && (
                <div className="mb-4 p-3 rounded-lg"
                  style={{ backgroundColor: responderChoice === 'client' ? '#eff6ff' : '#f0fdf4' }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-full', responderChoice === 'client' ? 'bg-blue-100' : 'bg-green-100')}>
                      {responderChoice === 'client' ? (
                        <User className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Users className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {responderChoice === 'client' ? 'Client will reply' : 'Assistant will handle'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {responderChoice === 'client' 
                          ? 'The client has indicated they will personally respond to this email.' 
                          : 'The client has delegated this to you. Please handle it.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <AIInsightPanel thread={thread} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}