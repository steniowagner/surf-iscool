import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, and, InferSelectModel, SQL, gte, lte, desc } from 'drizzle-orm';

import { ClassStatus } from '@surf-iscool/types';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PaginatedResult,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  getPaginatedCount,
  buildPaginatedResult,
  getPaginationOffset,
} from '@shared-libs/pagination';

import { ClassModel } from '../../../core/model/class.model';
import { classesTable } from '../../database.schema';
import * as schema from '../../database.schema';
import { ClassFilters } from './filters/types';
import { buildWhereClause } from './filters';

export type FindAllParams = ClassFilters & {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  page?: number;
  pageSize?: number;
};

type UpdateParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  id: string;
  discipline?: ClassModel['discipline'];
  skillLevel?: ClassModel['skillLevel'];
  scheduledAt?: Date;
  duration?: number;
  location?: string;
  maxCapacity?: number;
};

type CancelParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  id: string;
  cancellationReason?: string;
};

@Injectable()
export class ClassRepository extends DefaultRepository<
  ClassModel,
  typeof classesTable
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, classesTable, logger);
  }

  protected mapToModel(
    data: InferSelectModel<typeof classesTable>,
  ): ClassModel {
    return ClassModel.createFrom(data as unknown as ClassModel);
  }

  async findAll({
    db = this.db,
    status,
    startDate,
    endDate,
    page = DEFAULT_PAGE,
    pageSize = DEFAULT_PAGE_SIZE,
  }: FindAllParams = {}): Promise<PaginatedResult<ClassModel>> {
    try {
      const whereClause = buildWhereClause({ status, startDate, endDate });

      const total = await getPaginatedCount({
        db,
        table: this.table,
        whereClause,
      });

      const offset = getPaginationOffset(page, pageSize);
      const dataQuery = db
        .select()
        .from(this.table)
        .orderBy(desc(this.table.scheduledAt))
        .limit(pageSize)
        .offset(offset);

      const rows = whereClause
        ? await dataQuery.where(whereClause)
        : await dataQuery;

      return buildPaginatedResult({
        data: rows.map((row) => this.mapToModel(row)),
        total,
        page,
        pageSize,
      });
    } catch (error) {
      this.handleError(error);
    }
  }

  async update({
    id,
    db = this.db,
    discipline,
    skillLevel,
    scheduledAt,
    duration,
    location,
    maxCapacity,
  }: UpdateParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          discipline,
          skillLevel,
          scheduledAt,
          duration,
          location,
          maxCapacity,
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async cancel({ id, db = this.db, cancellationReason }: CancelParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          status: ClassStatus.Cancelled,
          cancellationReason,
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async complete({
    id,
    db = this.db,
  }: {
    id: string;
    db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  }) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          status: ClassStatus.Completed,
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }
}
