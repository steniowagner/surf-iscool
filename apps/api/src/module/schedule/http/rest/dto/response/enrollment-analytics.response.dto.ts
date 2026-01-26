import { EnrollmentStatus } from '@surf-iscool/types';

export class EnrollmentAnalyticsResponseDto {
  totalEnrollments!: number;
  experimentalEnrollments!: number;
  byStatus!: Record<EnrollmentStatus, number>;
}
