import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { desc, eq, InferSelectModel } from 'drizzle-orm';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { Inject, Injectable } from '@nestjs/common';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import { EmailVerification } from '../../core/model/email-verification.model';
import { emailVerifications } from '../database.schema';
import * as schema from '../database.schema';

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

  async markAsUsed(
    userId: string,
    db:
      | PostgresJsDatabase<Record<string, unknown>>
      | PgTransaction<any, any, any> = this.db,
  ) {
    try {
      const [{ id }] = await db
        .select({ id: this.table.id })
        .from(this.table)
        .where(eq(this.table.userId, userId))
        .orderBy(desc(this.table.createdAt))
        .limit(1);

      const now = new Date();
      const [updated] = await db
        .update(this.table)
        .set({
          updatedAt: now,
          usedAt: now,
        })
        .where(eq(this.table.id, id))
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
