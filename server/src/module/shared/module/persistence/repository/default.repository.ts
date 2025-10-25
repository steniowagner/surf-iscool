import { AnyPgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { InferSelectModel, eq } from 'drizzle-orm';

import { DefaultModel } from '@shared-core/model/default.model';

export abstract class DefaultRepository<
  M extends DefaultModel,
  T extends PgTableWithColumns<any> & { id: AnyPgColumn },
> {
  constructor(
    protected readonly db: PostgresJsDatabase<any>,
    protected readonly table: T,
  ) {}

  protected abstract mapToModel(data: InferSelectModel<T>): M;

  async create(model: M): Promise<void> {
    await this.db.insert(this.table).values(model);
  }

  async findById(id: InferSelectModel<T>['id']): Promise<M | null> {
    const res = await this.db
      .select()
      .from(this.table as unknown as PgTableWithColumns<any>)
      .where(eq(this.table.id, id));
    return res.length ? this.mapToModel(res[0] as InferSelectModel<T>) : null;
  }
}
