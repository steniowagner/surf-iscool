import {
  IsNotEmpty,
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

export class CreateClassRequestDto {
  @IsNotEmpty()
  @IsEnum(Discipline)
  discipline!: Discipline;

  @IsNotEmpty()
  @IsEnum(SkillLevel)
  skillLevel!: SkillLevel;

  @IsNotEmpty()
  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  duration?: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  location!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  maxCapacity!: number;
}
