import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, InferSelectModel } from 'drizzle-orm';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-modules/persistence/exception/storage.exception';
import { getPgErrorMetadata } from '@shared-modules/persistence/util/get-pg-metadata';

import { cancellationRulesTable } from '../database.schema';
import * as schema from '../database.schema';
import { CancellationRuleModel } from '../../core/model/cancellation-rule.model';

type DbInstance =
  | PostgresJsDatabase<typeof schema>
  | PgTransaction<any, any, any>;

type CreateParams = {
  db?: DbInstance;
  name: string;
  hoursBeforeClass: number;
  createdBy: string;
};

type UpdateParams = {
  db?: DbInstance;
  id: string;
  name?: string;
  hoursBeforeClass?: number;
  isActive?: boolean;
};

@Injectable()
export class CancellationRuleRepository {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {}

  private mapToModel(
    data: InferSelectModel<typeof cancellationRulesTable>,
  ): CancellationRuleModel {
    return CancellationRuleModel.createFrom(
      data as unknown as CancellationRuleModel,
    );
  }

  private handleError(error: unknown): never {
    const { code, detail, constraint, table } = getPgErrorMetadata(error);
    this.logger.error(
      `Database error: ${code ? ` ${code}` : ''}` +
        `${table ? ` on ${table}` : ''}${constraint ? `/${constraint}` : ''}` +
        `${detail ? `: ${detail}` : ''}`,
      { meta: { code, detail, constraint, table } },
    );

    if (code === '23503')
      throw new PersistenceClientException('Referenced record not found', {
        cause: error,
        context: { constraint, table, detail, code },
      });

    throw new PersistenceInternalException('Database operation failed', {
      cause: error,
      context: { constraint, table, detail, code },
    });
  }

  async create({
    db = this.db,
    name,
    hoursBeforeClass,
    createdBy,
  }: CreateParams) {
    try {
      const [row] = await db
        .insert(cancellationRulesTable)
        .values({
          name,
          hoursBeforeClass,
          createdBy,
        })
        .returning();

      return this.mapToModel(row);
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(id: string, db: DbInstance = this.db) {
    try {
      const [row] = await db
        .select()
        .from(cancellationRulesTable)
        .where(eq(cancellationRulesTable.id, id));

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll(db: DbInstance = this.db) {
    try {
      const rows = await db.select().from(cancellationRulesTable);

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async findActive(db: DbInstance = this.db) {
    try {
      const [row] = await db
        .select()
        .from(cancellationRulesTable)
        .where(eq(cancellationRulesTable.isActive, true));

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async update({
    db = this.db,
    id,
    name,
    hoursBeforeClass,
    isActive,
  }: UpdateParams) {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (hoursBeforeClass !== undefined)
        updateData.hoursBeforeClass = hoursBeforeClass;
      if (isActive !== undefined) updateData.isActive = isActive;

      const [row] = await db
        .update(cancellationRulesTable)
        .set(updateData)
        .where(eq(cancellationRulesTable.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string, db: DbInstance = this.db) {
    try {
      const [row] = await db
        .delete(cancellationRulesTable)
        .where(eq(cancellationRulesTable.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deactivateAll(db: DbInstance = this.db) {
    try {
      await db
        .update(cancellationRulesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(cancellationRulesTable.isActive, true));
    } catch (error) {
      this.handleError(error);
    }
  }
}
