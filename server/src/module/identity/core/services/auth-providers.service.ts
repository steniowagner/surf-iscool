import { Injectable } from '@nestjs/common';

import { AuthProviderRepository } from '@src/module/identity/persistence/repository/auth-provider.repository';

@Injectable()
export class AuthProviderService {
  constructor(
    private readonly authProviderRepository: AuthProviderRepository,
  ) {}
}
