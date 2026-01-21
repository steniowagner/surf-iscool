import { Injectable } from '@nestjs/common';

import { ClassStatus, Discipline, SkillLevel } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { PersistenceClientException } from '@shared-modules/persistence/exception/storage.exception';
import { PaginatedResult } from '@shared-libs/pagination';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';

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
};

type CancelEnrollmentParams = {
  classId: string;
  studentId: string;
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

@Injectable()
export class StudentClassService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
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
          await this.classEnrollmentRepository.countByClassId(classEntity.id);
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
      await this.classEnrollmentRepository.countByClassId(id);

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

    const enrollmentCount = await this.classEnrollmentRepository.countByClassId(
      params.classId,
    );

    if (enrollmentCount >= existingClass.maxCapacity)
      throw new DomainException('Class is full');

    try {
      return await this.classEnrollmentRepository.create({
        classId: params.classId,
        studentId: params.studentId,
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

    const enrollment = await this.classEnrollmentRepository.delete({
      classId: params.classId,
      studentId: params.studentId,
    });

    if (!enrollment) throw new DomainException('Enrollment not found');

    return enrollment;
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
