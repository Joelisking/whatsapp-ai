import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let redisClient: RedisClientType;

export async function initializeRedis() {
  redisClient = createClient({
    url: config.redis.url,
  });

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  await redisClient.connect();
  return redisClient;
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

// Session management
export async function saveSession(key: string, data: any, expirySeconds: number = 3600) {
  const client = getRedisClient();
  await client.setEx(key, expirySeconds, JSON.stringify(data));
}

export async function getSession(key: string) {
  const client = getRedisClient();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(key: string) {
  const client = getRedisClient();
  await client.del(key);
}

// Conversation context management
export async function saveConversationContext(conversationId: string, context: any) {
  await saveSession(`conversation:${conversationId}`, context, 7200); // 2 hours
}

export async function getConversationContext(conversationId: string) {
  return await getSession(`conversation:${conversationId}`);
}

// Rate limiting helper
export async function checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
  const client = getRedisClient();
  const key = `ratelimit:${identifier}`;
  const current = await client.incr(key);

  if (current === 1) {
    await client.expire(key, windowSeconds);
  }

  return current <= limit;
}
