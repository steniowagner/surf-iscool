import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, InferSelectModel, desc, isNull, and } from 'drizzle-orm';

import { NotificationType } from '@surf-iscool/types';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-modules/persistence/exception/storage.exception';
import { getPgErrorMetadata } from '@shared-modules/persistence/util/get-pg-metadata';

import { notificationsTable } from '../database.schema';
import * as schema from '../database.schema';
import { NotificationModel } from '../../core/model/notification.model';

type DbInstance =
  | PostgresJsDatabase<typeof schema>
  | PgTransaction<any, any, any>;

type CreateParams = {
  db?: DbInstance;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type CreateManyParams = {
  db?: DbInstance;
  notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }>;
};

@Injectable()
export class NotificationRepository {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {}

  private mapToModel(
    data: InferSelectModel<typeof notificationsTable>,
  ): NotificationModel {
    return NotificationModel.createFrom(data as unknown as NotificationModel);
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
    userId,
    type,
    title,
    body,
    data,
  }: CreateParams) {
    try {
      const [row] = await db
        .insert(notificationsTable)
        .values({
          userId,
          type,
          title,
          body,
          data,
        })
        .returning();

      return this.mapToModel(row);
    } catch (error) {
      this.handleError(error);
    }
  }

  async createMany({ db = this.db, notifications }: CreateManyParams) {
    try {
      const rows = await db
        .insert(notificationsTable)
        .values(notifications)
        .returning();

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async findById(id: string, db: DbInstance = this.db) {
    try {
      const [row] = await db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.id, id));

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByUserId(userId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
        .orderBy(desc(notificationsTable.createdAt));

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async findUnreadByUserId(userId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, userId),
            isNull(notificationsTable.readAt),
          ),
        )
        .orderBy(desc(notificationsTable.createdAt));

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async markAsRead(id: string, db: DbInstance = this.db) {
    try {
      const [row] = await db
        .update(notificationsTable)
        .set({ readAt: new Date() })
        .where(eq(notificationsTable.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async markAllAsRead(userId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .update(notificationsTable)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notificationsTable.userId, userId),
            isNull(notificationsTable.readAt),
          ),
        )
        .returning();

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async countUnreadByUserId(userId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.userId, userId),
            isNull(notificationsTable.readAt),
          ),
        );

      return rows.length;
    } catch (error) {
      this.handleError(error);
    }
  }
}
