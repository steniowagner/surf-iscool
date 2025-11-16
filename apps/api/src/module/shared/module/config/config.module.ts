import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { DynamicModule } from '@nestjs/common';

import { ConfigService } from './service/config.service';
import { factory } from './util/config.factory';

export class ConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: ConfigModule,
      imports: [
        NestConfigModule.forRoot({
          expandVariables: true,
          load: [factory],
        }),
      ],
      providers: [ConfigService],
      exports: [ConfigService],
    };
  }
}
