import { NotificationType } from '@surf-iscool/types';

type CreateNotificationParams = Omit<
  NotificationModel,
  'id' | 'createdAt' | 'readAt'
> & {
  id?: string;
  createdAt?: Date;
  readAt?: Date | null;
};

export class NotificationModel {
  readonly id!: string;
  userId!: string;
  type!: NotificationType;
  title!: string;
  body!: string;
  data!: Record<string, unknown> | null;
  readAt!: Date | null;
  createdAt!: Date;

  private constructor(data: NotificationModel) {
    Object.assign(this, data);
  }

  static create(data: CreateNotificationParams) {
    return new NotificationModel({
      id: data.id ?? crypto.randomUUID(),
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      data: data.data ?? null,
      readAt: data.readAt ?? null,
      createdAt: data.createdAt ?? new Date(),
    });
  }

  static createFrom(data: NotificationModel): NotificationModel {
    return new NotificationModel(data);
  }
}
