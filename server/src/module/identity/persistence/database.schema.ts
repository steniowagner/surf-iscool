import { uniqueIndex } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import {
  uuid,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  numeric,
} from 'drizzle-orm/pg-core';

import {
  UserStatus,
  UserRole,
} from '@src/module/identity/core/model/user.model';
import { enumToPgEnum } from '@shared-libs/enum-to-pg-enum';

import { AuthProvider } from '../core/model/auth-provider.model';
import {
  Purpose as EmailVerificationPurpose,
  TokenType,
} from '../core/model/email-verification.model';

export const userStatusEnum = pgEnum('user_status', enumToPgEnum(UserStatus));

export const userRoleEnum = pgEnum('user_role', enumToPgEnum(UserRole));

export const authProvider = pgEnum('auth_provider', enumToPgEnum(AuthProvider));

export const emailVerificationPurposeEnum = pgEnum(
  'purpose',
  EmailVerificationPurpose,
);

export const emailVerificationTokenTypeEnum = pgEnum('token_type', TokenType);

export const usersTable = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),
    phone: text('phone').notNull(),
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

export const credentialsEmailPassword = pgTable('credentials_email_password', {
  id: uuid('id').primaryKey().notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailVerifications = pgTable(
  'email_verifications',
  {
    id: uuid('id').primaryKey().notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    tokenType: emailVerificationTokenTypeEnum('token_type').notNull(),
    purpose: emailVerificationPurposeEnum('purpose').notNull(),
    attempts: numeric('attempts', { mode: 'number' }).notNull(),
    maxAttempts: numeric('max_attempts', { mode: 'number' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    {
      idxTokenHash: index('idx_email_verifications_token_hash').on(
        table.tokenHash,
      ),
      idxUserExpires: index('idx_email_verifications_user_expires').on(
        table.userId,
        table.expiresAt,
      ),
    },
  ],
);
