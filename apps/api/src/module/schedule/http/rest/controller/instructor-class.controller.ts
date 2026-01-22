import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { UserRole } from '@surf-iscool/types';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

import { InstructorClassService } from '../../../core/services/instructor-class.service';
import { ListInstructorClassesResponseDto } from '../dto/response/list-instructor-classes.response.dto';
import { InstructorClassResponseDto } from '../dto/response/instructor-class.response.dto';

@Controller('instructor/classes')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Instructor)
export class InstructorClassController {
  constructor(
    private readonly instructorClassService: InstructorClassService,
  ) {}

  @Get()
  async listMyClasses(
    @CurrentUser() instructor: UserModel,
  ): Promise<ListInstructorClassesResponseDto> {
    const classes = await this.instructorClassService.getMyClasses({
      instructorId: instructor.id,
    });
    return { classes };
  }

  @Get('upcoming')
  async listUpcomingClasses(
    @CurrentUser() instructor: UserModel,
  ): Promise<ListInstructorClassesResponseDto> {
    const classes = await this.instructorClassService.getUpcomingClasses({
      instructorId: instructor.id,
    });
    return { classes };
  }

  @Get('history')
  async listClassHistory(
    @CurrentUser() instructor: UserModel,
  ): Promise<ListInstructorClassesResponseDto> {
    const classes = await this.instructorClassService.getClassHistory({
      instructorId: instructor.id,
    });
    return { classes };
  }

  @Get(':id')
  async getClassDetails(
    @Param('id') classId: string,
    @CurrentUser() instructor: UserModel,
  ): Promise<InstructorClassResponseDto> {
    const classDetails = await this.instructorClassService.getClassDetails(
      classId,
      instructor.id,
    );
    return { class: classDetails };
  }
}
