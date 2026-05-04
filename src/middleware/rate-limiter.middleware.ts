import rateLimit from 'express-rate-limit';

interface RateLimitOptions {
  windowMs?: number;
  max: number;
}

export function rateLimiter(options: RateLimitOptions) {
  return rateLimit({
    windowMs: options.windowMs || 60000,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { message: 'Too many requests, please try again later' },
    },
    keyGenerator: (req) => {
      return req.user?.userId || req.ip || 'anonymous';
    },
  });
}
