import { google } from 'googleapis';
import { EmailThread, EmailMessage, EmailParticipant, EmailAttachment } from '@/types';

const gmail = google.gmail('v1');

export async function getGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: 'v1', auth });
}

export async function fetchThreads(accessToken: string, maxResults = 20) {
  const client = await getGmailClient(accessToken);
  
  const response = await client.users.threads.list({
    userId: 'me',
    maxResults,
    labelIds: ['INBOX'],
    q: 'is:unread OR is:important',
  });

  return response.data.threads || [];
}

export async function fetchThread(accessToken: string, threadId: string) {
  const client = await getGmailClient(accessToken);
  
  const response = await client.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  return response.data;
}

export function parseThreadToEmailThread(gmailThread: any, accountId: string): EmailThread {
  const messages = gmailThread.messages || [];
  const parsedMessages = messages.map((msg: any) => parseMessage(msg));
  
  const lastMessage = parsedMessages[parsedMessages.length - 1];
  const participants = extractParticipants(parsedMessages);
  
  return {
    id: gmailThread.id,
    accountId,
    subject: extractSubject(gmailThread),
    participants,
    lastMessage,
    messages: parsedMessages,
    labels: extractLabels(gmailThread),
    isImportant: gmailThread.labelIds?.includes('IMPORTANT') || false,
    isUnread: gmailThread.labelIds?.includes('UNREAD') || false,
    createdAt: new Date(parseInt(messages[0]?.internalDate || Date.now())),
    updatedAt: new Date(parseInt(messages[messages.length - 1]?.internalDate || Date.now())),
  };
}

function parseMessage(msg: any): EmailMessage {
  const headers = msg.payload.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  
  const fromEmail = getHeader('from');
  const toHeader = getHeader('to');
  const ccHeader = getHeader('cc');
  const subject = getHeader('subject');
  const date = getHeader('date');
  
  const body = extractBody(msg.payload);
  
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: {
      email: extractEmail(fromEmail),
      name: extractName(fromEmail),
      isClient: false,
      isAssistant: false,
    },
    to: toHeader.split(',').map((e: string) => ({
      email: extractEmail(e.trim()),
      name: extractName(e.trim()),
      isClient: false,
      isAssistant: false,
    })),
    cc: ccHeader ? ccHeader.split(',').map((e: string) => ({
      email: extractEmail(e.trim()),
      name: extractName(e.trim()),
      isClient: false,
      isAssistant: false,
    })) : [],
    subject,
    body,
    timestamp: new Date(date),
    isRead: !msg.labelIds?.includes('UNREAD'),
    attachments: extractAttachments(msg.payload),
  };
}

function extractBody(payload: any): string {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      }
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }
  return '';
}

function extractAttachments(payload: any): EmailAttachment[] {
  const attachments: EmailAttachment[] = [];
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          name: part.filename,
          size: part.body.size || 0,
          mimeType: part.mimeType,
          url: `attachment:${part.body.attachmentId}`,
        });
      }
      if (part.parts) {
        attachments.push(...extractAttachments(part));
      }
    }
  }
  return attachments;
}

function extractSubject(thread: any): string {
  if (thread.messages?.[0]?.payload?.headers) {
    const subjectHeader = thread.messages[0].payload.headers.find(
      (h: any) => h.name.toLowerCase() === 'subject'
    );
    return subjectHeader?.value || 'No Subject';
  }
  return 'No Subject';
}

function extractParticipants(messages: EmailMessage[]): EmailParticipant[] {
  const participants = new Map<string, EmailParticipant>();
  
  for (const msg of messages) {
    if (!participants.has(msg.from.email)) {
      participants.set(msg.from.email, msg.from);
    }
    for (const to of msg.to) {
      if (!participants.has(to.email)) {
        participants.set(to.email, to);
      }
    }
    for (const cc of msg.cc) {
      if (!participants.has(cc.email)) {
        participants.set(cc.email, cc);
      }
    }
  }
  
  return Array.from(participants.values());
}

function extractLabels(thread: any): Array<{ id: string; name: string; color: string; type: 'system' | 'custom' | 'ai' }> {
  const labelMap: Record<string, { name: string; color: string }> = {
    'IMPORTANT': { name: 'Important', color: '#ef4444' },
    'UNREAD': { name: 'Unread', color: '#3b82f6' },
    'STARRED': { name: 'Starred', color: '#f59e0b' },
    'SENT': { name: 'Sent', color: '#8b5cf6' },
    'DRAFT': { name: 'Draft', color: '#6b7280' },
  };
  
  return (thread.labelIds || [])
    .filter((id: string) => labelMap[id])
    .map((id: string) => ({
      id,
      name: labelMap[id].name,
      color: labelMap[id].color,
      type: 'system' as const,
    }));
}

function extractEmail(fromHeader: string): string {
  const match = fromHeader.match(/<(.+?)>/);
  return match ? match[1] : fromHeader.trim();
}

function extractName(fromHeader: string): string {
  const match = fromHeader.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return match[1].replace(/['"]/g, '').trim();
  return fromHeader.split('<')[0].replace(/['"]/g, '').trim() || 'Unknown';
}

export async function sendEmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string,
  inReplyTo?: string
) {
  const client = await getGmailClient(accessToken);
  
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    threadId ? `In-Reply-To: ${threadId}` : '',
    inReplyTo ? `References: ${inReplyTo}` : '',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].filter(Boolean).join('\r\n');
  
  const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  
  return client.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
      threadId,
    },
  });
}

export async function modifyThreadLabels(
  accessToken: string,
  threadId: string,
  addLabels: string[],
  removeLabels: string[]
) {
  const client = await getGmailClient(accessToken);
  
  return client.users.threads.modify({
    userId: 'me',
    id: threadId,
    requestBody: {
      addLabelIds: addLabels,
      removeLabelIds: removeLabels,
    },
  });
}