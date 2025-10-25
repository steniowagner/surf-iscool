import { Controller } from '@nestjs/common';

import { UserService } from '@src/module/identity/core/services/user.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UserService) {}
}
