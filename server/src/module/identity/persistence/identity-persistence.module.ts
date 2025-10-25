import { Module } from '@nestjs/common';

import { PersistenceModule } from '@shared-modules/persistence/persistence.module';

import { AuthProviderRepository } from './repository/auth-provider.repository';
import { UserRepository } from './repository/user.repository';
import * as schema from './database.schema';

@Module({
  imports: [PersistenceModule.forRoot(schema)],
  providers: [AuthProviderRepository, UserRepository],
  exports: [AuthProviderRepository, UserRepository],
})
export class IdentityPersistenceModule {}
