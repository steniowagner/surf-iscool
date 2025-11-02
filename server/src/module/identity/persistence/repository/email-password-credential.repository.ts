import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, InferSelectModel } from 'drizzle-orm';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import { EmailPasswordCredentialModel } from '../../core/model/email-password-credential.model';
import { credentialsEmailPassword } from '../database.schema';
import * as schema from '../database.schema';

type UpdateHashPasswordParams = {
  passwordHash: string;
  userId: string;
  db:
    | PostgresJsDatabase<Record<string, unknown>>
    | PgTransaction<any, any, any>;
};

@Injectable()
export class EmailPasswordCredentialRepository extends DefaultRepository<
  EmailPasswordCredentialModel,
  typeof credentialsEmailPassword
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, credentialsEmailPassword, logger);
  }

  async updateHashPassword({
    db = this.db,
    passwordHash,
    userId,
  }: UpdateHashPasswordParams) {
    try {
      await db
        .update(this.table)
        .set({
          updatedAt: new Date(),
          passwordHash,
        })
        .where(eq(this.table.userId, userId));
    } catch (error) {
      this.handleError(error);
    }
  }

  protected mapToModel(
    data: InferSelectModel<typeof credentialsEmailPassword>,
  ): EmailPasswordCredentialModel {
    return EmailPasswordCredentialModel.createFrom(data);
  }
}
