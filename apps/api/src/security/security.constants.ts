export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';

export const RATE_LIMIT_KEY = 'rate-limit-options';

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};
