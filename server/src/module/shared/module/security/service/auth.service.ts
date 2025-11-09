import { Injectable } from '@nestjs/common';

import { UserService } from '@src/module/identity/core/services/user.service';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async validateCognitoUser(id: string, email: string) {
    let user = await this.userService.findById(id);
    if (!user) {
      user = await this.userService.create(id, email);
    }
    return user;
  }
}
