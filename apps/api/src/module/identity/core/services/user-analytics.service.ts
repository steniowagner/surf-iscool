import { Injectable } from '@nestjs/common';

import { UserRole, UserStatus } from '@surf-iscool/types';

import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';

export type UserAnalytics = {
  totalUsers: number;
  byRole: Record<UserRole, number>;
  byStatus: Record<UserStatus, number>;
};

@Injectable()
export class UserAnalyticsService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUserAnalytics(): Promise<UserAnalytics> {
    const [totalUsers, byRole, byStatus] = await Promise.all([
      this.userRepository.countTotal(),
      this.userRepository.countByRole(),
      this.userRepository.countByStatus(),
    ]);

    // Ensure all roles have a count (default to 0 if not present)
    const roleCountsComplete = Object.values(UserRole).reduce(
      (acc, role) => {
        acc[role] = byRole?.[role] ?? 0;
        return acc;
      },
      {} as Record<UserRole, number>,
    );

    // Ensure all statuses have a count (default to 0 if not present)
    const statusCountsComplete = Object.values(UserStatus).reduce(
      (acc, status) => {
        acc[status] = byStatus?.[status] ?? 0;
        return acc;
      },
      {} as Record<UserStatus, number>,
    );

    return {
      totalUsers: totalUsers ?? 0,
      byRole: roleCountsComplete,
      byStatus: statusCountsComplete,
    };
  }
}
