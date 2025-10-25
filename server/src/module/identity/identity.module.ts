import { Module } from '@nestjs/common';

import { IdentityPersistenceModule } from './persistence/identity-persistence.module';
import { UserRepository } from './persistence/repository/user.repository';

@Module({
  imports: [IdentityPersistenceModule],
  providers: [UserRepository],
})
export class IdentityModule {}
