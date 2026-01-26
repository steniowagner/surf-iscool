import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, and, InferSelectModel, count, desc, sql } from 'drizzle-orm';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-modules/persistence/exception/storage.exception';
import { getPgErrorMetadata } from '@shared-modules/persistence/util/get-pg-metadata';

import { classInstructorsTable } from '../database.schema';
import * as schema from '../database.schema';
import { ClassInstructorModel } from '../../core/model/class-instructor.model';

type CreateParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  classId: string;
  instructorId: string;
  assignedBy: string;
};

type DeleteParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  classId: string;
  instructorId: string;
};

@Injectable()
export class ClassInstructorRepository {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {}

  private mapToModel(
    data: InferSelectModel<typeof classInstructorsTable>,
  ): ClassInstructorModel {
    return ClassInstructorModel.createFrom(
      data as unknown as ClassInstructorModel,
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

    if (code === '23505')
      throw new PersistenceClientException(
        'Instructor already assigned to this class',
        { cause: error, context: { constraint, table, detail, code } },
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
    classId,
    instructorId,
    assignedBy,
  }: CreateParams) {
    try {
      const [row] = await db
        .insert(classInstructorsTable)
        .values({
          classId,
          instructorId,
          assignedBy,
        })
        .returning();

      return this.mapToModel(row);
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByClassId(
    classId: string,
    db: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any> = this
      .db,
  ) {
    try {
      const rows = await db
        .select()
        .from(classInstructorsTable)
        .where(eq(classInstructorsTable.classId, classId));

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByInstructorId(
    instructorId: string,
    db: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any> = this
      .db,
  ) {
    try {
      const rows = await db
        .select()
        .from(classInstructorsTable)
        .where(eq(classInstructorsTable.instructorId, instructorId));

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete({ db = this.db, classId, instructorId }: DeleteParams) {
    try {
      const [row] = await db
        .delete(classInstructorsTable)
        .where(
          and(
            eq(classInstructorsTable.classId, classId),
            eq(classInstructorsTable.instructorId, instructorId),
          ),
        )
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteByClassId(
    classId: string,
    db: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any> = this
      .db,
  ) {
    try {
      const rows = await db
        .delete(classInstructorsTable)
        .where(eq(classInstructorsTable.classId, classId))
        .returning();

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async countClassesPerInstructor(
    db: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any> = this
      .db,
  ) {
    try {
      const rows = await db
        .select({
          instructorId: classInstructorsTable.instructorId,
          classCount: count(),
        })
        .from(classInstructorsTable)
        .groupBy(classInstructorsTable.instructorId)
        .orderBy(desc(count()));

      return rows.map((row) => ({
        instructorId: row.instructorId,
        classCount: Number(row.classCount),
      }));
    } catch (error) {
      this.handleError(error);
    }
  }

  async countTotalAssignments(
    db: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any> = this
      .db,
  ) {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(classInstructorsTable);

      return result?.count ?? 0;
    } catch (error) {
      this.handleError(error);
    }
  }

  async countUniqueInstructors(
    db: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any> = this
      .db,
  ) {
    try {
      const [result] = await db
        .select({
          count: sql<number>`count(distinct ${classInstructorsTable.instructorId})`,
        })
        .from(classInstructorsTable);

      return Number(result?.count ?? 0);
    } catch (error) {
      this.handleError(error);
    }
  }
}
