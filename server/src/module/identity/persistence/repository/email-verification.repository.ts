import { and, eq, gt, InferSelectModel, isNull } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { Inject, Injectable } from '@nestjs/common';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import {
  EmailVerification,
  Purpose,
} from '../../core/model/email-verification.model';
import { emailVerifications } from '../database.schema';
import * as schema from '../database.schema';

type InvalidateAllActiveParams = {
  db:
    | PostgresJsDatabase<Record<string, unknown>>
    | PgTransaction<any, any, any>;
  userId: string;
  purpose: Purpose;
};

@Injectable()
export class EmailVerificationRepository extends DefaultRepository<
  EmailVerification,
  typeof emailVerifications
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, emailVerifications, logger);
  }

  async invalidateAllActive({
    db = this.db,
    purpose,
    userId,
  }: InvalidateAllActiveParams) {
    try {
      const now = new Date();
      const [updated] = await db
        .update(this.table)
        .set({
          updatedAt: now,
          usedAt: now,
        })
        .where(
          and(
            eq(this.table.userId, userId),
            eq(this.table.purpose, purpose),
            gt(this.table.expiresAt, now),
            isNull(this.table.usedAt),
          ),
        )
        .returning();
      return updated ?? null;
    } catch (error) {
      this.handleError(error);
    }
  }

  protected mapToModel(
    data: InferSelectModel<typeof emailVerifications>,
  ): EmailVerification {
    return EmailVerification.createFrom(data);
  }
}
