import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, InferSelectModel, and } from 'drizzle-orm';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';
import {
  PersistenceClientException,
  PersistenceInternalException,
} from '@shared-modules/persistence/exception/storage.exception';
import { getPgErrorMetadata } from '@shared-modules/persistence/util/get-pg-metadata';

import { userDevicesTable } from '../database.schema';
import * as schema from '../database.schema';
import { UserDeviceModel } from '../../core/model/user-device.model';

type DbInstance =
  | PostgresJsDatabase<typeof schema>
  | PgTransaction<any, any, any>;

type CreateParams = {
  db?: DbInstance;
  userId: string;
  deviceToken: string;
  platform: string;
};

@Injectable()
export class UserDeviceRepository {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {}

  private mapToModel(
    data: InferSelectModel<typeof userDevicesTable>,
  ): UserDeviceModel {
    return UserDeviceModel.createFrom(data as unknown as UserDeviceModel);
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
      throw new PersistenceClientException('Device already registered', {
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

  async create({ db = this.db, userId, deviceToken, platform }: CreateParams) {
    try {
      const [row] = await db
        .insert(userDevicesTable)
        .values({
          userId,
          deviceToken,
          platform,
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
        .from(userDevicesTable)
        .where(eq(userDevicesTable.id, id));

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findByUserIdAndToken(
    userId: string,
    deviceToken: string,
    db: DbInstance = this.db,
  ) {
    try {
      const [row] = await db
        .select()
        .from(userDevicesTable)
        .where(
          and(
            eq(userDevicesTable.userId, userId),
            eq(userDevicesTable.deviceToken, deviceToken),
          ),
        );

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findActiveByUserId(userId: string, db: DbInstance = this.db) {
    try {
      const rows = await db
        .select()
        .from(userDevicesTable)
        .where(
          and(
            eq(userDevicesTable.userId, userId),
            eq(userDevicesTable.isActive, true),
          ),
        );

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async deactivate(
    userId: string,
    deviceToken: string,
    db: DbInstance = this.db,
  ) {
    try {
      const [row] = await db
        .update(userDevicesTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(userDevicesTable.userId, userId),
            eq(userDevicesTable.deviceToken, deviceToken),
          ),
        )
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async reactivate(
    userId: string,
    deviceToken: string,
    db: DbInstance = this.db,
  ) {
    try {
      const [row] = await db
        .update(userDevicesTable)
        .set({ isActive: true, updatedAt: new Date() })
        .where(
          and(
            eq(userDevicesTable.userId, userId),
            eq(userDevicesTable.deviceToken, deviceToken),
          ),
        )
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async delete(userId: string, deviceToken: string, db: DbInstance = this.db) {
    try {
      const [row] = await db
        .delete(userDevicesTable)
        .where(
          and(
            eq(userDevicesTable.userId, userId),
            eq(userDevicesTable.deviceToken, deviceToken),
          ),
        )
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }
}
