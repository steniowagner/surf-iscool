import { PassportModule } from '@nestjs/passport';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { ConfigModule } from '@shared-modules/config/config.module';

import { CognitoJwtStrategy } from './strategies/cognito-jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './service/auth.service';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  providers: [CognitoJwtStrategy, JwtAuthGuard, RolesGuard, AuthService],
  exports: [JwtAuthGuard, RolesGuard],
})
export class SecurityModule {}
