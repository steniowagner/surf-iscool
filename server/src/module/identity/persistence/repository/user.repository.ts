import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { eq, InferSelectModel } from 'drizzle-orm';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { usersTable } from '@src/module/identity/persistence/database.schema';
import * as schema from '@src/module/identity/persistence/database.schema';
import { UserModel } from '@src/module/identity/core/model/user.model';
import { DATABASE } from '@shared-modules/persistence/util/constants';

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
      const res = await this.db
        .select()
        .from(this.table)
        .where(eq(usersTable.email, email));
      if (res.length === 0) return null;
      return this.mapToModel(res[0]);
    } catch (error) {
      this.handleError(error);
    }
  }
}
