import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, and, InferSelectModel, count } from 'drizzle-orm';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-modules/persistence/exception/storage.exception';
import { getPgErrorMetadata } from '@shared-modules/persistence/util/get-pg-metadata';

import { classEnrollmentsTable } from '../database.schema';
import * as schema from '../database.schema';
import { ClassEnrollmentModel } from '../../core/model/class-enrollment.model';

type DbInstance =
  | PostgresJsDatabase<typeof schema>
  | PgTransaction<any, any, any>;

type CreateParams = {
  db?: DbInstance;
  classId: string;
  studentId: string;
};

type DeleteParams = {
  db?: DbInstance;
  classId: string;
  studentId: string;
};

@Injectable()
export class ClassEnrollmentRepository {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {}

  private mapToModel(
    data: InferSelectModel<typeof classEnrollmentsTable>,
  ): ClassEnrollmentModel {
    return ClassEnrollmentModel.createFrom(
      data as unknown as ClassEnrollmentModel,
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
        'Student already enrolled in this class',
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

  async create({ db = this.db, classId, studentId }: CreateParams) {
    try {
      const [row] = await db
        .insert(classEnrollmentsTable)
        .values({
          classId,
          studentId,
        })
        .returning();

      return this.mapToModel(row);
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByClassId(classId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .select()
        .from(classEnrollmentsTable)
        .where(eq(classEnrollmentsTable.classId, classId));

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByStudentId(studentId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .select()
        .from(classEnrollmentsTable)
        .where(eq(classEnrollmentsTable.studentId, studentId));

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
        .from(classEnrollmentsTable)
        .where(
          and(
            eq(classEnrollmentsTable.classId, classId),
            eq(classEnrollmentsTable.studentId, studentId),
          ),
        );

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete({ db = this.db, classId, studentId }: DeleteParams) {
    try {
      const [row] = await db
        .delete(classEnrollmentsTable)
        .where(
          and(
            eq(classEnrollmentsTable.classId, classId),
            eq(classEnrollmentsTable.studentId, studentId),
          ),
        )
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async countByClassId(classId: string, db: DbInstance = this.db) {
    try {
      const [result] = await db
        .select({ count: count() })
        .from(classEnrollmentsTable)
        .where(eq(classEnrollmentsTable.classId, classId));

      return result?.count ?? 0;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteByClassId(classId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .delete(classEnrollmentsTable)
        .where(eq(classEnrollmentsTable.classId, classId))
        .returning();

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }
}
