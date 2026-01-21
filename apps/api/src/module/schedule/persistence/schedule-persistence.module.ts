import { Module } from '@nestjs/common';

import { PersistenceModule } from '@shared-modules/persistence/persistence.module';
import { LoggerModule } from '@shared-modules/logger/logger.module';

import { ClassRepository } from './repository/class/class.repository';
import { ClassInstructorRepository } from './repository/class-instructor.repository';
import * as schema from './database.schema';

@Module({
  imports: [PersistenceModule.forRoot(schema), LoggerModule],
  providers: [ClassRepository, ClassInstructorRepository],
  exports: [PersistenceModule, ClassRepository, ClassInstructorRepository],
})
export class SchedulePersistenceModule {}
