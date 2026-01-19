import { Module } from '@nestjs/common';

import { PersistenceModule } from '@shared-modules/persistence/persistence.module';
import { LoggerModule } from '@shared-modules/logger/logger.module';

import { UserRoleHistoryRepository } from './repository/user-role-history.repository';
import { UserRepository } from './repository/user.repository';
import * as schema from './database.schema';

@Module({
  imports: [PersistenceModule.forRoot(schema), LoggerModule],
  providers: [UserRepository, UserRoleHistoryRepository],
  exports: [PersistenceModule, UserRepository, UserRoleHistoryRepository],
})
export class IdentityPersistenceModule {}
