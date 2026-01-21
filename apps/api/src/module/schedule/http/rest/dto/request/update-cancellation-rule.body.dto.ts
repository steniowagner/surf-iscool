import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';

export class UpdateCancellationRuleBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  hoursBeforeClass?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
