import { kvGet, kvSet, KV_KEYS } from './storage';

export { KV_KEYS };

export async function getAccounts(): Promise<Record<string, any>> {
  const data = await kvGet(KV_KEYS.ACCOUNTS);
  return (data as Record<string, any>) || {};
}

export async function setAccounts(accounts: Record<string, any>): Promise<void> {
  await kvSet(KV_KEYS.ACCOUNTS, accounts);
}

export async function getThreads(accountId: string): Promise<any[]> {
  const key = `${KV_KEYS.THREADS}:${accountId}`;
  const data = await kvGet(key);
  return (data as any[]) || [];
}

export async function setThreads(accountId: string, threads: any[]): Promise<void> {
  const key = `${KV_KEYS.THREADS}:${accountId}`;
  await kvSet(key, threads);
}

export async function getAIInsights(accountId: string): Promise<Record<string, any>> {
  const key = `${KV_KEYS.AI_INSIGHTS}:${accountId}`;
  const data = await kvGet(key);
  return (data as Record<string, any>) || {};
}

export async function setAIInsights(accountId: string, insights: Record<string, any>): Promise<void> {
  const key = `${KV_KEYS.AI_INSIGHTS}:${accountId}`;
  await kvSet(key, insights);
}

export async function getResponderChoices(): Promise<Record<string, 'client' | 'assistant' | 'pending'>> {
  const data = await kvGet(KV_KEYS.RESPONDER_CHOICES);
  return (data as Record<string, 'client' | 'assistant' | 'pending'>) || {};
}

export async function setResponderChoices(choices: Record<string, 'client' | 'assistant' | 'pending'>): Promise<void> {
  await kvSet(KV_KEYS.RESPONDER_CHOICES, choices);
}

export async function getResponderChoice(threadId: string): Promise<'client' | 'assistant' | 'pending' | null> {
  const choices = await getResponderChoices();
  return choices[threadId] || null;
}

export async function setResponderChoice(threadId: string, choice: 'client' | 'assistant' | 'pending'): Promise<void> {
  const choices = await getResponderChoices();
  choices[threadId] = choice;
  await setResponderChoices(choices);
}

export async function getSettings(): Promise<Record<string, any>> {
  const data = await kvGet(KV_KEYS.SETTINGS);
  return (data as Record<string, any>) || {};
}

export async function setSettings(settings: Record<string, any>): Promise<void> {
  await kvSet(KV_KEYS.SETTINGS, settings);
}

export async function getSetting(key: string): Promise<any> {
  const settings = await getSettings();
  return settings[key];
}

export async function setSetting(key: string, value: any): Promise<void> {
  const settings = await getSettings();
  settings[key] = value;
  await setSettings(settings);
}