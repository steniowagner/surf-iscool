import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { NotificationType, EnrollmentStatus } from '@surf-iscool/types';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassInstructorRepository } from '@src/module/schedule/persistence/repository/class-instructor.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';

import { NotificationService } from '../core/services/notification.service';

@Injectable()
export class ClassReminderJob {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly classInstructorRepository: ClassInstructorRepository,
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
    private readonly notificationService: NotificationService,
    private readonly logger: AppLoggerService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleClassReminders() {
    this.logger.log('Running class reminder job');

    try {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
      const thirtyFiveMinutesFromNow = new Date(now.getTime() + 35 * 60 * 1000);

      const classes = await this.classRepository.findScheduledStartingBetween(
        thirtyMinutesFromNow,
        thirtyFiveMinutesFromNow,
      );

      if (!classes || classes.length === 0) {
        this.logger.log('No classes starting in 30 minutes');
        return;
      }

      this.logger.log(
        `Found ${classes.length} classes starting in ~30 minutes`,
      );

      for (const classItem of classes) {
        await this.sendRemindersForClass(classItem.id, classItem.location);
      }
    } catch (error) {
      this.logger.error('Error running class reminder job', { error });
    }
  }

  private async sendRemindersForClass(classId: string, location: string) {
    const userIds: string[] = [];

    const instructors =
      await this.classInstructorRepository.findByClassId(classId);
    if (instructors) {
      userIds.push(...instructors.map((i) => i.instructorId));
    }

    const enrollments =
      await this.classEnrollmentRepository.findByClassId(classId);
    if (enrollments) {
      const approvedStudents = enrollments.filter(
        (e) => e.status === EnrollmentStatus.Approved,
      );
      userIds.push(...approvedStudents.map((e) => e.studentId));
    }

    if (userIds.length === 0) {
      this.logger.log(`No users to notify for class ${classId}`);
      return;
    }

    const notifications = userIds.map((userId) => ({
      userId,
      type: NotificationType.ClassReminder,
      title: 'Class Starting Soon',
      body: `Your class at ${location} starts in 30 minutes. Get ready!`,
      data: { classId },
    }));

    await this.notificationService.createMany({ notifications });
    this.logger.log(
      `Sent ${notifications.length} reminders for class ${classId}`,
    );
  }
}
