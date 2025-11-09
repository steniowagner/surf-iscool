import { Module } from '@nestjs/common';

import { SecurityModule } from '@shared-modules/security/security.module';
import { ConfigModule } from '@shared-modules/config/config.module';
import { EmailModule } from '@shared-modules/email/email.module';

import { IdentityPersistenceModule } from './persistence/identity-persistence.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    IdentityPersistenceModule,
    SecurityModule,
    EmailModule,
  ],
  providers: [],
  controllers: [],
})
export class IdentityModule {}
