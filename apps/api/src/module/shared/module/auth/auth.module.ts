import { PassportModule } from '@nestjs/passport';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';
import { UserService } from '@src/module/identity/core/services/user.service';
import { ConfigModule } from '@shared-modules/config/config.module';

import { FirebaseAuthStrategy } from './strategies/firebase-auth.strategy';
import { FirebaseAuthService } from './service/firebase-auth.service';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './service/auth.service';
import { RolesGuard } from './guards/roles.guard';
import { FIREBASE_AUTH_GUARD } from './utils/constants';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: FIREBASE_AUTH_GUARD }),
    ConfigModule.forRoot(),
    JwtModule.register({}),
  ],
  providers: [
    FirebaseAuthStrategy,
    FirebaseAuthService,
    AuthGuard,
    AuthService,
    RolesGuard,
    UserService,
    UserRepository,
  ],
  exports: [AuthGuard, RolesGuard],
})
export class AuthModule {}
