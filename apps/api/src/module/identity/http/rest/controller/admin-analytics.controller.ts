import { Controller, Get, UseGuards } from '@nestjs/common';

import { UserRole } from '@surf-iscool/types';

import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';

import { UserAnalyticsService } from '../../../core/services/user-analytics.service';
import { UserAnalyticsResponseDto } from '../dto/response/user-analytics.response.dto';

@Controller('admin/analytics')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminAnalyticsController {
  constructor(private readonly userAnalyticsService: UserAnalyticsService) {}

  @Get('users')
  async getUserAnalytics(): Promise<UserAnalyticsResponseDto> {
    return await this.userAnalyticsService.getUserAnalytics();
  }
}
