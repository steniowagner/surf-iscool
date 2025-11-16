import { text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
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
