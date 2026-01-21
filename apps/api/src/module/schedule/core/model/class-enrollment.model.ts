type CreateClassEnrollmentParams = Omit<
  ClassEnrollmentModel,
  'id' | 'enrolledAt'
> & {
  id?: string;
  enrolledAt?: Date;
};

export class ClassEnrollmentModel {
  readonly id!: string;
  classId!: string;
  studentId!: string;
  enrolledAt!: Date;

  private constructor(data: ClassEnrollmentModel) {
    Object.assign(this, data);
  }

  static create(data: CreateClassEnrollmentParams) {
    return new ClassEnrollmentModel({
      id: data.id ?? crypto.randomUUID(),
      classId: data.classId,
      studentId: data.studentId,
      enrolledAt: data.enrolledAt ?? new Date(),
    });
  }

  static createFrom(data: ClassEnrollmentModel): ClassEnrollmentModel {
    return new ClassEnrollmentModel(data);
  }
}
