import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '@shared-modules/auth/guards/firebase-auth.guard';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

@Controller('auth')
@UseGuards(FirebaseAuthGuard, RolesGuard)
export class AuthController {
  constructor() {}

  @Get('me')
  getMyProfile(@CurrentUser() user: UserModel) {
    return user;
  }
}
