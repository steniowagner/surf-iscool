import { Module } from '@nestjs/common';

import { PersistenceModule } from '@shared-modules/persistence/persistence.module';
import { LoggerModule } from '@shared-modules/logger/logger.module';

import { AuthProviderRepository } from './repository/auth-provider.repository';
import { EmailVerificationRepository } from './repository/email-verification.repository';
import { CredentialLocalRepository } from './repository/credential-local.repository';
import { UserRepository } from './repository/user.repository';
import * as schema from './database.schema';

@Module({
  imports: [PersistenceModule.forRoot(schema), LoggerModule],
  providers: [
    AuthProviderRepository,
    UserRepository,
    CredentialLocalRepository,
    EmailVerificationRepository,
  ],
  exports: [
    PersistenceModule,
    AuthProviderRepository,
    UserRepository,
    CredentialLocalRepository,
    EmailVerificationRepository,
  ],
})
export class IdentityPersistenceModule {}
