import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, InferSelectModel, desc } from 'drizzle-orm';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-modules/persistence/exception/storage.exception';
import { getPgErrorMetadata } from '@shared-modules/persistence/util/get-pg-metadata';

import { classPhotosTable } from '../database.schema';
import * as schema from '../database.schema';
import { ClassPhotoModel } from '../../core/model/class-photo.model';

type DbInstance =
  | PostgresJsDatabase<typeof schema>
  | PgTransaction<any, any, any>;

type CreateParams = {
  db?: DbInstance;
  classId: string;
  uploadedBy: string;
  url: string;
  caption?: string;
};

@Injectable()
export class ClassPhotoRepository {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {}

  private mapToModel(
    data: InferSelectModel<typeof classPhotosTable>,
  ): ClassPhotoModel {
    return ClassPhotoModel.createFrom(data as unknown as ClassPhotoModel);
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
    classId,
    uploadedBy,
    url,
    caption,
  }: CreateParams) {
    try {
      const [row] = await db
        .insert(classPhotosTable)
        .values({
          classId,
          uploadedBy,
          url,
          caption,
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
        .from(classPhotosTable)
        .where(eq(classPhotosTable.id, id));

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByClassId(classId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .select()
        .from(classPhotosTable)
        .where(eq(classPhotosTable.classId, classId))
        .orderBy(desc(classPhotosTable.createdAt));

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(id: string, db: DbInstance = this.db) {
    try {
      const [row] = await db
        .delete(classPhotosTable)
        .where(eq(classPhotosTable.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }
}
