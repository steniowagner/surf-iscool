import { UserRole, UserStatus } from '@surf-iscool/types';

export class UserAnalyticsResponseDto {
  totalUsers!: number;
  byRole!: Record<UserRole, number>;
  byStatus!: Record<UserStatus, number>;
}
