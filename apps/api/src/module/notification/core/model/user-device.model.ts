type CreateUserDeviceParams = Omit<
  UserDeviceModel,
  'id' | 'createdAt' | 'updatedAt' | 'isActive'
> & {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isActive?: boolean;
};

export class UserDeviceModel {
  readonly id!: string;
  userId!: string;
  deviceToken!: string;
  platform!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  private constructor(data: UserDeviceModel) {
    Object.assign(this, data);
  }

  static create(data: CreateUserDeviceParams) {
    return new UserDeviceModel({
      id: data.id ?? crypto.randomUUID(),
      userId: data.userId,
      deviceToken: data.deviceToken,
      platform: data.platform,
      isActive: data.isActive ?? true,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    });
  }

  static createFrom(data: UserDeviceModel): UserDeviceModel {
    return new UserDeviceModel(data);
  }
}
