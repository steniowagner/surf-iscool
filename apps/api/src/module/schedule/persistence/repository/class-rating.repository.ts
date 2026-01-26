import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, and, InferSelectModel, desc, avg, count } from 'drizzle-orm';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-modules/persistence/exception/storage.exception';
import { getPgErrorMetadata } from '@shared-modules/persistence/util/get-pg-metadata';

import { classRatingsTable } from '../database.schema';
import * as schema from '../database.schema';
import { ClassRatingModel } from '../../core/model/class-rating.model';

type DbInstance =
  | PostgresJsDatabase<typeof schema>
  | PgTransaction<any, any, any>;

type CreateParams = {
  db?: DbInstance;
  classId: string;
  studentId: string;
  rating: number;
  comment?: string;
};

@Injectable()
export class ClassRatingRepository {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {}

  private mapToModel(
    data: InferSelectModel<typeof classRatingsTable>,
  ): ClassRatingModel {
    return ClassRatingModel.createFrom(data as unknown as ClassRatingModel);
  }

  private handleError(error: unknown): never {
    const { code, detail, constraint, table } = getPgErrorMetadata(error);
    this.logger.error(
      `Database error: ${code ? ` ${code}` : ''}` +
        `${table ? ` on ${table}` : ''}${constraint ? `/${constraint}` : ''}` +
        `${detail ? `: ${detail}` : ''}`,
      { meta: { code, detail, constraint, table } },
    );

    if (code === '23505')
      throw new PersistenceClientException('Student already rated this class', {
        cause: error,
        context: { constraint, table, detail, code },
      });

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
    classId,
    studentId,
    rating,
    comment,
  }: CreateParams) {
    try {
      const [row] = await db
        .insert(classRatingsTable)
        .values({
          classId,
          studentId,
          rating,
          comment,
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
        .from(classRatingsTable)
        .where(eq(classRatingsTable.id, id));

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByClassId(classId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .select()
        .from(classRatingsTable)
        .where(eq(classRatingsTable.classId, classId))
        .orderBy(desc(classRatingsTable.createdAt));

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByClassAndStudent(
    classId: string,
    studentId: string,
    db: DbInstance = this.db,
  ) {
    try {
      const [row] = await db
        .select()
        .from(classRatingsTable)
        .where(
          and(
            eq(classRatingsTable.classId, classId),
            eq(classRatingsTable.studentId, studentId),
          ),
        );

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAverageRatingByClassId(classId: string, db: DbInstance = this.db) {
    try {
      const [result] = await db
        .select({ average: avg(classRatingsTable.rating) })
        .from(classRatingsTable)
        .where(eq(classRatingsTable.classId, classId));

      return result?.average ? parseFloat(result.average) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async countByClassId(classId: string, db: DbInstance = this.db) {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(classRatingsTable)
        .where(eq(classRatingsTable.classId, classId));

      return result?.count ?? 0;
    } catch (error) {
      this.handleError(error);
    }
  }
}
