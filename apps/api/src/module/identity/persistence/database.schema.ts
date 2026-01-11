import { text, timestamp, pgEnum, index, uuid } from 'drizzle-orm/pg-core';
import { uniqueIndex } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

import { UserRole, UserStatus } from '@surf-iscool/types';

import { enumToPgEnum } from '@shared-libs/enum-to-pg-enum';

export const userStatusEnum = pgEnum('user_status', enumToPgEnum(UserStatus));

export const userRoleEnum = pgEnum('user_role', enumToPgEnum(UserRole));

export const usersTable = pgTable(
  'users',
  {
    id: text('id').primaryKey().notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    phone: text('phone'),
    avatarUrl: text('avatar_url'),
    email: text('email').notNull(),
    status: userStatusEnum('status').notNull(),
    role: userRoleEnum('role').notNull(),
    approvedBy: text('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    deniedBy: text('denied_by'),
    deniedAt: timestamp('denied_at', { withTimezone: true }),
    denialReason: text('denial_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('uq_users_email').on(table.email),
    index('idx_users_status').on(table.status),
  ],
);

export const userRoleHistoryTable = pgTable(
  'user_role_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id),
    previousRole: userRoleEnum('previous_role').notNull(),
    newRole: userRoleEnum('new_role').notNull(),
    changedBy: text('changed_by')
      .notNull()
      .references(() => usersTable.id),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_user_role_history_user_id').on(table.userId)],
);
