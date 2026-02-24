import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const DEFAULT_TTL = 15 * 60;

export async function getCached(key, fetchFn, ttl = DEFAULT_TTL) {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error('Redis get error:', error);
  }

  const data = await fetchFn();

  if (data) {
    try {
      await redis.setex(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  return data;
}

export async function invalidateCache(key) {
  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

export async function invalidateUserCache(discordUserId) {
  const keys = [
    `profile:${discordUserId}`,
    `fleetcarrier:${discordUserId}`,
    `market:${discordUserId}`,
    `shipyard:${discordUserId}`,
    `communitygoals:${discordUserId}`,
    `journal:${discordUserId}`,
  ];
  
  try {
    await redis.del(...keys);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

export default redis;
