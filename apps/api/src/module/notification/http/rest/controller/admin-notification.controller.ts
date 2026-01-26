import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { UserRole } from '@surf-iscool/types';

import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';

import { NotificationService } from '../../../core/services/notification.service';
import { BroadcastNotificationRequestDto } from '../dto/request/broadcast-notification.request.dto';
import { ListNotificationsResponseDto } from '../dto/response/list-notifications.response.dto';

@Controller('admin/notifications')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('broadcast')
  @HttpCode(HttpStatus.OK)
  async broadcast(
    @Body() body: BroadcastNotificationRequestDto,
  ): Promise<ListNotificationsResponseDto> {
    const notifications = await this.notificationService.broadcast({
      title: body.title,
      body: body.body,
      data: body.data,
    });
    return { notifications, unreadCount: notifications.length };
  }
}
