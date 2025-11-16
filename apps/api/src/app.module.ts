import { Module } from '@nestjs/common';

import { ConfigModule } from '@shared-modules/config/config.module';
import { IdentityModule } from '@src/module/identity/identity.module';

@Module({
  imports: [ConfigModule.forRoot(), IdentityModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
