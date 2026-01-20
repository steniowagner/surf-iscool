import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UserRole } from '@surf-iscool/types';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { UserModel } from '@src/module/identity/core/model/user.model';
import { UserService } from '@src/module/identity/core/services/user.service';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';

import { UpdateMyProfileRequestDto } from '../dto/request/update-my-profile.request.dto';
import { CompleteProfileRequestDto } from '../dto/request/complete-profile.request.dto';
import { GetMyProfileResponseDto } from '../dto/response/get-my-profile.response.dto';

@Controller('auth')
@UseGuards(AuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getMyProfile(@CurrentUser() profile: UserModel): GetMyProfileResponseDto {
    return { profile };
  }

  @Post('complete-profile')
  @HttpCode(HttpStatus.OK)
  async completeProfile(
    @CurrentUser() currentUser: UserModel,
    @Body() body: CompleteProfileRequestDto,
  ): Promise<GetMyProfileResponseDto> {
    const profile = await this.userService.completeProfile(
      currentUser.id,
      body,
    );
    return { profile };
  }

  @Patch('me')
  async updateMyProfile(
    @CurrentUser() currentUser: UserModel,
    @Body() body: UpdateMyProfileRequestDto,
  ): Promise<GetMyProfileResponseDto> {
    const profile = await this.userService.updateProfile(currentUser.id, body);
    return { profile };
  }

  @Delete('me')
  @Roles(UserRole.Student, UserRole.Instructor)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyAccount(@CurrentUser() currentUser: UserModel): Promise<void> {
    await this.userService.deleteAccount(currentUser.id);
  }
}
