import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function parseFrontendOrigins(
  frontendUrl = process.env.FRONTEND_URL ?? '',
): string[] {
  return frontendUrl.split(',').map(normalizeOrigin).filter(Boolean);
}

export function createCorsOptions(frontendUrl?: string): CorsOptions {
  const allowedOrigins = new Set(parseFrontendOrigins(frontendUrl));

  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      callback(null, allowedOrigins.has(normalizeOrigin(origin)));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
  };
}
