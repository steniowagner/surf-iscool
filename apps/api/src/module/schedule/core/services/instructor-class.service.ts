import { Injectable } from '@nestjs/common';

import { ClassStatus } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassInstructorRepository } from '@src/module/schedule/persistence/repository/class-instructor.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';

import { ClassModel } from '../model/class.model';
import { ClassEnrollmentModel } from '../model/class-enrollment.model';

type GetMyClassesParams = {
  instructorId: string;
};

type GetUpcomingClassesParams = {
  instructorId: string;
  daysAhead?: number;
};

type GetClassHistoryParams = {
  instructorId: string;
};

export type InstructorClassDetails = ClassModel & {
  enrollments: ClassEnrollmentModel[];
  enrollmentCount: number;
};

@Injectable()
export class InstructorClassService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly classInstructorRepository: ClassInstructorRepository,
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
  ) {}

  async getMyClasses(params: GetMyClassesParams): Promise<ClassModel[]> {
    const assignments = await this.classInstructorRepository.findByInstructorId(
      params.instructorId,
    );

    const classes = await Promise.all(
      assignments.map(async (assignment) => {
        return await this.classRepository.findById(assignment.classId);
      }),
    );

    return classes.filter((c): c is ClassModel => c !== null);
  }

  async getClassDetails(
    classId: string,
    instructorId: string,
  ): Promise<InstructorClassDetails> {
    const existingClass = await this.classRepository.findById(classId);

    if (!existingClass) throw new DomainException('Class not found');

    const assignments =
      await this.classInstructorRepository.findByClassId(classId);

    const isAssigned = assignments.some((a) => a.instructorId === instructorId);

    if (!isAssigned)
      throw new DomainException('You are not assigned to this class');

    const enrollments =
      await this.classEnrollmentRepository.findByClassId(classId);

    return {
      ...existingClass,
      enrollments,
      enrollmentCount: enrollments.length,
    };
  }

  async getUpcomingClasses(
    params: GetUpcomingClassesParams,
  ): Promise<ClassModel[]> {
    const { instructorId, daysAhead = 7 } = params;

    const assignments =
      await this.classInstructorRepository.findByInstructorId(instructorId);

    const classes = await Promise.all(
      assignments.map(
        async (assignment) =>
          await this.classRepository.findById(assignment.classId),
      ),
    );

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    return classes
      .filter((c): c is ClassModel => c !== null)
      .filter((c) => {
        const isScheduled = c.status === ClassStatus.Scheduled;
        const isUpcoming = c.scheduledAt >= now && c.scheduledAt <= endDate;
        return isScheduled && isUpcoming;
      })
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  async getClassHistory(params: GetClassHistoryParams): Promise<ClassModel[]> {
    const { instructorId } = params;

    const assignments =
      await this.classInstructorRepository.findByInstructorId(instructorId);

    const classes = await Promise.all(
      assignments.map(async (assignment) => {
        return await this.classRepository.findById(assignment.classId);
      }),
    );

    const now = new Date();

    return classes
      .filter((c): c is ClassModel => c !== null)
      .filter((c) => {
        const isPast = c.scheduledAt < now;
        const isCompleted = c.status === ClassStatus.Completed;
        return isPast || isCompleted;
      })
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }
}
