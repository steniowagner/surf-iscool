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
import { ClassResponseDto } from '../dto/response/class.response.dto';

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
}
