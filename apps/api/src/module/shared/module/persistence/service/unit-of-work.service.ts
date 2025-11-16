import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';

import { DATABASE } from '../util/constants';

@Injectable({ scope: Scope.TRANSIENT })
export class UnitOfWorkService {
  constructor(@Inject(DATABASE) private readonly db: PostgresJsDatabase) {}

  async withTransaction<T>(
    fn: (tx: PgTransaction<any, any, any>) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => fn(tx));
  }
}
