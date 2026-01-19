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
import { UserModel } from '@src/module/identity/core/model/user.model';
import { AdminUserService } from '@src/module/identity/core/services/admin-user.service';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';

import { ListUsersQueryDto } from '../dto/request/list-users.query.dto';
import { DenyUserRequestDto } from '../dto/request/deny-user.request.dto';
import { ChangeRoleRequestDto } from '../dto/request/change-role.request.dto';
import { ListUsersResponseDto } from '../dto/response/list-users.response.dto';
import { UserResponseDto } from '../dto/response/user.response.dto';

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminUsersController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  async listUsers(
    @Query() query: ListUsersQueryDto,
  ): Promise<ListUsersResponseDto> {
    const users = await this.adminUserService.listUsers(query);
    return { users };
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveUser(
    @Param('id') userId: string,
    @CurrentUser() admin: UserModel,
  ): Promise<UserResponseDto> {
    const user = await this.adminUserService.approveUser(userId, admin.id);
    return { user };
  }

  @Post(':id/deny')
  @HttpCode(HttpStatus.OK)
  async denyUser(
    @Param('id') userId: string,
    @CurrentUser() admin: UserModel,
    @Body() body?: DenyUserRequestDto,
  ): Promise<UserResponseDto> {
    const user = await this.adminUserService.denyUser(
      userId,
      admin.id,
      body?.reason,
    );
    return { user };
  }

  @Patch(':id/role')
  async changeRole(
    @Param('id') userId: string,
    @CurrentUser() admin: UserModel,
    @Body() body: ChangeRoleRequestDto,
  ): Promise<UserResponseDto> {
    const user = await this.adminUserService.changeRole({
      userId,
      adminId: admin.id,
      newRole: body.role,
      reason: body.reason,
    });
    return { user };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') userId: string): Promise<void> {
    await this.adminUserService.deleteUser(userId);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateUser(@Param('id') userId: string): Promise<UserResponseDto> {
    const user = await this.adminUserService.reactivateUser(userId);
    return { user };
  }
}
