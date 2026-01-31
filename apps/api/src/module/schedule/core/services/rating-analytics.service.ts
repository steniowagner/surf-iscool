import { Injectable } from '@nestjs/common';

import { ClassRatingRepository } from '@src/module/schedule/persistence/repository/class-rating.repository';

export type RatingAnalytics = {
  totalRatings: number;
  averageRating: number | null;
  byRating: Record<number, number>;
};

@Injectable()
export class RatingAnalyticsService {
  constructor(private readonly classRatingRepository: ClassRatingRepository) {}

  async getRatingAnalytics(): Promise<RatingAnalytics> {
    const [totalRatings, averageRating, byRating] = await Promise.all([
      this.classRatingRepository.countTotal(),
      this.classRatingRepository.getAverageRating(),
      this.classRatingRepository.countByRating(),
    ]);

    // Ensure all rating values (1-5) have a count (default to 0 if not present)
    const ratingCountsComplete = [1, 2, 3, 4, 5].reduce(
      (acc, rating) => {
        acc[rating] = byRating?.[rating] ?? 0;
        return acc;
      },
      {} as Record<number, number>,
    );

    return {
      totalRatings: totalRatings ?? 0,
      averageRating: averageRating ?? null,
      byRating: ratingCountsComplete,
    };
  }
}
