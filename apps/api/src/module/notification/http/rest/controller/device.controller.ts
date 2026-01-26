import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

import { UserDeviceService } from '../../../core/services/user-device.service';
import { RegisterDeviceRequestDto } from '../dto/request/register-device.request.dto';
import { DeviceResponseDto } from '../dto/response/device.response.dto';
import { ListDevicesResponseDto } from '../dto/response/list-devices.response.dto';

@Controller('devices')
@UseGuards(AuthGuard)
export class DeviceController {
  constructor(private readonly userDeviceService: UserDeviceService) {}

  @Post()
  async registerDevice(
    @CurrentUser() user: UserModel,
    @Body() body: RegisterDeviceRequestDto,
  ): Promise<DeviceResponseDto> {
    const device = await this.userDeviceService.registerDevice({
      userId: user.id,
      deviceToken: body.deviceToken,
      platform: body.platform,
    });
    return { device };
  }

  @Get()
  async listMyDevices(
    @CurrentUser() user: UserModel,
  ): Promise<ListDevicesResponseDto> {
    const devices = await this.userDeviceService.getActiveDevices(user.id);
    return { devices };
  }

  @Delete(':token')
  async unregisterDevice(
    @Param('token') deviceToken: string,
    @CurrentUser() user: UserModel,
  ): Promise<DeviceResponseDto> {
    const device = await this.userDeviceService.unregisterDevice({
      userId: user.id,
      deviceToken,
    });
    return { device };
  }
}
