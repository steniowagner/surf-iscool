import { Injectable } from '@nestjs/common';

import { EnrollmentStatus } from '@surf-iscool/types';

import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';

export type EnrollmentAnalytics = {
  totalEnrollments: number;
  experimentalEnrollments: number;
  byStatus: Record<EnrollmentStatus, number>;
};

@Injectable()
export class EnrollmentAnalyticsService {
  constructor(
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
  ) {}

  async getEnrollmentAnalytics(): Promise<EnrollmentAnalytics> {
    const [totalEnrollments, byStatus, experimentalEnrollments] =
      await Promise.all([
        this.classEnrollmentRepository.countTotal(),
        this.classEnrollmentRepository.countByStatus(),
        this.classEnrollmentRepository.countExperimental(),
      ]);

    // Ensure all statuses have a count (default to 0 if not present)
    const statusCountsComplete = Object.values(EnrollmentStatus).reduce(
      (acc, status) => {
        acc[status] = byStatus?.[status] ?? 0;
        return acc;
      },
      {} as Record<EnrollmentStatus, number>,
    );

    return {
      totalEnrollments: totalEnrollments ?? 0,
      experimentalEnrollments: experimentalEnrollments ?? 0,
      byStatus: statusCountsComplete,
    };
  }
}
