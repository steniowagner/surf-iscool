export class ClassInstructorModel {
  readonly id!: string;
  classId!: string;
  instructorId!: string;
  assignedBy!: string;
  assignedAt!: Date;

  private constructor(data: ClassInstructorModel) {
    Object.assign(this, data);
  }

  static create(
    data: Omit<ClassInstructorModel, 'id' | 'assignedAt'> & {
      id?: string;
      assignedAt?: Date;
    },
  ) {
    return new ClassInstructorModel({
      id: data.id ?? crypto.randomUUID(),
      classId: data.classId,
      instructorId: data.instructorId,
      assignedBy: data.assignedBy,
      assignedAt: data.assignedAt ?? new Date(),
    });
  }

  static createFrom(data: ClassInstructorModel): ClassInstructorModel {
    return new ClassInstructorModel(data);
  }
}
