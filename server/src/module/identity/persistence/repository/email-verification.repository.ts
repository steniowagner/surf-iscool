import { and, eq, gt, InferSelectModel, isNull, desc } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { Inject, Injectable } from '@nestjs/common';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import {
  EmailVerificationModel,
  EmailVerificationPurpose,
} from '../../core/model/email-verification.model';
import { emailVerifications } from '../database.schema';
import * as schema from '../database.schema';

type DBType = PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;

type DB = {
  db?: DBType;
};

type InvalidateAllActiveParams = DB & {
  purpose: EmailVerificationPurpose;
  userId: string;
};

type FindActiveByUserAndPurposeParams = DB & {
  purpose: EmailVerificationPurpose;
  userId: string;
};

type UpdateAttemptsParams = DB & {
  attempts: number;
  id: string;
};

type InvalidateParams = DB & {
  isInvalidatingByExceedingMaxAttempts?: boolean;
  emailVerification: EmailVerificationModel;
};

@Injectable()
export class EmailVerificationRepository extends DefaultRepository<
  EmailVerificationModel,
  typeof emailVerifications
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, emailVerifications, logger);
  }

  protected mapToModel(
    data: InferSelectModel<typeof emailVerifications>,
  ): EmailVerificationModel {
    return EmailVerificationModel.createFrom(data);
  }

  async invalidateAllActive({
    db = this.db,
    purpose,
    userId,
  }: InvalidateAllActiveParams) {
    try {
      const now = new Date();
      const [row] = await db
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

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findActiveByUserAndPurpose({
    db = this.db,
    purpose,
    userId,
  }: FindActiveByUserAndPurposeParams) {
    try {
      const [row] = await db
        .select()
        .from(this.table)
        .where(
          and(
            eq(this.table.userId, userId),
            eq(this.table.purpose, purpose),
            isNull(this.table.usedAt),
          ),
        )
        .orderBy(desc(this.table.createdAt))
        .limit(1);

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateAttempts({ id, attempts, db = this.db }: UpdateAttemptsParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({ attempts })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async invalidate({
    isInvalidatingByExceedingMaxAttempts,
    emailVerification,
    db = this.db,
  }: InvalidateParams) {
    try {
      const now = new Date();
      const [row] = await db
        .update(this.table)
        .set({
          usedAt: now,
          updatedAt: now,
          lastAttemptAt: isInvalidatingByExceedingMaxAttempts
            ? new Date()
            : emailVerification.lastAttemptAt,
        })
        .where(
          and(
            eq(this.table.id, emailVerification.id),
            eq(this.table.purpose, emailVerification.purpose),
            isNull(this.table.usedAt),
          ),
        )
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }
}
