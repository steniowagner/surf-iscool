import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { PgTransaction } from 'drizzle-orm/pg-core';
import { eq, and, InferSelectModel, SQL } from 'drizzle-orm';

import { UserStatus, UserRole } from '@surf-iscool/types';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { usersTable } from '@src/module/identity/persistence/database.schema';
import * as schema from '@src/module/identity/persistence/database.schema';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import { UserModel } from '../../core/model/user.model';

type UpdateStatusParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  status: UserStatus;
  id: string;
};

type UpdateProfileParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
};

type SoftDeleteParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  id: string;
};

type FindAllParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  status?: UserStatus;
  role?: UserRole;
};

type ApproveParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  id: string;
  approvedBy: string;
};

type DenyParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  id: string;
  deniedBy: string;
  denialReason?: string;
};

type UpdateRoleParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  id: string;
  role: UserRole;
};

type ReactivateParams = {
  db?: PostgresJsDatabase<typeof schema> | PgTransaction<any, any, any>;
  id: string;
};

@Injectable()
export class UserRepository extends DefaultRepository<
  UserModel,
  typeof usersTable
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, usersTable, logger);
  }

  protected mapToModel(data: InferSelectModel<typeof usersTable>): UserModel {
    return UserModel.createFrom(data);
  }

  async updateStatus({ id, db = this.db, status }: UpdateStatusParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          status,
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateProfile({
    id,
    db = this.db,
    firstName,
    lastName,
    phone,
    avatarUrl,
  }: UpdateProfileParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          firstName,
          lastName,
          phone,
          avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async softDelete({ id, db = this.db }: SoftDeleteParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          deletedAt: new Date(),
          status: UserStatus.Deleted,
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async findAll({ db = this.db, status, role }: FindAllParams = {}) {
    try {
      const conditions: SQL[] = [];

      if (status) {
        conditions.push(eq(this.table.status, status));
      }
      if (role) {
        conditions.push(eq(this.table.role, role));
      }

      const query = db.select().from(this.table);
      const rows =
        conditions.length > 0
          ? await query.where(and(...conditions))
          : await query;

      return rows.map((row) => this.mapToModel(row));
    } catch (error) {
      this.handleError(error);
    }
  }

  async approve({ id, db = this.db, approvedBy }: ApproveParams) {
    try {
      const now = new Date();
      const [row] = await db
        .update(this.table)
        .set({
          status: UserStatus.Active,
          approvedBy,
          approvedAt: now,
          updatedAt: now,
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async deny({ id, db = this.db, deniedBy, denialReason }: DenyParams) {
    try {
      const now = new Date();
      const [row] = await db
        .update(this.table)
        .set({
          status: UserStatus.Denied,
          deniedBy,
          deniedAt: now,
          denialReason,
          updatedAt: now,
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async updateRole({ id, db = this.db, role }: UpdateRoleParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          role,
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning();

      return row ? this.mapToModel(row) : null;
    } catch (error) {
      this.handleError(error);
    }
  }

  async reactivate({ id, db = this.db }: ReactivateParams) {
    try {
      const [row] = await db
        .update(this.table)
        .set({
          status: UserStatus.PendingApproval,
          deletedAt: null,
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
