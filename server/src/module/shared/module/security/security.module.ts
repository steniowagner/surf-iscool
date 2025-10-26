import { Module } from '@nestjs/common';

import { TokenGenerationService } from './service/token-generation.service';
import { HasherService } from './service/hasher.service';

@Module({
  providers: [TokenGenerationService, HasherService],
  exports: [TokenGenerationService, HasherService],
})
export class SecurityModule {}
