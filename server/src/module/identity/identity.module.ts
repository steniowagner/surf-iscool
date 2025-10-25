import { Module } from '@nestjs/common';

import { IdentityPersistenceModule } from './persistence/identity-persistence.module';
import { AuthController } from './http/rest/controller/auth.controller';

@Module({
  imports: [IdentityPersistenceModule],
  providers: [],
  controllers: [AuthController],
})
export class IdentityModule {}
