import { Module } from '@nestjs/common';

import { SecurityModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { IdentityPersistenceModule } from './persistence/identity-persistence.module';
import { AuthController } from './http/rest/controller/auth.controller';

@Module({
  imports: [ConfigModule.forRoot(), IdentityPersistenceModule, SecurityModule],
  providers: [],
  controllers: [AuthController],
})
export class IdentityModule {}
