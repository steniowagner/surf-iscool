import { Injectable } from '@nestjs/common';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { UserDeviceRepository } from '@src/module/notification/persistence/repository/user-device.repository';

import { UserDeviceModel } from '../model/user-device.model';

type RegisterDeviceParams = {
  userId: string;
  deviceToken: string;
  platform: string;
};

type UnregisterDeviceParams = {
  userId: string;
  deviceToken: string;
};

@Injectable()
export class UserDeviceService {
  constructor(private readonly userDeviceRepository: UserDeviceRepository) {}

  async registerDevice(params: RegisterDeviceParams): Promise<UserDeviceModel> {
    const existingDevice = await this.userDeviceRepository.findByUserIdAndToken(
      params.userId,
      params.deviceToken,
    );

    if (existingDevice) {
      if (existingDevice.isActive) {
        return existingDevice;
      }

      const reactivated = await this.userDeviceRepository.reactivate(
        params.userId,
        params.deviceToken,
      );

      if (!reactivated) {
        throw new DomainException('Failed to reactivate device');
      }

      return reactivated;
    }

    return await this.userDeviceRepository.create({
      userId: params.userId,
      deviceToken: params.deviceToken,
      platform: params.platform,
    });
  }

  async getActiveDevices(userId: string): Promise<UserDeviceModel[]> {
    const devices = await this.userDeviceRepository.findActiveByUserId(userId);
    return devices ?? [];
  }

  async unregisterDevice(
    params: UnregisterDeviceParams,
  ): Promise<UserDeviceModel> {
    const device = await this.userDeviceRepository.findByUserIdAndToken(
      params.userId,
      params.deviceToken,
    );

    if (!device) {
      throw new DomainException('Device not found');
    }

    const deactivated = await this.userDeviceRepository.deactivate(
      params.userId,
      params.deviceToken,
    );

    if (!deactivated) {
      throw new DomainException('Failed to unregister device');
    }

    return deactivated;
  }

  async deleteDevice(params: UnregisterDeviceParams): Promise<UserDeviceModel> {
    const device = await this.userDeviceRepository.findByUserIdAndToken(
      params.userId,
      params.deviceToken,
    );

    if (!device) {
      throw new DomainException('Device not found');
    }

    const deleted = await this.userDeviceRepository.delete(
      params.userId,
      params.deviceToken,
    );

    if (!deleted) {
      throw new DomainException('Failed to delete device');
    }

    return deleted;
  }
}
