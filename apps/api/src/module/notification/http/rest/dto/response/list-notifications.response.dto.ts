import { NotificationModel } from '@src/module/notification/core/model/notification.model';

export class ListNotificationsResponseDto {
  notifications!: NotificationModel[];
  unreadCount!: number;
}
