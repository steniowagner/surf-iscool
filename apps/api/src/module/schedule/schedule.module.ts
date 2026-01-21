import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { SchedulePersistenceModule } from './persistence/schedule-persistence.module';
import { AdminClassController } from './http/rest/controller/admin-class.controller';
import { AdminEnrollmentController } from './http/rest/controller/admin-enrollment.controller';
import { AdminCancellationRuleController } from './http/rest/controller/admin-cancellation-rule.controller';
import { StudentClassController } from './http/rest/controller/student-class.controller';
import { InstructorClassController } from './http/rest/controller/instructor-class.controller';
import { AdminClassService } from './core/services/admin-class.service';
import { AdminEnrollmentService } from './core/services/admin-enrollment.service';
import { CancellationRuleService } from './core/services/cancellation-rule.service';
import { StudentClassService } from './core/services/student-class.service';
import { InstructorClassService } from './core/services/instructor-class.service';

@Module({
  imports: [ConfigModule.forRoot(), SchedulePersistenceModule, AuthModule],
  providers: [
    AdminClassService,
    AdminEnrollmentService,
    CancellationRuleService,
    StudentClassService,
    InstructorClassService,
  ],
  controllers: [
    AdminClassController,
    AdminEnrollmentController,
    AdminCancellationRuleController,
    StudentClassController,
    InstructorClassController,
  ],
})
export class ScheduleModule {}
