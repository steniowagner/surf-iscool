import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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

import { AdminClassService } from '../../../core/services/admin-class.service';
import { CreateClassRequestDto } from '../dto/request/create-class.request.dto';
import { UpdateClassRequestDto } from '../dto/request/update-class.request.dto';
import { CancelClassRequestDto } from '../dto/request/cancel-class.request.dto';
import { ListClassesQueryDto } from '../dto/request/list-classes.query.dto';
import { AssignInstructorRequestDto } from '../dto/request/assign-instructor.request.dto';
import { ClassResponseDto } from '../dto/response/class.response.dto';
import { ListClassesResponseDto } from '../dto/response/list-classes.response.dto';
import { ClassInstructorResponseDto } from '../dto/response/class-instructor.response.dto';

@Controller('admin/classes')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminClassController {
  constructor(private readonly adminClassService: AdminClassService) {}

  @Post()
  async create(
    @Body() body: CreateClassRequestDto,
    @CurrentUser() admin: UserModel,
  ): Promise<ClassResponseDto> {
    const createdClass = await this.adminClassService.create({
      discipline: body.discipline,
      skillLevel: body.skillLevel,
      scheduledAt: new Date(body.scheduledAt),
      duration: body.duration,
      location: body.location,
      maxCapacity: body.maxCapacity,
      createdBy: admin.id,
    });
    return { class: createdClass };
  }

  @Get()
  async list(
    @Query() query: ListClassesQueryDto,
  ): Promise<ListClassesResponseDto> {
    const result = await this.adminClassService.list({
      status: query.status,
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

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ClassResponseDto> {
    const foundClass = await this.adminClassService.findById(id);
    return { class: foundClass };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClassRequestDto,
  ): Promise<ClassResponseDto> {
    const updatedClass = await this.adminClassService.update({
      id,
      discipline: body.discipline,
      skillLevel: body.skillLevel,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      duration: body.duration,
      location: body.location,
      maxCapacity: body.maxCapacity,
    });
    return { class: updatedClass };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Body() body?: CancelClassRequestDto,
  ): Promise<ClassResponseDto> {
    const cancelledClass = await this.adminClassService.cancel({
      id,
      cancellationReason: body?.cancellationReason,
    });
    return { class: cancelledClass };
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(@Param('id') id: string): Promise<ClassResponseDto> {
    const completedClass = await this.adminClassService.complete(id);
    return { class: completedClass };
  }

  @Post(':id/instructors')
  async assignInstructor(
    @Param('id') classId: string,
    @Body() body: AssignInstructorRequestDto,
    @CurrentUser() admin: UserModel,
  ): Promise<ClassInstructorResponseDto> {
    const classInstructor = await this.adminClassService.assignInstructor({
      classId,
      instructorId: body.instructorId,
      assignedBy: admin.id,
    });
    return { classInstructor };
  }

  @Delete(':id/instructors/:instructorId')
  async removeInstructor(
    @Param('id') classId: string,
    @Param('instructorId') instructorId: string,
  ): Promise<ClassInstructorResponseDto> {
    const classInstructor = await this.adminClassService.removeInstructor({
      classId,
      instructorId,
    });
    return { classInstructor };
  }
}
