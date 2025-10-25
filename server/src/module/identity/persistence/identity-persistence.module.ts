import { Module } from '@nestjs/common';

import { PersistenceModule } from '@shared-modules/persistence/persistence.module';

import { UserRepository } from './repository/user.repository';
import { UserService } from '../core/services/user.service';
import * as schema from './database.schema';

@Module({
  imports: [PersistenceModule.forRoot(schema)],
  providers: [UserRepository, UserService],
  exports: [UserRepository],
})
export class IdentityPersistenceModule {}
