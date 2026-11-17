import { getUserOrDemo } from '@/auth';
import { NextResponse } from 'next/server';
import { parseThreadToEmailThread } from '@/lib/gmail';
import { analyzeThread } from '@/lib/ai-service';
import { kvGet, KV_KEYS } from '@/lib/storage';

const DEMO_THREADS = [
  {
    id: 'sample-1',
    subject: '[URGENT] Board meeting tomorrow - decision needed',
    isImportant: true,
    isUnread: true,
    labels: [{ id: 'urgent', name: 'Urgent', color: '#ef4444' }],
    lastMessage: {
      id: 'msg-1',
      from: { email: 'ceo@company.com', name: 'CEO', isClient: false, isAssistant: false },
      body: 'We need your decision on the Q4 budget allocation by tomorrow 9 AM. Please review the attached proposal and confirm your approval.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      attachments: [],
    },
    messages: [],
    participants: [{ email: 'ceo@company.com', name: 'CEO', isClient: false, isAssistant: false }],
    aiInsight: {
      category: 'decision-needed',
      urgency: 'high',
      suggestedResponder: 'client',
      importanceScore: 95,
      reasoning: 'Urgent decision required from executive on budget allocation',
      actionItems: ['Review Q4 budget proposal', 'Approve or request changes', 'Communicate decision to finance team'],
      summary: 'CEO needs urgent budget decision by tomorrow 9 AM',
      confidence: 95,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
];

async function fetchDemoThread(id: string) {
  return DEMO_THREADS.find(t => t.id === id) || DEMO_THREADS[0];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, accessToken, isDemo } = await getUserOrDemo(request);
    const { id } = await params;

    if (isDemo) {
      const thread = await fetchDemoThread(id);
      return NextResponse.json({ thread });
    }

    if (!accessToken) {
      const thread = await fetchDemoThread(id);
      return NextResponse.json({ thread });
    }

    const fullThread = await fetchThread(accessToken!, id);
    const accountId = `gmail-${user.email}`;
    const clientEmail = user.email || '';
    
    const emailThread = parseThreadToEmailThread(fullThread, accountId);
    
    try {
      const insight = await analyzeThread({
        subject: emailThread.subject,
        messages: emailThread.messages,
        clientEmail,
      });
      emailThread.aiInsight = insight;
    } catch (aiError) {
      console.error('AI analysis failed for thread:', emailThread.id, aiError);
    }
    
    return NextResponse.json({ thread: emailThread });
  } catch (error) {
    console.error('Failed to fetch thread:', error);
    const { id } = await params;
    const thread = await fetchDemoThread(id);
    return NextResponse.json({ thread });
  }
}

async function fetchThread(accessToken: string, threadId: string) {
  const { google } = await import('googleapis');
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth });
  
  const response = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });
  
  return response.data;
}