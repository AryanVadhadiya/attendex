// Cache middleware for GET endpoints
const cache = require('../utils/cache');

/**
 * Cache middleware for Express routes
 * @param {function(req): string} keyGenerator - function to generate cache key from req
 * @param {number} ttl - time to live in seconds
 */
function cacheMiddleware(keyGenerator, ttl = 3600) {
  return async (req, res, next) => {
    const key = keyGenerator(req);
    try {
      const cached = await cache.get(key);
      if (cached) {
        return res.json(cached);
      }
      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        cache.set(key, body, ttl);
        return originalJson(body);
      };
      next();
    } catch (err) {
      // On cache error, proceed without cache
      next();
    }
  };
}

module.exports = cacheMiddleware;
