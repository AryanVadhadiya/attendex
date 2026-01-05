// Redis cache wrapper using redis@4.x+ API
// NOTE: Redis is OPTIONAL. If connection fails once, caching is disabled
// so that API performance is not affected by Redis outages/misconfiguration.
const { createClient } = require('redis');

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_USERNAME = process.env.REDIS_USERNAME || 'default';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

let client = null;
let isConnected = false;
let isDisabled = false;

function createRedisClientIfConfigured() {
  if (!REDIS_HOST || !REDIS_PORT) {
    // No explicit Redis configuration -> disable cache
    isDisabled = true;
    return null;
  }

  const redisOptions = {
    socket: {
      host: REDIS_HOST,
      port: Number(REDIS_PORT),
    },
    username: REDIS_USERNAME,
  };
  if (REDIS_PASSWORD) redisOptions.password = REDIS_PASSWORD;

  const c = createClient(redisOptions);
  c.on('error', (err) => {
    console.error('Redis Client Error', err);
  });
  return c;
}

async function connectIfNeeded() {
  if (isDisabled) return false;

  if (!client) {
    client = createRedisClientIfConfigured();
    if (!client) return false;
  }

  if (!isConnected) {
    try {
      await client.connect();
      isConnected = true;
      console.log('Redis Connected');
    } catch (err) {
      console.error('Redis connection failed, disabling cache:', err.message || err);
      isDisabled = true;
      try {
        await client.quit();
      } catch (_) {
        // ignore
      }
      client = null;
      return false;
    }
  }

  return true;
}

const cache = {
  /**
   * Set a value in cache
   * @param {string} key
   * @param {any} value
   * @param {number} [ttl] - time to live in seconds
   */
  async set(key, value, ttl) {
    const ok = await connectIfNeeded();
    if (!ok) return;
    const val = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      await client.set(key, val, { EX: ttl });
    } else {
      await client.set(key, val);
    }
  },

  /**
   * Get a value from cache
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(key) {
    const ok = await connectIfNeeded();
    if (!ok) return null;
    const val = await client.get(key);
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  },

  /**
   * Delete a value from cache
   * @param {string} key
   */
  async del(key) {
    const ok = await connectIfNeeded();
    if (!ok) return;
    await client.del(key);
  },

  /**
   * Disconnect the Redis client
   */
  async disconnect() {
    if (client && isConnected) {
      await client.disconnect();
      isConnected = false;
    }
  },
};

module.exports = cache;
