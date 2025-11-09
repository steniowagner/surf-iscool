import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@shared-modules/security/decorators/current-user.decorator';

import { JwtAuthGuard } from '@shared-modules/security/guards/jwt-auth.guard';
import { RolesGuard } from '@shared-modules/security/guards/roles.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor() {}

  @Get('me')
  getMyProfile(@CurrentUser() user: UserModel) {
    console.log(user);
  }
}
