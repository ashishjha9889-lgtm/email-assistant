import { Redis } from '@upstash/redis';

export const KV_KEYS = {
  ACCOUNTS: 'pa:accounts',
  THREADS: 'pa:threads',
  AI_INSIGHTS: 'pa:ai_insights',
  RESPONDER_CHOICES: 'pa:responder_choices',
  SETTINGS: 'pa:settings',
  CLIENT: 'pa:client',
} as const;

let redis: Redis | null = null;
let inMemoryStore: Map<string, any> = new Map();
let usingInMemory = false;

export function getStorage(): { redis: Redis | null; inMemory: Map<string, any>; usingInMemory: boolean } {
  if (redis) {
    return { redis, inMemory: inMemoryStore, usingInMemory: false };
  }

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    try {
      redis = new Redis({ url, token });
      usingInMemory = false;
    } catch (e) {
      console.warn('Failed to initialize Upstash Redis, falling back to in-memory store:', e);
      usingInMemory = true;
    }
  } else {
    usingInMemory = true;
  }

  return { redis, inMemory: inMemoryStore, usingInMemory };
}

export async function kvGet(key: string): Promise<any> {
  const { redis, inMemory, usingInMemory } = getStorage();
  if (usingInMemory) {
    return inMemory.get(key) ?? null;
  }
  try {
    return (await redis!.get(key)) ?? null;
  } catch (e) {
    console.warn('Redis get failed, using in-memory:', e);
    return inMemory.get(key) ?? null;
  }
}

export async function kvSet(key: string, value: any): Promise<void> {
  const { redis, inMemory, usingInMemory } = getStorage();
  if (usingInMemory) {
    inMemory.set(key, value);
    return;
  }
  try {
    await redis!.set(key, value);
  } catch (e) {
    console.warn('Redis set failed, using in-memory:', e);
    inMemory.set(key, value);
  }
}

export async function kvDel(key: string): Promise<void> {
  const { redis, inMemory, usingInMemory } = getStorage();
  if (usingInMemory) {
    inMemory.delete(key);
    return;
  }
  try {
    await redis!.del(key);
  } catch (e) {
    console.warn('Redis del failed, using in-memory:', e);
    inMemory.delete(key);
  }
}

export function isUsingInMemory(): boolean {
  const { usingInMemory } = getStorage();
  return usingInMemory;
}