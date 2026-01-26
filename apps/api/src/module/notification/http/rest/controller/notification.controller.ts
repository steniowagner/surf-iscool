import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

import { NotificationService } from '../../../core/services/notification.service';
import { NotificationResponseDto } from '../dto/response/notification.response.dto';
import { ListNotificationsResponseDto } from '../dto/response/list-notifications.response.dto';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async listMyNotifications(
    @CurrentUser() user: UserModel,
  ): Promise<ListNotificationsResponseDto> {
    const [notifications, unreadCount] = await Promise.all([
      this.notificationService.getMyNotifications(user.id),
      this.notificationService.getUnreadCount(user.id),
    ]);
    return { notifications, unreadCount };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: UserModel,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.markAsRead({
      notificationId,
      userId: user.id,
    });
    return { notification };
  }

  @Patch('read-all')
  async markAllAsRead(
    @CurrentUser() user: UserModel,
  ): Promise<ListNotificationsResponseDto> {
    const notifications = await this.notificationService.markAllAsRead(user.id);
    return { notifications, unreadCount: 0 };
  }
}
