import { ClassRatingModel } from '@src/module/schedule/core/model/class-rating.model';

export class ListClassRatingsResponseDto {
  ratings!: ClassRatingModel[];
  averageRating!: number | null;
  totalRatings!: number;
}
