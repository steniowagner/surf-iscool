import { Injectable } from '@nestjs/common';
import {
  ConfigService as NestConfigService,
  PathValue,
  Path,
} from '@nestjs/config';

import { Config } from '../util/config.type';

@Injectable()
export class ConfigService<C = Config> extends NestConfigService<C, true> {
  override get<P extends Path<C>>(propertyPath: P): PathValue<C, P> {
    return super.get(propertyPath, { infer: true });
  }
}
