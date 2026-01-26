import {
  text,
  timestamp,
  pgEnum,
  index,
  uuid,
  jsonb,
  pgTable,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { NotificationType } from '@surf-iscool/types';

import { enumToPgEnum } from '@shared-libs/enum-to-pg-enum';
import { usersTable } from '@src/module/identity/persistence/database.schema';

export const notificationTypeEnum = pgEnum(
  'notification_type',
  enumToPgEnum(NotificationType),
);

export const notificationsTable = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: jsonb('data'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_notifications_user_id').on(table.userId),
    index('idx_notifications_type').on(table.type),
    index('idx_notifications_read_at').on(table.readAt),
    index('idx_notifications_created_at').on(table.createdAt),
  ],
);

export const userDevicesTable = pgTable(
  'user_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id),
    deviceToken: text('device_token').notNull(),
    platform: text('platform').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_user_devices_user_device_token').on(
      table.userId,
      table.deviceToken,
    ),
    index('idx_user_devices_user_id').on(table.userId),
    index('idx_user_devices_is_active').on(table.isActive),
  ],
);
