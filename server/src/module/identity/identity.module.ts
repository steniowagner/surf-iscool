import { Module } from '@nestjs/common';

import { IdentityPersistenceModule } from './persistence/identity-persistence.module';
import { UserRepository } from './persistence/repository/user.repository';
import { AuthController } from './http/rest/controller/auth.controller';
import { UserService } from './core/services/user.service';

@Module({
  imports: [IdentityPersistenceModule],
  providers: [UserRepository, UserService],
  controllers: [AuthController],
})
export class IdentityModule {}
