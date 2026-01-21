import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@surf-iscool/types';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

import { AdminEnrollmentService } from '../../../core/services/admin-enrollment.service';
import { ListEnrollmentsQueryDto } from '../dto/request/list-enrollments.query.dto';
import { DenyEnrollmentBodyDto } from '../dto/request/deny-enrollment.body.dto';
import { ListEnrollmentsResponseDto } from '../dto/response/list-enrollments.response.dto';
import { EnrollmentResponseDto } from '../dto/response/enrollment.response.dto';

@Controller('admin/enrollments')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminEnrollmentController {
  constructor(
    private readonly adminEnrollmentService: AdminEnrollmentService,
  ) {}

  @Get()
  async listEnrollments(
    @Query() query: ListEnrollmentsQueryDto,
  ): Promise<ListEnrollmentsResponseDto> {
    const enrollments = await this.adminEnrollmentService.listEnrollments({
      status: query.status,
    });
    return { enrollments };
  }

  @Post(':id/approve')
  async approveEnrollment(
    @Param('id') enrollmentId: string,
    @CurrentUser() admin: UserModel,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.adminEnrollmentService.approveEnrollment({
      enrollmentId,
      adminId: admin.id,
    });
    return { enrollment };
  }

  @Post(':id/deny')
  async denyEnrollment(
    @Param('id') enrollmentId: string,
    @CurrentUser() admin: UserModel,
    @Body() body?: DenyEnrollmentBodyDto,
  ): Promise<EnrollmentResponseDto> {
    const enrollment = await this.adminEnrollmentService.denyEnrollment({
      enrollmentId,
      adminId: admin.id,
      reason: body?.reason,
    });
    return { enrollment };
  }
}
