import { Module } from '@nestjs/common';

import { SecurityModule } from '@shared-modules/security/security.module';
import { ConfigModule } from '@shared-modules/config/config.module';
import { EmailModule } from '@shared-modules/email/email.module';

import { RegisterUserUsingEmailUseCase } from './application/use-case/register-user-using-email.use-case';
import { IdentityPersistenceModule } from './persistence/identity-persistence.module';
import { AuthEmailController } from './http/rest/controller/auth-email.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    IdentityPersistenceModule,
    SecurityModule,
    EmailModule,
  ],
  providers: [RegisterUserUsingEmailUseCase],
  controllers: [AuthEmailController],
})
export class IdentityModule {}
