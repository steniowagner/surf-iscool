import { Injectable } from '@nestjs/common';

import { NotificationType } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { NotificationRepository } from '@src/module/notification/persistence/repository/notification.repository';

import { NotificationModel } from '../model/notification.model';

type CreateNotificationParams = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type CreateManyNotificationsParams = {
  notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }>;
};

type MarkAsReadParams = {
  notificationId: string;
  userId: string;
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async create(params: CreateNotificationParams): Promise<NotificationModel> {
    return await this.notificationRepository.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data,
    });
  }

  async createMany(
    params: CreateManyNotificationsParams,
  ): Promise<NotificationModel[]> {
    if (params.notifications.length === 0) return [];

    return await this.notificationRepository.createMany({
      notifications: params.notifications,
    });
  }

  async getMyNotifications(userId: string): Promise<NotificationModel[]> {
    return await this.notificationRepository.findByUserId(userId);
  }

  async getUnreadNotifications(userId: string): Promise<NotificationModel[]> {
    return await this.notificationRepository.findUnreadByUserId(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.countUnreadByUserId(userId);
  }

  async markAsRead(params: MarkAsReadParams): Promise<NotificationModel> {
    const notification = await this.notificationRepository.findById(
      params.notificationId,
    );

    if (!notification) throw new DomainException('Notification not found');

    if (notification.userId !== params.userId)
      throw new DomainException(
        'You do not have permission to mark this notification as read',
      );

    if (notification.readAt)
      throw new DomainException('Notification already marked as read');

    const updated = await this.notificationRepository.markAsRead(
      params.notificationId,
    );

    if (!updated)
      throw new DomainException('Failed to mark notification as read');

    return updated;
  }

  async markAllAsRead(userId: string): Promise<NotificationModel[]> {
    return await this.notificationRepository.markAllAsRead(userId);
  }
}
