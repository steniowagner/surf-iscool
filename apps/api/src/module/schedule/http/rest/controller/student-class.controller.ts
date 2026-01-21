import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UserRole } from '@surf-iscool/types';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

import { StudentClassService } from '../../../core/services/student-class.service';
import { ListAvailableClassesQueryDto } from '../dto/request/list-available-classes.query.dto';
import { AvailableClassResponseDto } from '../dto/response/available-class.response.dto';
import { ListAvailableClassesResponseDto } from '../dto/response/list-available-classes.response.dto';
import { ClassEnrollmentResponseDto } from '../dto/response/class-enrollment.response.dto';
import { MyEnrollmentsResponseDto } from '../dto/response/my-enrollments.response.dto';

@Controller('classes')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Student)
export class StudentClassController {
  constructor(private readonly studentClassService: StudentClassService) {}

  @Get()
  async listAvailable(
    @Query() query: ListAvailableClassesQueryDto,
  ): Promise<ListAvailableClassesResponseDto> {
    const result = await this.studentClassService.listAvailable({
      discipline: query.discipline,
      skillLevel: query.skillLevel,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      classes: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  @Get('me/enrollments')
  async getMyEnrollments(
    @CurrentUser() student: UserModel,
  ): Promise<MyEnrollmentsResponseDto> {
    const enrollments = await this.studentClassService.getMyEnrollments({
      studentId: student.id,
    });
    return { enrollments };
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<AvailableClassResponseDto> {
    const foundClass = await this.studentClassService.findById(id);
    return { class: foundClass };
  }

  @Post(':id/enroll')
  async enroll(
    @Param('id') classId: string,
    @CurrentUser() student: UserModel,
  ): Promise<ClassEnrollmentResponseDto> {
    const enrollment = await this.studentClassService.enroll({
      classId,
      studentId: student.id,
    });
    return { enrollment };
  }

  @Delete(':id/enroll')
  @HttpCode(HttpStatus.OK)
  async cancelEnrollment(
    @Param('id') classId: string,
    @CurrentUser() student: UserModel,
  ): Promise<ClassEnrollmentResponseDto> {
    const enrollment = await this.studentClassService.cancelEnrollment({
      classId,
      studentId: student.id,
    });
    return { enrollment };
  }
}
