import { faker } from '@faker-js/faker';

import {
  UserStatus,
  Discipline,
  SkillLevel,
  ClassStatus,
  EnrollmentStatus,
  NotificationType,
} from '@surf-iscool/types';
import { generateId } from '@shared-libs/genereate-id';
import { UserModel } from '@src/module/identity/core/model/user.model';
import { ClassModel } from '@src/module/schedule/core/model/class.model';
import { ClassInstructorModel } from '@src/module/schedule/core/model/class-instructor.model';
import { ClassEnrollmentModel } from '@src/module/schedule/core/model/class-enrollment.model';
import { CancellationRuleModel } from '@src/module/schedule/core/model/cancellation-rule.model';
import { ClassPhotoModel } from '@src/module/schedule/core/model/class-photo.model';
import { NotificationModel } from '@src/module/notification/core/model/notification.model';
import { UserDeviceModel } from '@src/module/notification/core/model/user-device.model';

export const makeUser = (overrides: Partial<UserModel> = {}) =>
  UserModel.create({
    id: generateId(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: '5585987654321',
    email: faker.internet.email().toLowerCase(),
    avatarUrl: faker.internet.url(),
    status: UserStatus.PendingProfileInformation,
    ...overrides,
  });

export const makeClass = (overrides: Partial<ClassModel> = {}) => {
  const { deletedAt, ...classData } = ClassModel.create({
    id: generateId(),
    discipline: Discipline.Surf,
    skillLevel: SkillLevel.Beginner,
    scheduledAt: faker.date.future(),
    duration: 60,
    location: faker.location.streetAddress(),
    maxCapacity: 10,
    status: ClassStatus.Scheduled,
    createdBy: generateId(),
    ...overrides,
  });
  return classData;
};

export const makeClassInstructor = (
  overrides: Partial<ClassInstructorModel> = {},
) =>
  ClassInstructorModel.create({
    id: generateId(),
    classId: generateId(),
    instructorId: generateId(),
    assignedBy: generateId(),
    ...overrides,
  });

export const makeClassEnrollment = (
  overrides: Partial<ClassEnrollmentModel> = {},
) =>
  ClassEnrollmentModel.create({
    id: generateId(),
    classId: generateId(),
    studentId: generateId(),
    status: EnrollmentStatus.Pending,
    isExperimental: false,
    ...overrides,
  });

export const makeCancellationRule = (
  overrides: Partial<CancellationRuleModel> = {},
) =>
  CancellationRuleModel.create({
    id: generateId(),
    name: faker.lorem.words(3),
    hoursBeforeClass: 24,
    isActive: true,
    createdBy: generateId(),
    ...overrides,
  });

export const makeClassPhoto = (overrides: Partial<ClassPhotoModel> = {}) =>
  ClassPhotoModel.create({
    id: generateId(),
    classId: generateId(),
    uploadedBy: generateId(),
    url: faker.internet.url(),
    caption: faker.lorem.sentence(),
    ...overrides,
  });

export const makeNotification = (overrides: Partial<NotificationModel> = {}) =>
  NotificationModel.create({
    id: generateId(),
    userId: generateId(),
    type: NotificationType.GlobalAnnouncement,
    title: faker.lorem.sentence(),
    body: faker.lorem.paragraph(),
    data: null,
    ...overrides,
  });

export const makeUserDevice = (overrides: Partial<UserDeviceModel> = {}) =>
  UserDeviceModel.create({
    id: generateId(),
    userId: generateId(),
    deviceToken: faker.string.alphanumeric(64),
    platform: faker.helpers.arrayElement(['ios', 'android']),
    ...overrides,
  });
