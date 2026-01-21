import { ClassModel } from '@src/module/schedule/core/model/class.model';

export class ListClassesResponseDto {
  classes!: ClassModel[];
  total!: number;
  page!: number;
  pageSize!: number;
  totalPages!: number;
}
