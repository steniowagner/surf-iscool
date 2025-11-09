import { AnyPgColumn, PgTableWithColumns } from 'drizzle-orm/pg-core';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { InferSelectModel, eq } from 'drizzle-orm';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DefaultModel } from '@shared-core/model/default.model';

import { getPgErrorMetadata } from '../util/get-pg-metadata';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '../exception/storage.exception';

export abstract class DefaultRepository<
  M extends DefaultModel,
  T extends PgTableWithColumns<any> & { id: AnyPgColumn },
> {
  constructor(
    protected readonly db: PostgresJsDatabase<Record<string, unknown>>,
    protected readonly table: T,
    protected readonly logger: AppLoggerService,
  ) {}

  protected abstract mapToModel(data: InferSelectModel<T>): M;

  protected handleError(error: unknown): never {
    const meta = getPgErrorMetadata(error);
    this.logger.error(
      `Database error: ${meta.code ? ` ${meta.code}` : ''}` +
        `${meta.table ? ` on ${meta.table}` : ''}${meta.constraint ? `/${meta.constraint}` : ''}` +
        `${meta.detail ? `: ${meta.detail}` : ''}`,
      { meta },
    );
    this.handleAndThrowError(error);
  }

  private handleAndThrowError(error: unknown): never {
    const { code, detail, constraint, table } = getPgErrorMetadata(error);
    if (code === '23505') {
      throw new PersistenceClientException(
        'duplicate key violates unique constraint',
        { cause: error, context: { constraint, table, detail, code } },
      );
    }
    if (code === '23503') {
      throw new PersistenceClientException('foreign key constraint fails', {
        cause: error,
        context: { constraint, table, detail, code },
      });
    }
    if (code === '23502') {
      throw new PersistenceClientException(
        'null value violates not-null constraint',
        {
          cause: error,
          context: { constraint, table, detail, code },
        },
      );
    }
    throw new PersistenceInternalException('database operation failed', {
      cause: error,
      context: { constraint, table, detail, code },
    });
  }

  async create(
    model: M,
    db:
      | PostgresJsDatabase<Record<string, unknown>>
      | PgTransaction<any, any, any> = this.db,
  ): Promise<M> {
    try {
      const entity = await db.insert(this.table).values(model).returning();
      return this.mapToModel(entity);
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(
    id: InferSelectModel<T>['id'],
    db:
      | PostgresJsDatabase<Record<string, unknown>>
      | PgTransaction<any, any, any> = this.db,
  ): Promise<M | null> {
    try {
      const [row] = await db
        .select()
        .from(this.table as unknown as PgTableWithColumns<any>)
        .where(eq(this.table.id, id));

      return row ? this.mapToModel(row as InferSelectModel<T>) : null;
    } catch (error) {
      this.handleError(error);
    }
  }
}
