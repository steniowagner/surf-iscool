import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import { CredentialLocalModel } from '../../core/model/credential-local.model';
import { credentialsLocal } from '../database.schema';
import * as schema from '../database.schema';

@Injectable()
export class CredentialLocalRepository extends DefaultRepository<
  CredentialLocalModel,
  typeof credentialsLocal
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, credentialsLocal, logger);
  }

  protected mapToModel(
    data: InferSelectModel<typeof credentialsLocal>,
  ): CredentialLocalModel {
    return CredentialLocalModel.createFrom(data);
  }
}
