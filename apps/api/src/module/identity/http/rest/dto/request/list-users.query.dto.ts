import { IsOptional, IsEnum } from 'class-validator';

import { UserStatus, UserRole } from '@surf-iscool/types';

export class ListUsersQueryDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
