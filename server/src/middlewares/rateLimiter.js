/**
 * rateLimiter.js
 * 
 * High-performance, in-memory sliding window rate limiter middleware with zero external dependencies.
 * Defends against brute-force password guessing, credential stuffing, scraping, and endpoint flooding.
 */

export function createRateLimiter({
  windowMs = 60 * 1000,
  max = 30,
  message = 'खूप जास्त विनंत्या पाठवल्या आहेत. कृपया काही वेळाने पुन्हा प्रयत्न करा (Too many requests. Please try again later).',
  keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown-ip'
} = {}) {
  // Map of clientKey -> Array of timestamp numbers
  const hits = new Map();

  // Periodic cleanup of stale entries every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, valid);
      }
    }
  }, 2 * 60 * 1000);

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiterMiddleware(req, res, next) {
    // In test environment, allow bypassing if explicitly flagged
    if (process.env.DISABLE_RATE_LIMITER === 'true') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();

    const clientTimestamps = hits.get(key) || [];
    const validTimestamps = clientTimestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= max) {
      const oldestHit = validTimestamps[0];
      const resetTime = Math.ceil((oldestHit + windowMs - now) / 1000);

      res.setHeader('Retry-After', Math.max(1, resetTime));
      res.setHeader('RateLimit-Limit', max);
      res.setHeader('RateLimit-Remaining', 0);
      res.setHeader('RateLimit-Reset', Math.max(1, resetTime));

      return res.status(429).json({
        error: message,
        retry_after_seconds: Math.max(1, resetTime)
      });
    }

    validTimestamps.push(now);
    hits.set(key, validTimestamps);

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', Math.max(0, max - validTimestamps.length));

    next();
  };
}

// 1. Login Brute Force Protection (15 min window, max 10 requests)
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'लॉगिनचे खूप जास्त प्रयत्न झाले आहेत. कृपया १५ मिनिटांनंतर पुन्हा प्रयत्न करा (Too many login attempts. Please try again after 15 minutes).'
});

// 2. Donation Intent Creation Protection (5 min window, max 25 intents)
export const donationIntentLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 25,
  message: 'देणगी हेतू निर्मितीची मर्यादा ओलांडली आहे. कृपया थोड्या वेळाने प्रयत्न करा (Donation intent limit reached. Please wait a few minutes).'
});

// 3. UTR Submission Protection (5 min window, max 20 submissions)
export const utrSubmissionLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'UTR सबमिशन मर्यादा ओलांडली आहे. कृपया ५ मिनिटांनंतर प्रयत्न करा (UTR submission rate limit reached).'
});

// 4. Public Receipt Search Protection (1 min window, max 40 searches)
export const receiptSearchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: 'पावती शोधाची मर्यादा ओलांडली आहे. कृपया एक मिनिट थांबा (Receipt search rate limit exceeded).'
});
