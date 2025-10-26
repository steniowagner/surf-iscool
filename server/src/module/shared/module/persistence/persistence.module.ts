import { DrizzlePostgresModule } from '@knaadh/nestjs-drizzle-postgres';
import { DynamicModule, Module } from '@nestjs/common';

import { ConfigService } from '@shared-modules/config/service/config.service';
import { ConfigModule } from '@shared-modules/config/config.module';
import { LoggerModule } from '@shared-modules/logger/logger.module';

import { UnitOfWorkService } from './service/unit-of-work.service';
import { DATABASE } from './util/constants';

@Module({})
export class PersistenceModule {
  static forRoot(schema: Record<string, any> = {}): DynamicModule {
    return {
      module: PersistenceModule,
      imports: [
        LoggerModule,
        DrizzlePostgresModule.registerAsync({
          tag: DATABASE,
          imports: [ConfigModule.forRoot()],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const host = configService.get('database.host');
            const port = configService.get('database.port');
            const user = configService.get('database.username');
            const password = configService.get('database.password');
            const database = configService.get('database.database');
            return {
              postgres: {
                url: `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`,
              },
              config: { schema, logger: process.env.NODE_ENV !== 'prod' },
            };
          },
        }),
      ],
      providers: [UnitOfWorkService],
      exports: [UnitOfWorkService],
    };
  }
}
