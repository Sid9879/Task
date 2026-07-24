const redis = require('redis');

let redisClient = null;

const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;

  const clientConfig = redisUrl
    ? {
        url: redisUrl,
        socket: {
          tls: redisUrl.startsWith('rediss://'), 
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              console.warn('Redis max reconnect attempts reached. Running without cache.');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      }
    : {
        socket: {
          host: process.env.REDIS_HOST || '127.0.0.1',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              console.warn('Redis max reconnect attempts reached. Running without cache.');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      };

  const client = redis.createClient(clientConfig);

  client.on('error', (err) => console.warn('Redis Client Warning:', err.message));
  client.on('connect', () => console.log('Redis connected'));
  client.on('end', () => console.log('Redis connection ended'));

  return client;
};

const connectRedis = async () => {
  try {
    redisClient = createRedisClient();
    await redisClient.connect();
  } catch (error) {
    console.warn('Redis not available, running without cache:', error.message);
    redisClient = null;
  }
};

const getRedisClient = () => redisClient;

const cacheGet = async (key) => {
  try {
    if (!redisClient || !redisClient.isOpen) return null;
    const data = await redisClient.get(key);
    if (data) {
      console.log(`[Cache HIT]  ${key}`);
      return JSON.parse(data);
    }
    console.log(`[Cache MISS] ${key}`);
    return null;
  } catch {
    return null;
  }
};

const cacheSet = async (key, value, ttlSeconds = 300) => {
  try {
    if (!redisClient || !redisClient.isOpen) return;
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    console.log(`[Cache SET]  ${key} (TTL: ${ttlSeconds}s)`);
  } catch {

  }
};

const cacheDel = async (...keys) => {
  try {
    if (!redisClient || !redisClient.isOpen) return;
    for (const key of keys) await redisClient.del(key);
  } catch {

  }
};

const cacheDelPattern = async (pattern) => {
  try {
    if (!redisClient || !redisClient.isOpen) return;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(keys);
  } catch {

  }
};

const blacklistToken = async (token, ttlSeconds) => {
  try {
    if (!redisClient || !redisClient.isOpen) return;
    await redisClient.set(`bl_${token}`, '1', { EX: ttlSeconds });
  } catch {

  }
};

const isTokenBlacklisted = async (token) => {
  try {
    if (!redisClient || !redisClient.isOpen) return false;
    const result = await redisClient.get(`bl_${token}`);
    return result === '1';
  } catch {
    return false;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  blacklistToken,
  isTokenBlacklisted,
};
