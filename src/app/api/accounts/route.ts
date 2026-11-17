import { getUserOrDemo } from '@/auth';
import { NextResponse } from 'next/server';
import { kvGet, kvSet, KV_KEYS } from '@/lib/storage';

const DEMO_ACCOUNT = {
  id: 'demo-account-1',
  name: 'Demo User',
  email: 'demo@example.com',
  avatar: undefined,
  connected: false,
};

export async function GET(request: Request) {
  try {
    const { user, isDemo } = await getUserOrDemo(request);

    if (isDemo) {
      return NextResponse.json({ accounts: { 'demo-account-1': DEMO_ACCOUNT } });
    }

    const accounts = (await kvGet(KV_KEYS.ACCOUNTS)) ?? {};
    return NextResponse.json({ accounts });
  } catch (e) {
    console.error('GET /api/accounts error:', e);
    return NextResponse.json({ accounts: { 'demo-account-1': DEMO_ACCOUNT } });
  }
}

export async function POST(request: Request) {
  try {
    const { user, isDemo } = await getUserOrDemo(request);
    const body = await request.json();
    const { accountId, account } = body;

    if (!accountId || !account) {
      return NextResponse.json({ error: 'accountId and account are required' }, { status: 400 });
    }

    if (isDemo) {
      return NextResponse.json({ success: true });
    }

    const accounts = (await kvGet(KV_KEYS.ACCOUNTS)) ?? {};
    accounts[accountId] = account;
    await kvSet(KV_KEYS.ACCOUNTS, accounts);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('POST /api/accounts error:', e);
    return NextResponse.json({ error: 'Failed to save account' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, isDemo } = await getUserOrDemo(request);
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    if (isDemo) {
      return NextResponse.json({ success: true });
    }

    const accounts = (await kvGet(KV_KEYS.ACCOUNTS)) ?? {};
    delete accounts[accountId];
    await kvSet(KV_KEYS.ACCOUNTS, accounts);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/accounts error:', e);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}