import { faker } from '@faker-js/faker';

import {
  UserStatus,
  Discipline,
  SkillLevel,
  ClassStatus,
  EnrollmentStatus,
} from '@surf-iscool/types';
import { generateId } from '@shared-libs/genereate-id';
import { UserModel } from '@src/module/identity/core/model/user.model';
import { ClassModel } from '@src/module/schedule/core/model/class.model';
import { ClassInstructorModel } from '@src/module/schedule/core/model/class-instructor.model';
import { ClassEnrollmentModel } from '@src/module/schedule/core/model/class-enrollment.model';

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
