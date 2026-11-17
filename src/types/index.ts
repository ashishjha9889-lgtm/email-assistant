export type EmailAccount = {
  id: string;
  email: string;
  name: string;
  provider: 'gmail' | 'outlook';
  connected: boolean;
  avatar?: string;
};

export type EmailThread = {
  id: string;
  accountId: string;
  subject: string;
  participants: EmailParticipant[];
  lastMessage: EmailMessage;
  messages: EmailMessage[];
  labels: EmailLabel[];
  isImportant: boolean;
  isUnread: boolean;
  aiInsight?: AIInsight;
  responderChoice?: ResponderChoice; // Who will actually respond
  createdAt: Date;
  updatedAt: Date;
};

export type EmailParticipant = {
  email: string;
  name: string;
  avatar?: string;
  isClient: boolean;
  isAssistant: boolean;
};

export type EmailMessage = {
  id: string;
  threadId: string;
  from: EmailParticipant;
  to: EmailParticipant[];
  cc: EmailParticipant[];
  subject: string;
  body: string;
  bodyHtml?: string;
  timestamp: Date;
  isRead: boolean;
  attachments?: EmailAttachment[];
};

export type EmailAttachment = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
};

export type EmailLabel = {
  id: string;
  name: string;
  color: string;
  type: 'system' | 'custom' | 'ai';
};

export type AIInsight = {
  importanceScore: number; // 0-100
  suggestedResponder: 'client' | 'assistant' | 'either';
  reasoning: string;
  actionItems: string[];
  summary: string;
  urgency: 'low' | 'medium' | 'high';
  category: 'meeting' | 'follow-up' | 'decision-needed' | 'informational' | 'urgent' | 'other';
  confidence?: number; // 0-100, optional for backward compatibility
};

export type ResponderChoice = 'client' | 'assistant' | 'pending';

export type ViewMode = 'assistant' | 'client';

export type UserRole = 'assistant' | 'client';

export type Client = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  accounts: EmailAccount[];
};