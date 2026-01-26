import { Injectable } from '@nestjs/common';

import { ClassStatus, EnrollmentStatus } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassRatingRepository } from '@src/module/schedule/persistence/repository/class-rating.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';

import { ClassRatingModel } from '../model/class-rating.model';

type RateClassParams = {
  classId: string;
  studentId: string;
  rating: number;
  comment?: string;
};

type ClassRatingStats = {
  averageRating: number | null;
  totalRatings: number;
};

@Injectable()
export class ClassRatingService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly classRatingRepository: ClassRatingRepository,
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
  ) {}

  async rateClass(params: RateClassParams): Promise<ClassRatingModel> {
    if (params.rating < 1 || params.rating > 5)
      throw new DomainException('Rating must be between 1 and 5');

    const existingClass = await this.classRepository.findById(params.classId);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status !== ClassStatus.Completed)
      throw new DomainException('You can only rate completed classes');

    // Check if student was enrolled and approved
    const enrollment =
      await this.classEnrollmentRepository.findByClassAndStudent(
        params.classId,
        params.studentId,
      );

    if (!enrollment || enrollment.status !== EnrollmentStatus.Approved)
      throw new DomainException(
        'You can only rate classes you were enrolled in',
      );

    // Check if student already rated this class
    const existingRating =
      await this.classRatingRepository.findByClassAndStudent(
        params.classId,
        params.studentId,
      );

    if (existingRating)
      throw new DomainException('You have already rated this class');

    return await this.classRatingRepository.create({
      classId: params.classId,
      studentId: params.studentId,
      rating: params.rating,
      comment: params.comment,
    });
  }

  async listRatings(classId: string): Promise<ClassRatingModel[]> {
    const existingClass = await this.classRepository.findById(classId);

    if (!existingClass) throw new DomainException('Class not found');

    return await this.classRatingRepository.findByClassId(classId);
  }

  async getClassRatingStats(classId: string): Promise<ClassRatingStats> {
    const existingClass = await this.classRepository.findById(classId);

    if (!existingClass) throw new DomainException('Class not found');

    const [averageRating, totalRatings] = await Promise.all([
      this.classRatingRepository.getAverageRatingByClassId(classId),
      this.classRatingRepository.countByClassId(classId),
    ]);

    return {
      averageRating,
      totalRatings,
    };
  }
}
