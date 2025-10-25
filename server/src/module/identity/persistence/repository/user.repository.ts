import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { DATABASE } from '@shared-modules/persistence/persistence.module';
import { usersTable } from '@src/module/identity/persistence/database.schema';
import * as schema from '@src/module/identity/persistence/database.schema';
import { UserModel } from '@src/module/identity/core/model/user.model';

@Injectable()
export class UserRepository extends DefaultRepository<
  UserModel,
  typeof usersTable
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    super(db, usersTable);
  }

  protected mapToModel(data: InferSelectModel<typeof usersTable>): UserModel {
    return UserModel.createFrom(data);
  }
}
