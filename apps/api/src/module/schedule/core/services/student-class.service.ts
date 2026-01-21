import { Injectable } from '@nestjs/common';

import {
  ClassStatus,
  Discipline,
  SkillLevel,
  EnrollmentStatus,
} from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { PersistenceClientException } from '@shared-modules/persistence/exception/storage.exception';
import { PaginatedResult } from '@shared-libs/pagination';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';
import { CancellationRuleRepository } from '@src/module/schedule/persistence/repository/cancellation-rule.repository';

import { ClassModel } from '../model/class.model';
import { ClassEnrollmentModel } from '../model/class-enrollment.model';

type ListAvailableParams = {
  discipline?: Discipline;
  skillLevel?: SkillLevel;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
};

type EnrollParams = {
  classId: string;
  studentId: string;
  isExperimental?: boolean;
};

type CancelEnrollmentParams = {
  classId: string;
  studentId: string;
  reason?: string;
};

type GetMyEnrollmentsParams = {
  studentId: string;
  page?: number;
  pageSize?: number;
};

export type AvailableClass = ClassModel & {
  enrollmentCount: number;
  spotsRemaining: number;
};

// Statuses that count toward class capacity
const ACTIVE_ENROLLMENT_STATUSES = [
  EnrollmentStatus.Pending,
  EnrollmentStatus.Approved,
];

@Injectable()
export class StudentClassService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
    private readonly cancellationRuleRepository: CancellationRuleRepository,
  ) {}

  async listAvailable(
    params: ListAvailableParams = {},
  ): Promise<PaginatedResult<AvailableClass>> {
    const result = await this.classRepository.findAll({
      status: ClassStatus.Scheduled,
      discipline: params.discipline,
      skillLevel: params.skillLevel,
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      pageSize: params.pageSize,
    });

    const classesWithEnrollment = await Promise.all(
      result.data.map(async (classEntity) => {
        const enrollmentCount =
          await this.classEnrollmentRepository.countByClassIdAndStatuses(
            classEntity.id,
            ACTIVE_ENROLLMENT_STATUSES,
          );
        return {
          ...classEntity,
          enrollmentCount,
          spotsRemaining: classEntity.maxCapacity - enrollmentCount,
        };
      }),
    );

    return {
      ...result,
      data: classesWithEnrollment,
    };
  }

  async findById(id: string): Promise<AvailableClass> {
    const existingClass = await this.classRepository.findById(id);

    if (!existingClass) throw new DomainException('Class not found');

    const enrollmentCount =
      await this.classEnrollmentRepository.countByClassIdAndStatuses(
        id,
        ACTIVE_ENROLLMENT_STATUSES,
      );

    return {
      ...existingClass,
      enrollmentCount,
      spotsRemaining: existingClass.maxCapacity - enrollmentCount,
    };
  }

  async enroll(params: EnrollParams): Promise<ClassEnrollmentModel> {
    const existingClass = await this.classRepository.findById(params.classId);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status === ClassStatus.Cancelled)
      throw new DomainException('Cannot enroll in a cancelled class');

    if (existingClass.status === ClassStatus.Completed)
      throw new DomainException('Cannot enroll in a completed class');

    const enrollmentCount =
      await this.classEnrollmentRepository.countByClassIdAndStatuses(
        params.classId,
        ACTIVE_ENROLLMENT_STATUSES,
      );

    if (enrollmentCount >= existingClass.maxCapacity)
      throw new DomainException('Class is full');

    try {
      return await this.classEnrollmentRepository.create({
        classId: params.classId,
        studentId: params.studentId,
        isExperimental: params.isExperimental,
      });
    } catch (error) {
      if (error instanceof PersistenceClientException)
        throw new DomainException(error.message);

      throw error;
    }
  }

  async cancelEnrollment(
    params: CancelEnrollmentParams,
  ): Promise<ClassEnrollmentModel> {
    const existingClass = await this.classRepository.findById(params.classId);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status === ClassStatus.Cancelled)
      throw new DomainException(
        'Cannot cancel enrollment for a cancelled class',
      );

    if (existingClass.status === ClassStatus.Completed)
      throw new DomainException(
        'Cannot cancel enrollment for a completed class',
      );

    const enrollment =
      await this.classEnrollmentRepository.findByClassAndStudent(
        params.classId,
        params.studentId,
      );

    if (!enrollment) throw new DomainException('Enrollment not found');

    if (enrollment.status === EnrollmentStatus.Cancelled)
      throw new DomainException('Enrollment already cancelled');

    if (enrollment.status === EnrollmentStatus.Denied)
      throw new DomainException('Cannot cancel a denied enrollment');

    // Check cancellation rules
    const activeCancellationRule =
      await this.cancellationRuleRepository.findActive();

    if (activeCancellationRule) {
      const now = new Date();
      const classStartTime = existingClass.scheduledAt;
      const hoursUntilClass =
        (classStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilClass < activeCancellationRule.hoursBeforeClass) {
        throw new DomainException(
          `Cancellation not allowed less than ${activeCancellationRule.hoursBeforeClass} hours before class`,
        );
      }
    }

    const updatedEnrollment = await this.classEnrollmentRepository.updateStatus(
      {
        id: enrollment.id,
        status: EnrollmentStatus.Cancelled,
        cancellationReason: params.reason,
      },
    );

    if (!updatedEnrollment)
      throw new DomainException('Failed to cancel enrollment');

    return updatedEnrollment;
  }

  async getMyEnrollments(
    params: GetMyEnrollmentsParams,
  ): Promise<ClassEnrollmentModel[]> {
    const enrollments = await this.classEnrollmentRepository.findByStudentId(
      params.studentId,
    );

    return enrollments;
  }
}
