import { PassportModule } from '@nestjs/passport';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';
import { UserService } from '@src/module/identity/core/services/user.service';
import { ConfigModule } from '@shared-modules/config/config.module';

import { FirebaseAuthStrategy } from './strategies/firebase-auth.strategy';
import { FirebaseAuthService } from './service/firebase-auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { AuthService } from './service/auth.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'firebase' }),
    JwtModule.register({}),
  ],
  providers: [
    AuthService,
    FirebaseAuthStrategy,
    FirebaseAuthGuard,
    FirebaseAuthService,
    RolesGuard,
    UserService,
    UserRepository,
  ],
  exports: [FirebaseAuthGuard, RolesGuard],
})
export class SecurityModule {}
