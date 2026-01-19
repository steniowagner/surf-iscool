import { PassportModule } from '@nestjs/passport';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';
import { UserService } from '@src/module/identity/core/services/user.service';
import { ConfigModule } from '@shared-modules/config/config.module';

import { SupabaseAuthStrategy } from './strategies/supabase-auth.strategy';
import { SupabaseAuthService } from './service/supabase-auth.service';
import { AuthGuard } from './guards/auth.guard';
import { AuthService } from './service/auth.service';
import { RolesGuard } from './guards/roles.guard';
import { SUPABASE_AUTH_GUARD } from './utils/constants';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: SUPABASE_AUTH_GUARD }),
    ConfigModule.forRoot(),
    JwtModule.register({}),
  ],
  providers: [
    SupabaseAuthStrategy,
    SupabaseAuthService,
    AuthGuard,
    AuthService,
    RolesGuard,
    UserService,
    UserRepository,
  ],
  exports: [AuthGuard, RolesGuard, UserService],
})
export class AuthModule {}
