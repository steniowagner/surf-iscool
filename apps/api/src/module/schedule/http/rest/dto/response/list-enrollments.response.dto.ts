import { ClassEnrollmentModel } from '@src/module/schedule/core/model/class-enrollment.model';

export class ListEnrollmentsResponseDto {
  enrollments!: ClassEnrollmentModel[];
}
