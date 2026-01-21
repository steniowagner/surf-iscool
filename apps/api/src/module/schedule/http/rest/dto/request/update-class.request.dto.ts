import {
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  IsPositive,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

import { Discipline, SkillLevel } from '@surf-iscool/types';

export class UpdateClassRequestDto {
  @IsOptional()
  @IsEnum(Discipline)
  discipline?: Discipline;

  @IsOptional()
  @IsEnum(SkillLevel)
  skillLevel?: SkillLevel;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  duration?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;
}
