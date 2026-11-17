import { getUserOrDemo } from '@/auth';
import { NextResponse } from 'next/server';
import { kvGet, kvSet, KV_KEYS } from '@/lib/storage';
import { GET as getAllThreads } from '@/app/api/threads/route';

export async function GET(request: Request) {
  try {
    await getUserOrDemo(request);

    const accounts = (await kvGet(KV_KEYS.ACCOUNTS)) ?? {};
    let allThreads: Record<string, unknown>[] = [];

    for (const accountId of Object.keys(accounts)) {
      const stored = await kvGet(`${KV_KEYS.THREADS}:${accountId}`);
      if (Array.isArray(stored)) {
        allThreads = [...allThreads, ...(stored as Record<string, unknown>[])];
      }
    }

    if (allThreads.length === 0) {
      return await getAllThreads(request);
    }

    for (const thread of allThreads) {
      if (!thread.aiInsight) {
        thread.aiInsight = {
          category: 'other',
          urgency: 'low',
          suggestedResponder: 'either',
          importanceScore: 50,
          reasoning: 'No AI analysis available',
          actionItems: ['Review manually'],
          summary: 'Requires manual review',
          confidence: 0,
        };
      }
    }

    return NextResponse.json({ threads: allThreads });
  } catch (e) {
    console.error('GET /api/client/threads error:', e);
    return await getAllThreads(request);
  }
}

export async function POST(request: Request) {
  try {
    const { isDemo } = await getUserOrDemo(request);
    const body = await request.json();
    const { accountId, threads } = body;

    if (!accountId || !threads) {
      return NextResponse.json({ error: 'accountId and threads are required' }, { status: 400 });
    }

    if (isDemo) {
      return NextResponse.json({ success: true });
    }

    const key = `${KV_KEYS.THREADS}:${accountId}`;
    await kvSet(key, threads);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('POST /api/client/threads error:', e);
    return NextResponse.json({ error: 'Failed to save threads' }, { status: 500 });
  }
}
