type CreateCancellationRuleParams = Omit<
  CancellationRuleModel,
  'id' | 'isActive' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export class CancellationRuleModel {
  readonly id!: string;
  name!: string;
  hoursBeforeClass!: number;
  isActive!: boolean;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;

  private constructor(data: CancellationRuleModel) {
    Object.assign(this, data);
  }

  static create(data: CreateCancellationRuleParams) {
    return new CancellationRuleModel({
      id: data.id ?? crypto.randomUUID(),
      name: data.name,
      hoursBeforeClass: data.hoursBeforeClass,
      isActive: data.isActive ?? true,
      createdBy: data.createdBy,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    });
  }

  static createFrom(data: CancellationRuleModel): CancellationRuleModel {
    return new CancellationRuleModel(data);
  }
}
