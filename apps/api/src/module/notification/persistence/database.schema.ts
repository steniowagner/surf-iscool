import {
  text,
  timestamp,
  pgEnum,
  index,
  uuid,
  jsonb,
  pgTable,
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
