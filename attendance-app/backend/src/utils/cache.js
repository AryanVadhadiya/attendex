// Redis cache wrapper using redis@4.x+ API
const { createClient } = require('redis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_USERNAME = process.env.REDIS_USERNAME || 'default';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const redisOptions = {
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
  username: REDIS_USERNAME,
};
if (REDIS_PASSWORD) redisOptions.password = REDIS_PASSWORD;

const client = createClient(redisOptions);

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

let isConnected = false;
async function connectIfNeeded() {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log('Redis Connected');
  }
}

const cache = {
  /**
   * Set a value in cache
   * @param {string} key
   * @param {any} value
   * @param {number} [ttl] - time to live in seconds
   */
  async set(key, value, ttl) {
    await connectIfNeeded();
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
    await connectIfNeeded();
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
    await connectIfNeeded();
    await client.del(key);
  },

  /**
   * Disconnect the Redis client
   */
  async disconnect() {
    if (isConnected) {
      await client.disconnect();
      isConnected = false;
    }
  },
};

module.exports = cache;