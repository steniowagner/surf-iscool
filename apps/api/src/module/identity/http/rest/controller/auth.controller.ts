import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { UserModel } from '@src/module/identity/core/model/user.model';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';

import { GetMyProfileResponseDto } from '../dto/response/get-my-profile.response.dto';

@Controller('auth')
@UseGuards(AuthGuard, RolesGuard)
export class AuthController {
  constructor() {}

  @Get('me')
  getMyProfile(@CurrentUser() profile: UserModel): GetMyProfileResponseDto {
    return { profile };
  }
}
