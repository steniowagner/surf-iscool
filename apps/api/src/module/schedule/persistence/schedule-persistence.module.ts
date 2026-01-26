import { Module } from '@nestjs/common';

import { PersistenceModule } from '@shared-modules/persistence/persistence.module';
import { LoggerModule } from '@shared-modules/logger/logger.module';

import { ClassRepository } from './repository/class/class.repository';
import { ClassInstructorRepository } from './repository/class-instructor.repository';
import { ClassEnrollmentRepository } from './repository/class-enrollment.repository';
import { CancellationRuleRepository } from './repository/cancellation-rule.repository';
import { ClassPhotoRepository } from './repository/class-photo.repository';
import { ClassRatingRepository } from './repository/class-rating.repository';
import * as schema from './database.schema';

@Module({
  imports: [PersistenceModule.forRoot(schema), LoggerModule],
  providers: [
    ClassRepository,
    ClassInstructorRepository,
    ClassEnrollmentRepository,
    CancellationRuleRepository,
    ClassPhotoRepository,
    ClassRatingRepository,
  ],
  exports: [
    PersistenceModule,
    ClassRepository,
    ClassInstructorRepository,
    ClassEnrollmentRepository,
    CancellationRuleRepository,
    ClassPhotoRepository,
    ClassRatingRepository,
  ],
})
export class SchedulePersistenceModule {}
