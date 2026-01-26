type CreateClassRatingParams = Omit<ClassRatingModel, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};

export class ClassRatingModel {
  readonly id!: string;
  classId!: string;
  studentId!: string;
  rating!: number;
  comment!: string | null;
  createdAt!: Date;

  private constructor(data: ClassRatingModel) {
    Object.assign(this, data);
  }

  static create(data: CreateClassRatingParams) {
    return new ClassRatingModel({
      id: data.id ?? crypto.randomUUID(),
      classId: data.classId,
      studentId: data.studentId,
      rating: data.rating,
      comment: data.comment ?? null,
      createdAt: data.createdAt ?? new Date(),
    });
  }

  static createFrom(data: ClassRatingModel): ClassRatingModel {
    return new ClassRatingModel(data);
  }
}
