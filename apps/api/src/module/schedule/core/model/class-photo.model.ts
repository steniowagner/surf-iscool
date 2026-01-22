type CreateClassPhotoParams = Omit<ClassPhotoModel, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: Date;
};

export class ClassPhotoModel {
  readonly id!: string;
  classId!: string;
  uploadedBy!: string;
  url!: string;
  caption!: string | null;
  createdAt!: Date;

  private constructor(data: ClassPhotoModel) {
    Object.assign(this, data);
  }

  static create(data: CreateClassPhotoParams) {
    return new ClassPhotoModel({
      id: data.id ?? crypto.randomUUID(),
      classId: data.classId,
      uploadedBy: data.uploadedBy,
      url: data.url,
      caption: data.caption ?? null,
      createdAt: data.createdAt ?? new Date(),
    });
  }

  static createFrom(data: ClassPhotoModel): ClassPhotoModel {
    return new ClassPhotoModel(data);
  }
}
