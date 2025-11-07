import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, InferSelectModel } from 'drizzle-orm';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import { AuthProviderModel } from '../../core/model/auth-provider.model';
import { authProvidersTable } from '../database.schema';
import * as schema from '../database.schema';

@Injectable()
export class AuthProviderRepository extends DefaultRepository<
  AuthProviderModel,
  typeof authProvidersTable
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, authProvidersTable, logger);
  }

  protected mapToModel(
    data: InferSelectModel<typeof authProvidersTable>,
  ): AuthProviderModel {
    return AuthProviderModel.createFrom(data);
  }

  async verifyEmail(
    userId: string,
    db: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any> = this
      .db,
  ) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          updatedAt: new Date(),
          isEmailVerified: true,
        })
        .where(eq(this.table.userId, userId))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }
}
