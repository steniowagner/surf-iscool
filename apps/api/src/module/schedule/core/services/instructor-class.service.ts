import { Injectable } from '@nestjs/common';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassInstructorRepository } from '@src/module/schedule/persistence/repository/class-instructor.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';

import { ClassModel } from '../model/class.model';
import { ClassEnrollmentModel } from '../model/class-enrollment.model';

type GetMyClassesParams = {
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
}
