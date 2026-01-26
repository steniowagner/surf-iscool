import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { NotificationType, EnrollmentStatus } from '@surf-iscool/types';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';

import { NotificationService } from '../core/services/notification.service';

@Injectable()
export class RateClassJob {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
    private readonly notificationService: NotificationService,
    private readonly logger: AppLoggerService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleRateClassPrompts() {
    this.logger.log('Running rate class job');

    try {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const twentyFiveMinutesAgo = new Date(now.getTime() - 25 * 60 * 1000);

      const classes = await this.classRepository.findCompletedEndedBetween(
        thirtyMinutesAgo,
        twentyFiveMinutesAgo,
      );

      if (!classes || classes.length === 0) {
        this.logger.log('No classes ended 30 minutes ago');
        return;
      }

      this.logger.log(
        `Found ${classes.length} classes that ended ~30 minutes ago`,
      );

      for (const classItem of classes) {
        await this.sendRatePromptsForClass(classItem.id);
      }
    } catch (error) {
      this.logger.error('Error running rate class job', { error });
    }
  }

  private async sendRatePromptsForClass(classId: string) {
    const enrollments =
      await this.classEnrollmentRepository.findByClassId(classId);

    if (!enrollments) {
      this.logger.log(`No enrollments found for class ${classId}`);
      return;
    }

    const approvedStudents = enrollments.filter(
      (e) => e.status === EnrollmentStatus.Approved,
    );

    if (approvedStudents.length === 0) {
      this.logger.log(`No approved students for class ${classId}`);
      return;
    }

    const notifications = approvedStudents.map((enrollment) => ({
      userId: enrollment.studentId,
      type: NotificationType.RateClass,
      title: 'How was your class?',
      body: 'We would love to hear your feedback. Please rate your recent class!',
      data: { classId },
    }));

    await this.notificationService.createMany({ notifications });
    this.logger.log(
      `Sent ${notifications.length} rate prompts for class ${classId}`,
    );
  }
}
