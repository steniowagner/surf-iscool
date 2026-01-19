import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';

import { UserRole } from '@surf-iscool/types';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { userRoleHistoryTable } from '@src/module/identity/persistence/database.schema';
import * as schema from '@src/module/identity/persistence/database.schema';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-core/exeption/persistence.exception';

type CreateParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  userId: string;
  previousRole: UserRole;
  newRole: UserRole;
  changedBy: string;
  reason?: string;
};

@Injectable()
export class UserRoleHistoryRepository {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {}

  async create({
    db = this.db,
    userId,
    previousRole,
    newRole,
    changedBy,
    reason,
  }: CreateParams) {
    try {
      const [row] = await db
        .insert(userRoleHistoryTable)
        .values({
          userId,
          previousRole,
          newRole,
          changedBy,
          reason,
        })
        .returning();

      return row;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  protected handleError(error: unknown): never {
    if (error instanceof Error && 'code' in error) {
      const pgError = error as { code: string; detail?: string };
      switch (pgError.code) {
        case '23505':
          throw new PersistenceClientException(
            'Duplicate entry',
            pgError.detail,
          );
        case '23503':
          throw new PersistenceClientException(
            'Foreign key constraint violation',
            pgError.detail,
          );
        case '23502':
          throw new PersistenceClientException(
            'Not-null constraint violation',
            pgError.detail,
          );
      }
    }
    this.logger.error('Database error', { error });
    throw new PersistenceInternalException('Database operation failed');
  }
}
