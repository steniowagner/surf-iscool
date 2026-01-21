import { IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

import { EnrollmentStatus } from '@surf-iscool/types';

export class ListEnrollmentsQueryDto {
  @IsOptional()
  @IsEnum(EnrollmentStatus, { each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  status?: EnrollmentStatus[];
}
