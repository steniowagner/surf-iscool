import {
  text,
  timestamp,
  pgEnum,
  index,
  uuid,
  integer,
  uniqueIndex,
  pgTable,
  boolean,
} from 'drizzle-orm/pg-core';

import {
  Discipline,
  SkillLevel,
  ClassStatus,
  EnrollmentStatus,
} from '@surf-iscool/types';

import { enumToPgEnum } from '@shared-libs/enum-to-pg-enum';
import { usersTable } from '@src/module/identity/persistence/database.schema';

export const disciplineEnum = pgEnum('discipline', enumToPgEnum(Discipline));
export const skillLevelEnum = pgEnum('skill_level', enumToPgEnum(SkillLevel));
export const classStatusEnum = pgEnum(
  'class_status',
  enumToPgEnum(ClassStatus),
);
export const enrollmentStatusEnum = pgEnum(
  'enrollment_status',
  enumToPgEnum(EnrollmentStatus),
);

export const classesTable = pgTable(
  'classes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    discipline: disciplineEnum('discipline').notNull(),
    skillLevel: skillLevelEnum('skill_level').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    duration: integer('duration').notNull().default(60),
    location: text('location').notNull(),
    maxCapacity: integer('max_capacity').notNull(),
    status: classStatusEnum('status').notNull().default(ClassStatus.Scheduled),
    cancellationReason: text('cancellation_reason'),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_classes_status').on(table.status),
    index('idx_classes_scheduled_at').on(table.scheduledAt),
    index('idx_classes_discipline').on(table.discipline),
  ],
);

export const classInstructorsTable = pgTable(
  'class_instructors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classesTable.id),
    instructorId: text('instructor_id')
      .notNull()
      .references(() => usersTable.id),
    assignedBy: text('assigned_by')
      .notNull()
      .references(() => usersTable.id),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_class_instructors_class_instructor').on(
      table.classId,
      table.instructorId,
    ),
    index('idx_class_instructors_class_id').on(table.classId),
    index('idx_class_instructors_instructor_id').on(table.instructorId),
  ],
);

export const classEnrollmentsTable = pgTable(
  'class_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classesTable.id),
    studentId: text('student_id')
      .notNull()
      .references(() => usersTable.id),
    status: enrollmentStatusEnum('status')
      .notNull()
      .default(EnrollmentStatus.Pending),
    isExperimental: boolean('is_experimental').notNull().default(false),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedBy: text('reviewed_by').references(() => usersTable.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    denialReason: text('denial_reason'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
  },
  (table) => [
    uniqueIndex('uq_class_enrollments_class_student').on(
      table.classId,
      table.studentId,
    ),
    index('idx_class_enrollments_class_id').on(table.classId),
    index('idx_class_enrollments_student_id').on(table.studentId),
    index('idx_class_enrollments_status').on(table.status),
  ],
);

export const cancellationRulesTable = pgTable(
  'cancellation_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    hoursBeforeClass: integer('hours_before_class').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: text('created_by')
      .notNull()
      .references(() => usersTable.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_cancellation_rules_is_active').on(table.isActive)],
);

export const classPhotosTable = pgTable(
  'class_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classesTable.id),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => usersTable.id),
    url: text('url').notNull(),
    caption: text('caption'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_class_photos_class_id').on(table.classId),
    index('idx_class_photos_uploaded_by').on(table.uploadedBy),
  ],
);
