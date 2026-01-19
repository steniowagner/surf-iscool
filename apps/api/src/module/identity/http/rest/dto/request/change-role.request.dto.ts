import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { UserRole } from '@surf-iscool/types';

export class ChangeRoleRequestDto {
  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
