import { Injectable } from '@nestjs/common';

import { EnrollmentStatus } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';

import { ClassEnrollmentModel } from '../model/class-enrollment.model';

type ListEnrollmentsParams = {
  status?: EnrollmentStatus[];
};

type ApproveEnrollmentParams = {
  enrollmentId: string;
  adminId: string;
};

type DenyEnrollmentParams = {
  enrollmentId: string;
  adminId: string;
  reason?: string;
};

@Injectable()
export class AdminEnrollmentService {
  constructor(
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
  ) {}

  async listEnrollments(
    params: ListEnrollmentsParams = {},
  ): Promise<ClassEnrollmentModel[]> {
    if (params.status && params.status.length > 0) {
      return this.classEnrollmentRepository.findByStatus(params.status);
    }

    return this.classEnrollmentRepository.findByStatus([
      EnrollmentStatus.Pending,
      EnrollmentStatus.Approved,
      EnrollmentStatus.Denied,
      EnrollmentStatus.Cancelled,
    ]);
  }

  async approveEnrollment(
    params: ApproveEnrollmentParams,
  ): Promise<ClassEnrollmentModel> {
    const enrollment = await this.classEnrollmentRepository.findById(
      params.enrollmentId,
    );

    if (!enrollment) throw new DomainException('Enrollment not found');

    if (enrollment.status !== EnrollmentStatus.Pending)
      throw new DomainException('Only pending enrollments can be approved');

    const updatedEnrollment = await this.classEnrollmentRepository.updateStatus(
      {
        id: params.enrollmentId,
        status: EnrollmentStatus.Approved,
        reviewedBy: params.adminId,
      },
    );

    if (!updatedEnrollment)
      throw new DomainException('Failed to approve enrollment');

    return updatedEnrollment;
  }

  async denyEnrollment(
    params: DenyEnrollmentParams,
  ): Promise<ClassEnrollmentModel> {
    const enrollment = await this.classEnrollmentRepository.findById(
      params.enrollmentId,
    );

    if (!enrollment) throw new DomainException('Enrollment not found');

    if (enrollment.status !== EnrollmentStatus.Pending)
      throw new DomainException('Only pending enrollments can be denied');

    const updatedEnrollment = await this.classEnrollmentRepository.updateStatus(
      {
        id: params.enrollmentId,
        status: EnrollmentStatus.Denied,
        reviewedBy: params.adminId,
        denialReason: params.reason,
      },
    );

    if (!updatedEnrollment)
      throw new DomainException('Failed to deny enrollment');

    return updatedEnrollment;
  }
}
