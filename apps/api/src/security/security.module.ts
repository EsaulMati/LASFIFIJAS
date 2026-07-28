import { Global, Module } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitService } from './rate-limit.service';

@Global()
@Module({
  providers: [CsrfGuard, RateLimitGuard, RateLimitService],
  exports: [CsrfGuard, RateLimitGuard, RateLimitService],
})
export class SecurityModule {}
