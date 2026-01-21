import { IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateCancellationRuleBodyDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @Min(1)
  hoursBeforeClass!: number;
}
