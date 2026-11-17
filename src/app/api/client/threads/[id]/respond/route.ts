import { getUserOrDemo } from '@/auth';
import { NextResponse } from 'next/server';
import { kvGet, kvSet, KV_KEYS } from '@/lib/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isDemo } = await getUserOrDemo(request);
    const { id: threadId } = await params;
    const body = await request.json();
    const { choice } = body;

    if (!threadId || !choice) {
      return NextResponse.json({ error: 'threadId and choice are required' }, { status: 400 });
    }

    if (!['client', 'assistant', 'pending'].includes(choice)) {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }

    const choices = (await kvGet(KV_KEYS.RESPONDER_CHOICES)) ?? {};
    choices[threadId] = choice;
    await kvSet(KV_KEYS.RESPONDER_CHOICES, choices);

    const accountId = isDemo ? 'demo-account-1' : `gmail-${user.email}`;
    const threadKey = `${KV_KEYS.THREADS}:${accountId}`;
    const storedThreads = await kvGet(threadKey);

    if (Array.isArray(storedThreads)) {
      const thread = storedThreads.find((t: { id: string }) => t.id === threadId);
      if (thread) {
        thread.responderChoice = choice;
        await kvSet(threadKey, storedThreads);
      }
    }

    return NextResponse.json({ success: true, choice });
  } catch (e) {
    console.error('POST /api/client/threads/[id]/respond error:', e);
    return NextResponse.json({ error: 'Failed to save responder choice' }, { status: 500 });
  }
}
