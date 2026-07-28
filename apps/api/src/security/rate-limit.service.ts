import { Injectable } from '@nestjs/common';

type RateLimitEntry = {
  count: number;
  resetsAt: number;
};

@Injectable()
export class RateLimitService {
  private readonly entries = new Map<string, RateLimitEntry>();

  consume(key: string, limit: number, windowMs: number, now = Date.now()) {
    const current = this.entries.get(key);
    const entry =
      !current || current.resetsAt <= now
        ? { count: 0, resetsAt: now + windowMs }
        : current;

    entry.count += 1;
    this.entries.set(key, entry);

    return {
      allowed: entry.count <= limit,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetsAt - now) / 1000)),
    };
  }

  clear() {
    this.entries.clear();
  }
}
