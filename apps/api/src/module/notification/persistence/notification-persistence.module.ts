import { Module } from '@nestjs/common';

import { PersistenceModule } from '@shared-modules/persistence/persistence.module';
import { LoggerModule } from '@shared-modules/logger/logger.module';

import { NotificationRepository } from './repository/notification.repository';
import * as schema from './database.schema';

@Module({
  imports: [PersistenceModule.forRoot(schema), LoggerModule],
  providers: [NotificationRepository],
  exports: [PersistenceModule, NotificationRepository],
})
export class NotificationPersistenceModule {}
