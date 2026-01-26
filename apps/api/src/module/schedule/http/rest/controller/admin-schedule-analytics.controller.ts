import { Controller, Get, UseGuards } from '@nestjs/common';

import { UserRole } from '@surf-iscool/types';

import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';

import { ClassAnalyticsService } from '../../../core/services/class-analytics.service';
import { EnrollmentAnalyticsService } from '../../../core/services/enrollment-analytics.service';
import { InstructorAnalyticsService } from '../../../core/services/instructor-analytics.service';
import { ClassAnalyticsResponseDto } from '../dto/response/class-analytics.response.dto';
import { EnrollmentAnalyticsResponseDto } from '../dto/response/enrollment-analytics.response.dto';
import { InstructorAnalyticsResponseDto } from '../dto/response/instructor-analytics.response.dto';

@Controller('admin/analytics')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminScheduleAnalyticsController {
  constructor(
    private readonly classAnalyticsService: ClassAnalyticsService,
    private readonly enrollmentAnalyticsService: EnrollmentAnalyticsService,
    private readonly instructorAnalyticsService: InstructorAnalyticsService,
  ) {}

  @Get('classes')
  async getClassAnalytics(): Promise<ClassAnalyticsResponseDto> {
    return await this.classAnalyticsService.getClassAnalytics();
  }

  @Get('enrollments')
  async getEnrollmentAnalytics(): Promise<EnrollmentAnalyticsResponseDto> {
    return await this.enrollmentAnalyticsService.getEnrollmentAnalytics();
  }

  @Get('instructors')
  async getInstructorAnalytics(): Promise<InstructorAnalyticsResponseDto> {
    return await this.instructorAnalyticsService.getInstructorAnalytics();
  }
}
