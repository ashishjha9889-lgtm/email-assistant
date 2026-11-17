import { getUserOrDemo } from '@/auth';
import { NextResponse } from 'next/server';
import { fetchThreads, parseThreadToEmailThread } from '@/lib/gmail';
import { analyzeThread } from '@/lib/ai-service';
import { kvGet, kvSet, KV_KEYS } from '@/lib/storage';

const NOW = Date.now();
const HOUR = 60 * 60 * 1000;

const DEMO_THREADS = [
  {
    id: 'sample-1',
    subject: '[URGENT] Board meeting tomorrow - decision needed',
    isImportant: true,
    isUnread: true,
    labels: [{ id: 'urgent', name: 'Urgent', color: '#ef4444' }],
    lastMessage: {
      id: 'msg-1c',
      from: { email: 'ceo@company.com', name: 'CEO', isClient: false, isAssistant: false },
      body: 'We need your decision on the Q4 budget allocation by tomorrow 9 AM. Please review the attached proposal and confirm your approval.',
      timestamp: new Date(NOW - 2 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-1a',
        from: { email: 'cfo@company.com', name: 'CFO', isClient: false, isAssistant: false },
        body: 'Attaching the final Q4 budget proposal for the board. Finance has signed off on the numbers.',
        timestamp: new Date(NOW - 20 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-1b',
        from: { email: 'ceo@company.com', name: 'CEO', isClient: false, isAssistant: false },
        body: 'Thanks. The board will want a clear yes or no on the allocation before the meeting.',
        timestamp: new Date(NOW - 8 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-1c',
        from: { email: 'ceo@company.com', name: 'CEO', isClient: false, isAssistant: false },
        body: 'We need your decision on the Q4 budget allocation by tomorrow 9 AM. Please review the attached proposal and confirm your approval.',
        timestamp: new Date(NOW - 2 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [
      { email: 'ceo@company.com', name: 'CEO', isClient: false, isAssistant: false },
      { email: 'cfo@company.com', name: 'CFO', isClient: false, isAssistant: false },
    ],
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
  {
    id: 'sample-2',
    subject: 'Meeting: Quarterly Review with Investors',
    isImportant: true,
    isUnread: true,
    labels: [{ id: 'meeting', name: 'Meeting', color: '#8b5cf6' }],
    lastMessage: {
      id: 'msg-2b',
      from: { email: 'investor.relations@company.com', name: 'Investor Relations', isClient: false, isAssistant: false },
      body: 'Please confirm your availability for the quarterly review meeting with our Series B investors next Tuesday at 2 PM.',
      timestamp: new Date(NOW - 4 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-2a',
        from: { email: 'investor.relations@company.com', name: 'Investor Relations', isClient: false, isAssistant: false },
        body: 'Our Series B investors have asked for a quarterly review. Would next Tuesday work?',
        timestamp: new Date(NOW - 28 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-2b',
        from: { email: 'investor.relations@company.com', name: 'Investor Relations', isClient: false, isAssistant: false },
        body: 'Please confirm your availability for the quarterly review meeting with our Series B investors next Tuesday at 2 PM.',
        timestamp: new Date(NOW - 4 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [{ email: 'investor.relations@company.com', name: 'Investor Relations', isClient: false, isAssistant: false }],
    aiInsight: {
      category: 'meeting',
      urgency: 'medium',
      suggestedResponder: 'assistant',
      importanceScore: 75,
      reasoning: 'Meeting scheduling request that assistant can coordinate',
      actionItems: ['Check calendar for Tuesday 2 PM', 'Propose alternative times if needed', 'Send calendar invite'],
      summary: 'Investor quarterly review meeting scheduling request',
      confidence: 85,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-3',
    subject: 'Follow-up: Contract renewal with Acme Corp',
    isImportant: false,
    isUnread: true,
    labels: [{ id: 'followup', name: 'Follow-up', color: '#eab308' }],
    lastMessage: {
      id: 'msg-3c',
      from: { email: 'legal@acme.com', name: 'Legal Team', isClient: false, isAssistant: false },
      body: 'Following up on the contract renewal discussion. We need your signature on the updated agreement by Friday.',
      timestamp: new Date(NOW - 6 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-3a',
        from: { email: 'legal@acme.com', name: 'Legal Team', isClient: false, isAssistant: false },
        body: 'Sending over the updated renewal agreement with the revised payment terms.',
        timestamp: new Date(NOW - 72 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-3b',
        from: { email: 'account.manager@acme.com', name: 'Acme Account Manager', isClient: false, isAssistant: false },
        body: 'Just checking that the agreement reached you. Happy to walk through any of the changes.',
        timestamp: new Date(NOW - 36 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-3c',
        from: { email: 'legal@acme.com', name: 'Legal Team', isClient: false, isAssistant: false },
        body: 'Following up on the contract renewal discussion. We need your signature on the updated agreement by Friday.',
        timestamp: new Date(NOW - 6 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [
      { email: 'legal@acme.com', name: 'Legal Team', isClient: false, isAssistant: false },
      { email: 'account.manager@acme.com', name: 'Acme Account Manager', isClient: false, isAssistant: false },
    ],
    aiInsight: {
      category: 'follow-up',
      urgency: 'medium',
      suggestedResponder: 'client',
      importanceScore: 70,
      reasoning: 'Contract renewal requires executive signature',
      actionItems: ['Review updated contract', 'Sign and return by Friday', 'File executed copy'],
      summary: 'Contract renewal with Acme Corp needs signature by Friday',
      confidence: 80,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-4',
    subject: 'FYI: Company-wide policy update',
    isImportant: false,
    isUnread: false,
    labels: [{ id: 'informational', name: 'FYI', color: '#6b7280' }],
    lastMessage: {
      id: 'msg-4b',
      from: { email: 'hr@company.com', name: 'HR Department', isClient: false, isAssistant: false },
      body: 'Please review the updated remote work policy attached. No action required.',
      timestamp: new Date(NOW - 24 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-4a',
        from: { email: 'hr@company.com', name: 'HR Department', isClient: false, isAssistant: false },
        body: 'Heads up: an updated remote work policy will be shared with all staff tomorrow.',
        timestamp: new Date(NOW - 48 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-4b',
        from: { email: 'hr@company.com', name: 'HR Department', isClient: false, isAssistant: false },
        body: 'Please review the updated remote work policy attached. No action required.',
        timestamp: new Date(NOW - 24 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [{ email: 'hr@company.com', name: 'HR Department', isClient: false, isAssistant: false }],
    aiInsight: {
      category: 'informational',
      urgency: 'low',
      suggestedResponder: 'assistant',
      importanceScore: 30,
      reasoning: 'Informational update, no action required',
      actionItems: ['File for reference'],
      summary: 'Company policy update - FYI only',
      confidence: 90,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-5',
    subject: '[DECISION] Choose new vendor for cloud infrastructure',
    isImportant: true,
    isUnread: true,
    labels: [{ id: 'decision', name: 'Decision', color: '#3b82f6' }],
    lastMessage: {
      id: 'msg-5c',
      from: { email: 'cto@company.com', name: 'CTO', isClient: false, isAssistant: false },
      body: 'We have three vendor proposals for the cloud migration. Please review and select your preferred option by EOD Wednesday.',
      timestamp: new Date(NOW - 12 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-5a',
        from: { email: 'cto@company.com', name: 'CTO', isClient: false, isAssistant: false },
        body: 'The engineering team has finished evaluating cloud vendors. Summary doc coming shortly.',
        timestamp: new Date(NOW - 50 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-5b',
        from: { email: 'infra.lead@company.com', name: 'Infrastructure Lead', isClient: false, isAssistant: false },
        body: 'Option B is the cheapest, but Option C has the strongest uptime guarantees. Details are in the comparison sheet.',
        timestamp: new Date(NOW - 30 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-5c',
        from: { email: 'cto@company.com', name: 'CTO', isClient: false, isAssistant: false },
        body: 'We have three vendor proposals for the cloud migration. Please review and select your preferred option by EOD Wednesday.',
        timestamp: new Date(NOW - 12 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [
      { email: 'cto@company.com', name: 'CTO', isClient: false, isAssistant: false },
      { email: 'infra.lead@company.com', name: 'Infrastructure Lead', isClient: false, isAssistant: false },
    ],
    aiInsight: {
      category: 'decision-needed',
      urgency: 'high',
      suggestedResponder: 'client',
      importanceScore: 90,
      reasoning: 'Strategic vendor selection requires executive decision',
      actionItems: ['Review all three vendor proposals', 'Compare pricing and features', 'Select preferred vendor by Wednesday EOD'],
      summary: 'CTO needs vendor selection decision by Wednesday EOD',
      confidence: 92,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-6',
    subject: '[URGENT] Production outage affecting enterprise customers',
    isImportant: true,
    isUnread: true,
    labels: [{ id: 'urgent', name: 'Urgent', color: '#ef4444' }],
    lastMessage: {
      id: 'msg-6c',
      from: { email: 'vp.engineering@company.com', name: 'VP Engineering', isClient: false, isAssistant: false },
      body: 'Service is partially restored, but three enterprise customers are asking for a statement. Do you want to approve the customer communication before we send it?',
      timestamp: new Date(NOW - 1 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-6a',
        from: { email: 'oncall@company.com', name: 'On-call Engineer', isClient: false, isAssistant: false },
        body: 'We are seeing elevated error rates on the API. Investigating now.',
        timestamp: new Date(NOW - 3 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-6b',
        from: { email: 'vp.engineering@company.com', name: 'VP Engineering', isClient: false, isAssistant: false },
        body: 'Root cause identified as a bad database migration. Rolling back now.',
        timestamp: new Date(NOW - 2 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-6c',
        from: { email: 'vp.engineering@company.com', name: 'VP Engineering', isClient: false, isAssistant: false },
        body: 'Service is partially restored, but three enterprise customers are asking for a statement. Do you want to approve the customer communication before we send it?',
        timestamp: new Date(NOW - 1 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [
      { email: 'vp.engineering@company.com', name: 'VP Engineering', isClient: false, isAssistant: false },
      { email: 'oncall@company.com', name: 'On-call Engineer', isClient: false, isAssistant: false },
    ],
    aiInsight: {
      category: 'decision-needed',
      urgency: 'high',
      suggestedResponder: 'client',
      importanceScore: 97,
      reasoning: 'Customer-facing incident communication needs executive approval',
      actionItems: ['Review draft customer statement', 'Approve or edit messaging', 'Call the affected enterprise customers'],
      summary: 'Outage is partially resolved; customer statement awaiting your approval',
      confidence: 94,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-7',
    subject: '[URGENT] Press inquiry - reporter deadline today at 5 PM',
    isImportant: true,
    isUnread: true,
    labels: [{ id: 'urgent', name: 'Urgent', color: '#ef4444' }],
    lastMessage: {
      id: 'msg-7b',
      from: { email: 'comms@company.com', name: 'Communications Lead', isClient: false, isAssistant: false },
      body: 'The reporter needs a response by 5 PM today. I have drafted a short statement for your approval.',
      timestamp: new Date(NOW - 3 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-7a',
        from: { email: 'reporter@techdaily.com', name: 'Jordan Lee (TechDaily)', isClient: false, isAssistant: false },
        body: 'We are publishing a piece on industry layoffs tonight. Would the company like to comment on its hiring outlook?',
        timestamp: new Date(NOW - 5 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-7b',
        from: { email: 'comms@company.com', name: 'Communications Lead', isClient: false, isAssistant: false },
        body: 'The reporter needs a response by 5 PM today. I have drafted a short statement for your approval.',
        timestamp: new Date(NOW - 3 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [
      { email: 'comms@company.com', name: 'Communications Lead', isClient: false, isAssistant: false },
      { email: 'reporter@techdaily.com', name: 'Jordan Lee (TechDaily)', isClient: false, isAssistant: false },
    ],
    aiInsight: {
      category: 'decision-needed',
      urgency: 'high',
      suggestedResponder: 'client',
      importanceScore: 88,
      reasoning: 'Public statement with a same-day deadline needs executive sign-off',
      actionItems: ['Review the drafted statement', 'Approve or revise before 5 PM', 'Confirm with Communications Lead'],
      summary: 'Reporter deadline at 5 PM; draft statement awaiting approval',
      confidence: 90,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-8',
    subject: 'Reschedule: 1:1 with Head of Product',
    isImportant: false,
    isUnread: true,
    labels: [{ id: 'meeting', name: 'Meeting', color: '#8b5cf6' }],
    lastMessage: {
      id: 'msg-8b',
      from: { email: 'head.product@company.com', name: 'Head of Product', isClient: false, isAssistant: false },
      body: 'Could we move our Thursday 1:1 to Friday morning? Anything between 9 and 11 works for me.',
      timestamp: new Date(NOW - 5 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-8a',
        from: { email: 'head.product@company.com', name: 'Head of Product', isClient: false, isAssistant: false },
        body: 'I have a conflict with the customer advisory board on Thursday afternoon.',
        timestamp: new Date(NOW - 9 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-8b',
        from: { email: 'head.product@company.com', name: 'Head of Product', isClient: false, isAssistant: false },
        body: 'Could we move our Thursday 1:1 to Friday morning? Anything between 9 and 11 works for me.',
        timestamp: new Date(NOW - 5 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [{ email: 'head.product@company.com', name: 'Head of Product', isClient: false, isAssistant: false }],
    aiInsight: {
      category: 'meeting',
      urgency: 'low',
      suggestedResponder: 'assistant',
      importanceScore: 45,
      reasoning: 'Routine reschedule that the assistant can handle from the calendar',
      actionItems: ['Check Friday 9-11 AM availability', 'Move the 1:1 and send updated invite'],
      summary: 'Head of Product wants to move Thursday 1:1 to Friday morning',
      confidence: 88,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-9',
    subject: 'Leadership offsite: agenda and venue confirmation',
    isImportant: false,
    isUnread: true,
    labels: [{ id: 'meeting', name: 'Meeting', color: '#8b5cf6' }],
    lastMessage: {
      id: 'msg-9c',
      from: { email: 'chief.of.staff@company.com', name: 'Chief of Staff', isClient: false, isAssistant: false },
      body: 'The venue needs a final headcount by Monday. Please confirm attendance and any items you want added to the agenda.',
      timestamp: new Date(NOW - 10 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-9a',
        from: { email: 'chief.of.staff@company.com', name: 'Chief of Staff', isClient: false, isAssistant: false },
        body: 'Draft agenda for the leadership offsite is ready. Two venue options are in the doc.',
        timestamp: new Date(NOW - 60 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-9b',
        from: { email: 'events@company.com', name: 'Events Coordinator', isClient: false, isAssistant: false },
        body: 'We have placed a hold on the lakeside venue through the end of the week.',
        timestamp: new Date(NOW - 34 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-9c',
        from: { email: 'chief.of.staff@company.com', name: 'Chief of Staff', isClient: false, isAssistant: false },
        body: 'The venue needs a final headcount by Monday. Please confirm attendance and any items you want added to the agenda.',
        timestamp: new Date(NOW - 10 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [
      { email: 'chief.of.staff@company.com', name: 'Chief of Staff', isClient: false, isAssistant: false },
      { email: 'events@company.com', name: 'Events Coordinator', isClient: false, isAssistant: false },
    ],
    aiInsight: {
      category: 'meeting',
      urgency: 'medium',
      suggestedResponder: 'assistant',
      importanceScore: 55,
      reasoning: 'Offsite logistics can be coordinated by the assistant, with agenda input from the executive',
      actionItems: ['Confirm attendance by Monday', 'Block offsite dates on the calendar', 'Send agenda suggestions'],
      summary: 'Offsite venue hold needs headcount confirmation by Monday',
      confidence: 82,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-10',
    subject: '[DECISION] Approve Q1 hiring plan: 2 engineers, 1 designer',
    isImportant: true,
    isUnread: true,
    labels: [{ id: 'decision', name: 'Decision', color: '#3b82f6' }],
    lastMessage: {
      id: 'msg-10c',
      from: { email: 'head.people@company.com', name: 'Head of People', isClient: false, isAssistant: false },
      body: 'Recruiting needs a go or no-go on the Q1 headcount by Thursday so we can open the roles.',
      timestamp: new Date(NOW - 14 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-10a',
        from: { email: 'cto@company.com', name: 'CTO', isClient: false, isAssistant: false },
        body: 'We are stretched on the platform team. I am requesting two engineers and one designer for Q1.',
        timestamp: new Date(NOW - 40 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-10b',
        from: { email: 'cfo@company.com', name: 'CFO', isClient: false, isAssistant: false },
        body: 'The three hires fit within the Q1 budget if we hold the marketing backfill. Final call is yours.',
        timestamp: new Date(NOW - 26 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-10c',
        from: { email: 'head.people@company.com', name: 'Head of People', isClient: false, isAssistant: false },
        body: 'Recruiting needs a go or no-go on the Q1 headcount by Thursday so we can open the roles.',
        timestamp: new Date(NOW - 14 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [
      { email: 'head.people@company.com', name: 'Head of People', isClient: false, isAssistant: false },
      { email: 'cto@company.com', name: 'CTO', isClient: false, isAssistant: false },
      { email: 'cfo@company.com', name: 'CFO', isClient: false, isAssistant: false },
    ],
    aiInsight: {
      category: 'decision-needed',
      urgency: 'medium',
      suggestedResponder: 'client',
      importanceScore: 78,
      reasoning: 'Headcount approval is an executive budget decision',
      actionItems: ['Review hiring plan and budget impact', 'Approve, reduce, or defer headcount', 'Notify Head of People by Thursday'],
      summary: 'Q1 hiring plan for 3 roles needs approval by Thursday',
      confidence: 87,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-11',
    subject: '[DECISION] Proposed price increase for Enterprise tier',
    isImportant: true,
    isUnread: false,
    labels: [{ id: 'decision', name: 'Decision', color: '#3b82f6' }],
    lastMessage: {
      id: 'msg-11b',
      from: { email: 'cro@company.com', name: 'Chief Revenue Officer', isClient: false, isAssistant: false },
      body: 'Sales is comfortable with a 12% increase if we grandfather existing customers for six months. Need your decision before the pricing page update next week.',
      timestamp: new Date(NOW - 30 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-11a',
        from: { email: 'head.product@company.com', name: 'Head of Product', isClient: false, isAssistant: false },
        body: 'Usage data supports raising Enterprise pricing by 10-15%. Churn risk looks low for accounts above 200 seats.',
        timestamp: new Date(NOW - 54 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-11b',
        from: { email: 'cro@company.com', name: 'Chief Revenue Officer', isClient: false, isAssistant: false },
        body: 'Sales is comfortable with a 12% increase if we grandfather existing customers for six months. Need your decision before the pricing page update next week.',
        timestamp: new Date(NOW - 30 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [
      { email: 'cro@company.com', name: 'Chief Revenue Officer', isClient: false, isAssistant: false },
      { email: 'head.product@company.com', name: 'Head of Product', isClient: false, isAssistant: false },
    ],
    aiInsight: {
      category: 'decision-needed',
      urgency: 'medium',
      suggestedResponder: 'client',
      importanceScore: 80,
      reasoning: 'Pricing changes affect revenue and customer relationships and need executive approval',
      actionItems: ['Review usage and churn analysis', 'Decide on increase and grandfathering period', 'Confirm with CRO before pricing page update'],
      summary: 'CRO and Product recommend a 12% Enterprise price increase; decision needed',
      confidence: 86,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-12',
    subject: 'Following up: partnership proposal from Northwind',
    isImportant: false,
    isUnread: true,
    labels: [{ id: 'followup', name: 'Follow-up', color: '#eab308' }],
    lastMessage: {
      id: 'msg-12c',
      from: { email: 'partnerships@northwind.com', name: 'Northwind Partnerships', isClient: false, isAssistant: false },
      body: 'Circling back one more time on our co-marketing proposal. Even a quick call next week would help us plan our roadmap.',
      timestamp: new Date(NOW - 18 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-12a',
        from: { email: 'partnerships@northwind.com', name: 'Northwind Partnerships', isClient: false, isAssistant: false },
        body: 'Attached is our co-marketing partnership proposal for the second half of the year.',
        timestamp: new Date(NOW - 120 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-12b',
        from: { email: 'partnerships@northwind.com', name: 'Northwind Partnerships', isClient: false, isAssistant: false },
        body: 'Wanted to make sure the proposal did not get buried. Happy to answer questions.',
        timestamp: new Date(NOW - 72 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-12c',
        from: { email: 'partnerships@northwind.com', name: 'Northwind Partnerships', isClient: false, isAssistant: false },
        body: 'Circling back one more time on our co-marketing proposal. Even a quick call next week would help us plan our roadmap.',
        timestamp: new Date(NOW - 18 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [{ email: 'partnerships@northwind.com', name: 'Northwind Partnerships', isClient: false, isAssistant: false }],
    aiInsight: {
      category: 'follow-up',
      urgency: 'low',
      suggestedResponder: 'assistant',
      importanceScore: 50,
      reasoning: 'Third outreach with no reply; a short holding response or call booking is appropriate',
      actionItems: ['Decide whether to pursue the partnership', 'Reply with interest or a polite decline', 'Schedule an intro call if interested'],
      summary: 'Northwind has followed up three times on a co-marketing proposal',
      confidence: 81,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-13',
    subject: 'Follow-up: Invoice #4821 is 15 days overdue',
    isImportant: false,
    isUnread: true,
    labels: [{ id: 'followup', name: 'Follow-up', color: '#eab308' }],
    lastMessage: {
      id: 'msg-13b',
      from: { email: 'ar@designstudio.com', name: 'Design Studio Accounts', isClient: false, isAssistant: false },
      body: 'Invoice #4821 for $12,400 is now 15 days past due. Please let us know when payment will be released.',
      timestamp: new Date(NOW - 22 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-13a',
        from: { email: 'ar@designstudio.com', name: 'Design Studio Accounts', isClient: false, isAssistant: false },
        body: 'Friendly reminder that invoice #4821 for $12,400 was due on the 1st.',
        timestamp: new Date(NOW - 168 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-13b',
        from: { email: 'ar@designstudio.com', name: 'Design Studio Accounts', isClient: false, isAssistant: false },
        body: 'Invoice #4821 for $12,400 is now 15 days past due. Please let us know when payment will be released.',
        timestamp: new Date(NOW - 22 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [{ email: 'ar@designstudio.com', name: 'Design Studio Accounts', isClient: false, isAssistant: false }],
    aiInsight: {
      category: 'follow-up',
      urgency: 'medium',
      suggestedResponder: 'assistant',
      importanceScore: 58,
      reasoning: 'Overdue vendor invoice can be resolved by the assistant coordinating with finance',
      actionItems: ['Check payment status with Finance', 'Reply to vendor with expected payment date'],
      summary: 'Design Studio invoice #4821 ($12,400) is 15 days overdue',
      confidence: 89,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-14',
    subject: 'FYI: Weekly engineering digest',
    isImportant: false,
    isUnread: false,
    labels: [{ id: 'informational', name: 'FYI', color: '#6b7280' }],
    lastMessage: {
      id: 'msg-14b',
      from: { email: 'eng.manager@company.com', name: 'Engineering Manager', isClient: false, isAssistant: false },
      body: 'This week: shipped the new onboarding flow, reduced p95 latency by 18%, and closed 42 bugs. Full notes attached. No action needed.',
      timestamp: new Date(NOW - 36 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-14a',
        from: { email: 'eng.manager@company.com', name: 'Engineering Manager', isClient: false, isAssistant: false },
        body: 'Reminder: the weekly engineering digest goes out this afternoon.',
        timestamp: new Date(NOW - 40 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-14b',
        from: { email: 'eng.manager@company.com', name: 'Engineering Manager', isClient: false, isAssistant: false },
        body: 'This week: shipped the new onboarding flow, reduced p95 latency by 18%, and closed 42 bugs. Full notes attached. No action needed.',
        timestamp: new Date(NOW - 36 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [{ email: 'eng.manager@company.com', name: 'Engineering Manager', isClient: false, isAssistant: false }],
    aiInsight: {
      category: 'informational',
      urgency: 'low',
      suggestedResponder: 'assistant',
      importanceScore: 25,
      reasoning: 'Routine status digest, no action required',
      actionItems: ['Skim highlights', 'File for reference'],
      summary: 'Weekly engineering digest - onboarding shipped, latency improved',
      confidence: 93,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
  {
    id: 'sample-15',
    subject: 'FYI: Office closed Monday for facilities maintenance',
    isImportant: false,
    isUnread: false,
    labels: [{ id: 'informational', name: 'FYI', color: '#6b7280' }],
    lastMessage: {
      id: 'msg-15b',
      from: { email: 'facilities@company.com', name: 'Facilities', isClient: false, isAssistant: false },
      body: 'Update: the building will reopen Tuesday at 7 AM. Remote work is encouraged on Monday. No action required.',
      timestamp: new Date(NOW - 48 * HOUR).toISOString(),
      attachments: [],
    },
    messages: [
      {
        id: 'msg-15a',
        from: { email: 'facilities@company.com', name: 'Facilities', isClient: false, isAssistant: false },
        body: 'The office will be closed Monday for scheduled electrical maintenance.',
        timestamp: new Date(NOW - 96 * HOUR).toISOString(),
        attachments: [],
      },
      {
        id: 'msg-15b',
        from: { email: 'facilities@company.com', name: 'Facilities', isClient: false, isAssistant: false },
        body: 'Update: the building will reopen Tuesday at 7 AM. Remote work is encouraged on Monday. No action required.',
        timestamp: new Date(NOW - 48 * HOUR).toISOString(),
        attachments: [],
      },
    ],
    participants: [{ email: 'facilities@company.com', name: 'Facilities', isClient: false, isAssistant: false }],
    aiInsight: {
      category: 'informational',
      urgency: 'low',
      suggestedResponder: 'assistant',
      importanceScore: 20,
      reasoning: 'Office closure notice, no action required',
      actionItems: ['Note the closure on the calendar'],
      summary: 'Office closed Monday for maintenance; reopens Tuesday 7 AM',
      confidence: 94,
      demoMode: true,
    },
    responderChoice: 'pending',
    demoMode: true,
  },
];

async function loadDemoAccount() {
  const accountId = 'demo-account-1';
  const accounts = (await kvGet(KV_KEYS.ACCOUNTS)) ?? {};
  if (!accounts[accountId]) {
    accounts[accountId] = {
      id: accountId,
      name: 'Demo User',
      email: 'demo@example.com',
      connected: false,
    };
    await kvSet(KV_KEYS.ACCOUNTS, accounts);
  }

  const threadKey = `${KV_KEYS.THREADS}:${accountId}`;
  const existing = await kvGet(threadKey);
  if (!Array.isArray(existing) || existing.length < DEMO_THREADS.length) {
    await kvSet(threadKey, DEMO_THREADS);
  }
}

export async function GET(request: Request) {
  try {
    const { user, accessToken, isDemo } = await getUserOrDemo(request);

    if (isDemo) {
      await loadDemoAccount();
      const demoThreads = (await kvGet(`${KV_KEYS.THREADS}:demo-account-1`)) ?? [];
      return NextResponse.json({ threads: demoThreads });
    }

    if (!accessToken) {
      // Fallback to demo if no access token
      await loadDemoAccount();
      const demoThreads = (await kvGet(`${KV_KEYS.THREADS}:demo-account-1`)) ?? [];
      return NextResponse.json({ threads: demoThreads });
    }

    const gmailThreads = await fetchThreads(accessToken, 30);
    const accountId = `gmail-${user.email}`;
    const clientEmail = user.email || '';

    const threads = await Promise.all(
      gmailThreads.map(async (gmailThread) => {
        const fullThread = await fetchThread(accessToken!, gmailThread.id!);
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

        return emailThread;
      })
    );

    // Save to storage for client view sync
    await kvSet(`${KV_KEYS.THREADS}:${accountId}`, threads);

    return NextResponse.json({ threads });
  } catch (error) {
    console.error('Failed to fetch threads:', error);
    await loadDemoAccount();
    const demoThreads = (await kvGet(`${KV_KEYS.THREADS}:demo-account-1`)) ?? [];
    return NextResponse.json({ threads: demoThreads });
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
