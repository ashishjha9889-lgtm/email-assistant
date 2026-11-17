import { AIInsight } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return API_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

function getClientApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_ai_api_key');
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = getClientApiKey();
  if (apiKey) {
    headers['x-ai-api-key'] = apiKey;
  }
  return headers;
}

export async function analyzeEmail(params: {
  subject: string;
  body: string;
  fromEmail: string;
  isFromClient: boolean;
  threadContext?: Array<{ from: string; body: string; timestamp: string }>;
}): Promise<AIInsight> {
  const response = await fetch(`${getBaseUrl()}/api/ai/analyze`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'AI analysis failed');
  }

  const data = await response.json();
  return data.insight;
}

export async function analyzeThread(thread: {
  subject: string;
  messages: Array<{ from: { email: string; name: string; isClient: boolean; isAssistant: boolean }; body: string; timestamp: Date | string }>;
  clientEmail: string;
}): Promise<AIInsight> {
  const lastMessage = thread.messages[thread.messages.length - 1];
  if (!lastMessage) return getFallbackInsight();
  const isFromClient = lastMessage.from.isClient;

  const threadContext = thread.messages.slice(-5).map(m => ({
    from: m.from.email,
    body: m.body,
    timestamp: new Date(m.timestamp).toISOString(),
  }));

  return analyzeEmail({
    subject: thread.subject || '(no subject)',
    body: lastMessage.body || thread.subject || '(no content)',
    fromEmail: lastMessage.from.email,
    isFromClient,
    threadContext,
  });
}

export async function draftReply(params: {
  thread: {
    subject: string;
    messages: Array<{ from: { email: string; name: string; isClient: boolean; isAssistant: boolean }; body: string; timestamp: string }>;
  };
  responder: 'client' | 'assistant';
  context?: string;
}): Promise<{ draft: string; subject?: string; confidence: number; reasoning: string; demoMode?: boolean }> {
  const response = await fetch(`${getBaseUrl()}/api/ai/draft-reply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'AI draft failed');
  }

  const data = await response.json();
  return data.draft;
}

// Fallback for when AI is unavailable
export function getFallbackInsight(): AIInsight {
  return {
    category: 'other',
    urgency: 'low',
    suggestedResponder: 'either',
    importanceScore: 50,
    reasoning: 'AI analysis unavailable - using fallback',
    actionItems: ['Review manually'],
    summary: 'Requires manual review',
    confidence: 0,
  };
}
