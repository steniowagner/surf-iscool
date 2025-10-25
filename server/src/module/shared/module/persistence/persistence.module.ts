import { DrizzlePostgresModule } from '@knaadh/nestjs-drizzle-postgres';
import { DynamicModule, Module } from '@nestjs/common';

import { ConfigService } from '@shared-modules/config/service/config.service';
import { ConfigModule } from '@shared-modules/config/config.module';

export const DATABASE = 'DATABASE';

@Module({})
export class PersistenceModule {
  static forRoot(schema: Record<string, any> = {}): DynamicModule {
    return {
      module: PersistenceModule,
      imports: [
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
              config: { schema, logger: false },
            };
          },
        }),
      ],
    };
  }
}
