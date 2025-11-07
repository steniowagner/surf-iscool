import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, InferSelectModel } from 'drizzle-orm';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { usersTable } from '@src/module/identity/persistence/database.schema';
import * as schema from '@src/module/identity/persistence/database.schema';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  UserModel,
  UserStatus,
} from '@src/module/identity/core/model/user.model';

type UpdateStatusParams = {
  db: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  status: UserStatus;
  id: string;
};

@Injectable()
export class UserRepository extends DefaultRepository<
  UserModel,
  typeof usersTable
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, usersTable, logger);
  }

  protected mapToModel(data: InferSelectModel<typeof usersTable>): UserModel {
    return UserModel.createFrom(data);
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    try {
      const [row] = await this.db
        .select()
        .from(this.table)
        .where(eq(usersTable.email, email));

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateStatus({ id, db = this.db, status }: UpdateStatusParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          status,
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }
}
