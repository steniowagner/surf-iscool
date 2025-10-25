import { customType, uniqueIndex } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import {
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

import {
  UserStatus,
  UserRole,
} from '@src/module/identity/core/model/user.model';
import { enumToPgEnum } from '@shared-libs/enum-to-pg-enum';

import { AuthProvider } from '../core/model/auth-provider.model';

export const userStatusEnum = pgEnum('user_status', enumToPgEnum(UserStatus));

export const userRoleEnum = pgEnum('user_role', enumToPgEnum(UserRole));

const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});

export const usersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    phone: text('phone').notNull(),
    avatarUrl: text('avatar_url'),
    email: citext('email').notNull(),
    passwordHash: text('password_hash'),
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

export const authProvider = pgEnum('auth_provider', enumToPgEnum(AuthProvider));

export const authProvidersTable = pgTable(
  'auth_providers',
  {
    id: uuid('id').primaryKey().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    provider: authProvider('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    isEmailVerified: boolean('is_email_verified').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('uq_auth_providers_per_user').on(table.userId, table.provider),
    uniqueIndex('uq_auth_providers_identity').on(
      table.provider,
      table.providerUserId,
    ),
    index('idx_auth_providers_user_id').on(table.userId),
  ],
);
