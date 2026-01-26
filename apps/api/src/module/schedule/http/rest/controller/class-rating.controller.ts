import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@surf-iscool/types';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';
import { Roles } from '@shared-modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@shared-modules/auth/guards/roles.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

import { ClassRatingService } from '../../../core/services/class-rating.service';
import { RateClassBodyDto } from '../dto/request/rate-class.body.dto';
import { ClassRatingResponseDto } from '../dto/response/class-rating.response.dto';
import { ListClassRatingsResponseDto } from '../dto/response/list-class-ratings.response.dto';

@Controller('classes')
@UseGuards(AuthGuard)
export class ClassRatingController {
  constructor(private readonly classRatingService: ClassRatingService) {}

  @Post(':classId/ratings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Student)
  async rateClass(
    @Param('classId') classId: string,
    @CurrentUser() user: UserModel,
    @Body() body: RateClassBodyDto,
  ): Promise<ClassRatingResponseDto> {
    const rating = await this.classRatingService.rateClass({
      classId,
      studentId: user.id,
      rating: body.rating,
      comment: body.comment,
    });
    return { rating };
  }

  @Get(':classId/ratings')
  async listRatings(
    @Param('classId') classId: string,
  ): Promise<ListClassRatingsResponseDto> {
    const [ratings, stats] = await Promise.all([
      this.classRatingService.listRatings(classId),
      this.classRatingService.getClassRatingStats(classId),
    ]);
    return {
      ratings,
      averageRating: stats.averageRating,
      totalRatings: stats.totalRatings,
    };
  }
}
