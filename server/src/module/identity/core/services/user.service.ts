import { Injectable } from '@nestjs/common';

import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}
}
