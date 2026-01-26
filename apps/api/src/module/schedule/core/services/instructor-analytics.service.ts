import { Injectable } from '@nestjs/common';

import { ClassInstructorRepository } from '@src/module/schedule/persistence/repository/class-instructor.repository';

type InstructorClassStats = {
  instructorId: string;
  classCount: number;
};

export type InstructorAnalytics = {
  totalAssignments: number;
  uniqueInstructorsWithClasses: number;
  classesPerInstructor: InstructorClassStats[];
};

@Injectable()
export class InstructorAnalyticsService {
  constructor(
    private readonly classInstructorRepository: ClassInstructorRepository,
  ) {}

  async getInstructorAnalytics(): Promise<InstructorAnalytics> {
    const [
      totalAssignments,
      uniqueInstructorsWithClasses,
      classesPerInstructor,
    ] = await Promise.all([
      this.classInstructorRepository.countTotalAssignments(),
      this.classInstructorRepository.countUniqueInstructors(),
      this.classInstructorRepository.countClassesPerInstructor(),
    ]);

    return {
      totalAssignments: totalAssignments ?? 0,
      uniqueInstructorsWithClasses: uniqueInstructorsWithClasses ?? 0,
      classesPerInstructor: classesPerInstructor ?? [],
    };
  }
}
