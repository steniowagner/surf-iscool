import { AvailableClass } from '@src/module/schedule/core/services/student-class.service';

export class ListAvailableClassesResponseDto {
  classes!: AvailableClass[];
  total!: number;
  page!: number;
  pageSize!: number;
  totalPages!: number;
}
