import { Module } from '@nestjs/common';

import { ConfigModule } from '@shared-modules/config/config.module';

import { TokenGenerationService } from './service/token-generation.service';
import { HasherService } from './service/hasher.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [TokenGenerationService, HasherService],
  exports: [TokenGenerationService, HasherService],
})
export class SecurityModule {}
