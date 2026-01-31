import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { SchedulePersistenceModule } from './persistence/schedule-persistence.module';
import { AdminClassController } from './http/rest/controller/admin-class.controller';
import { AdminEnrollmentController } from './http/rest/controller/admin-enrollment.controller';
import { AdminCancellationRuleController } from './http/rest/controller/admin-cancellation-rule.controller';
import { AdminScheduleAnalyticsController } from './http/rest/controller/admin-schedule-analytics.controller';
import { StudentClassController } from './http/rest/controller/student-class.controller';
import { InstructorClassController } from './http/rest/controller/instructor-class.controller';
import { ClassPhotoController } from './http/rest/controller/class-photo.controller';
import { ClassRatingController } from './http/rest/controller/class-rating.controller';
import { AdminClassService } from './core/services/admin-class.service';
import { AdminEnrollmentService } from './core/services/admin-enrollment.service';
import { CancellationRuleService } from './core/services/cancellation-rule.service';
import { StudentClassService } from './core/services/student-class.service';
import { InstructorClassService } from './core/services/instructor-class.service';
import { ClassPhotoService } from './core/services/class-photo.service';
import { ClassRatingService } from './core/services/class-rating.service';
import { ClassAnalyticsService } from './core/services/class-analytics.service';
import { EnrollmentAnalyticsService } from './core/services/enrollment-analytics.service';
import { InstructorAnalyticsService } from './core/services/instructor-analytics.service';
import { RatingAnalyticsService } from './core/services/rating-analytics.service';

@Module({
  imports: [ConfigModule.forRoot(), SchedulePersistenceModule, AuthModule],
  providers: [
    AdminClassService,
    AdminEnrollmentService,
    CancellationRuleService,
    StudentClassService,
    InstructorClassService,
    ClassPhotoService,
    ClassRatingService,
    ClassAnalyticsService,
    EnrollmentAnalyticsService,
    InstructorAnalyticsService,
    RatingAnalyticsService,
  ],
  controllers: [
    AdminClassController,
    AdminEnrollmentController,
    AdminCancellationRuleController,
    AdminScheduleAnalyticsController,
    StudentClassController,
    InstructorClassController,
    ClassPhotoController,
    ClassRatingController,
  ],
})
export class ScheduleModule {}
