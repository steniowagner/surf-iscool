import { Module } from '@nestjs/common';

import { AuthModule } from '@shared-modules/auth/auth.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { IdentityPersistenceModule } from './persistence/identity-persistence.module';
import { AdminUsersController } from './http/rest/controller/admin-users.controller';
import { AdminAnalyticsController } from './http/rest/controller/admin-analytics.controller';
import { AuthController } from './http/rest/controller/auth.controller';
import { AdminUserService } from './core/services/admin-user.service';
import { UserAnalyticsService } from './core/services/user-analytics.service';

@Module({
  imports: [ConfigModule.forRoot(), IdentityPersistenceModule, AuthModule],
  providers: [AdminUserService, UserAnalyticsService],
  controllers: [AuthController, AdminUsersController, AdminAnalyticsController],
})
export class IdentityModule {}
