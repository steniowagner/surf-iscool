export class RatingAnalyticsResponseDto {
  totalRatings!: number;
  averageRating!: number | null;
  byRating!: Record<number, number>;
}
