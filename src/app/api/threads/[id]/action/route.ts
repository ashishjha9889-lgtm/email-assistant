import { getUserOrDemo } from '@/auth';
import { NextResponse } from 'next/server';
import { sendEmail, modifyThreadLabels } from '@/lib/gmail';
import { kvGet, kvSet, KV_KEYS } from '@/lib/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, accessToken, isDemo } = await getUserOrDemo(request);
    const { id } = await params;
    const body = await request.json();
    const { action, data } = body;

    if (isDemo) {
      if (action === 'setResponder') {
        const choices = (await kvGet(KV_KEYS.RESPONDER_CHOICES)) ?? {};
        choices[id] = data.responder;
        await kvSet(KV_KEYS.RESPONDER_CHOICES, choices);
      }
      return NextResponse.json({ success: true, demo: true });
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    switch (action) {
      case 'reply': {
        const { to, subject, body: emailBody, inReplyTo } = data;
        await sendEmail(accessToken, to, subject, emailBody, id, inReplyTo);
        return NextResponse.json({ success: true });
      }
      
      case 'forward': {
        const { to, subject, body: emailBody } = data;
        await sendEmail(accessToken, to, `Fwd: ${subject}`, emailBody);
        return NextResponse.json({ success: true });
      }
      
      case 'archive': {
        await modifyThreadLabels(accessToken, id, [], ['INBOX']);
        return NextResponse.json({ success: true });
      }
      
      case 'markImportant': {
        await modifyThreadLabels(accessToken, id, ['IMPORTANT'], []);
        return NextResponse.json({ success: true });
      }
      
      case 'markUnimportant': {
        await modifyThreadLabels(accessToken, id, [], ['IMPORTANT']);
        return NextResponse.json({ success: true });
      }
      
      case 'markRead': {
        await modifyThreadLabels(accessToken, id, [], ['UNREAD']);
        return NextResponse.json({ success: true });
      }
      
      case 'markUnread': {
        await modifyThreadLabels(accessToken, id, ['UNREAD'], []);
        return NextResponse.json({ success: true });
      }
      
      case 'delete': {
        await modifyThreadLabels(accessToken, id, ['TRASH'], ['INBOX']);
        return NextResponse.json({ success: true });
      }
      
      case 'setResponder': {
        const responderLabel = data.responder === 'client' ? 'LABEL_CLIENT_ACTION' : 'LABEL_ASSISTANT_ACTION';
        await modifyThreadLabels(accessToken, id, [responderLabel], [
          'LABEL_CLIENT_ACTION',
          'LABEL_ASSISTANT_ACTION',
        ]);
        return NextResponse.json({ success: true });
      }
      
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Thread action failed:', error);
    return NextResponse.json(
      { error: 'Action failed' },
      { status: 500 }
    );
  }
}