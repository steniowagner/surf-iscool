import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { SchedulePersistenceModule } from './persistence/schedule-persistence.module';
import { AdminClassController } from './http/rest/controller/admin-class.controller';
import { StudentClassController } from './http/rest/controller/student-class.controller';
import { InstructorClassController } from './http/rest/controller/instructor-class.controller';
import { AdminClassService } from './core/services/admin-class.service';
import { StudentClassService } from './core/services/student-class.service';
import { InstructorClassService } from './core/services/instructor-class.service';

@Module({
  imports: [ConfigModule.forRoot(), SchedulePersistenceModule, AuthModule],
  providers: [AdminClassService, StudentClassService, InstructorClassService],
  controllers: [
    AdminClassController,
    StudentClassController,
    InstructorClassController,
  ],
})
export class ScheduleModule {}
