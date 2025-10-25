import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { InferSelectModel } from 'drizzle-orm';
import { Inject } from '@nestjs/common';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { DATABASE } from '@shared-modules/persistence/persistence.module';

import { AuthProviderModel } from '../../core/model/auth-provider.model';
import { authProvidersTable } from '../database.schema';

export class AuthProviderRepository extends DefaultRepository<
  AuthProviderModel,
  typeof authProvidersTable
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase,
  ) {
    super(db, authProvidersTable);
  }

  protected mapToModel(
    data: InferSelectModel<typeof authProvidersTable>,
  ): AuthProviderModel {
    return AuthProviderModel.createFrom(data);
  }
}
