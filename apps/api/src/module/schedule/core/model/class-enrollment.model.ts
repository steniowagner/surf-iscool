import { EnrollmentStatus } from '@surf-iscool/types';

type CreateClassEnrollmentParams = Omit<
  ClassEnrollmentModel,
  | 'id'
  | 'enrolledAt'
  | 'status'
  | 'isExperimental'
  | 'reviewedBy'
  | 'reviewedAt'
  | 'denialReason'
  | 'cancelledAt'
  | 'cancellationReason'
> & {
  id?: string;
  enrolledAt?: Date;
  status?: EnrollmentStatus;
  isExperimental?: boolean;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  denialReason?: string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
};

export class ClassEnrollmentModel {
  readonly id!: string;
  classId!: string;
  studentId!: string;
  status!: EnrollmentStatus;
  isExperimental!: boolean;
  enrolledAt!: Date;
  reviewedBy!: string | null;
  reviewedAt!: Date | null;
  denialReason!: string | null;
  cancelledAt!: Date | null;
  cancellationReason!: string | null;

  private constructor(data: ClassEnrollmentModel) {
    Object.assign(this, data);
  }

  static create(data: CreateClassEnrollmentParams) {
    return new ClassEnrollmentModel({
      id: data.id ?? crypto.randomUUID(),
      classId: data.classId,
      studentId: data.studentId,
      status: data.status ?? EnrollmentStatus.Pending,
      isExperimental: data.isExperimental ?? false,
      enrolledAt: data.enrolledAt ?? new Date(),
      reviewedBy: data.reviewedBy ?? null,
      reviewedAt: data.reviewedAt ?? null,
      denialReason: data.denialReason ?? null,
      cancelledAt: data.cancelledAt ?? null,
      cancellationReason: data.cancellationReason ?? null,
    });
  }

  static createFrom(data: ClassEnrollmentModel): ClassEnrollmentModel {
    return new ClassEnrollmentModel(data);
  }
}
