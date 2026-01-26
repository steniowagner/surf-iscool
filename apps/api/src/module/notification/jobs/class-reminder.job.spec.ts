import { Test, TestingModule } from '@nestjs/testing';

import { EnrollmentStatus } from '@surf-iscool/types';

import { ClassReminderJob } from './class-reminder.job';
import { NotificationService } from '../core/services/notification.service';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassInstructorRepository } from '@src/module/schedule/persistence/repository/class-instructor.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';

describe('ClassReminderJob', () => {
  let job: ClassReminderJob;
  let classRepository: jest.Mocked<ClassRepository>;
  let classInstructorRepository: jest.Mocked<ClassInstructorRepository>;
  let classEnrollmentRepository: jest.Mocked<ClassEnrollmentRepository>;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassReminderJob,
        {
          provide: ClassRepository,
          useValue: {
            findScheduledStartingBetween: jest.fn(),
          },
        },
        {
          provide: ClassInstructorRepository,
          useValue: {
            findByClassId: jest.fn(),
          },
        },
        {
          provide: ClassEnrollmentRepository,
          useValue: {
            findByClassId: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            createMany: jest.fn(),
          },
        },
        {
          provide: AppLoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    job = module.get<ClassReminderJob>(ClassReminderJob);
    classRepository = module.get(ClassRepository);
    classInstructorRepository = module.get(ClassInstructorRepository);
    classEnrollmentRepository = module.get(ClassEnrollmentRepository);
    notificationService = module.get(NotificationService);
  });

  describe('handleClassReminders', () => {
    it('should do nothing when no classes are starting soon', async () => {
      classRepository.findScheduledStartingBetween.mockResolvedValue([]);

      await job.handleClassReminders();

      expect(notificationService.createMany).not.toHaveBeenCalled();
    });

    it('should send reminders to instructors and approved students', async () => {
      const mockClass = {
        id: 'class-1',
        location: 'Beach Point',
      };
      classRepository.findScheduledStartingBetween.mockResolvedValue([
        mockClass as any,
      ]);

      classInstructorRepository.findByClassId.mockResolvedValue([
        { instructorId: 'instructor-1' } as any,
        { instructorId: 'instructor-2' } as any,
      ]);

      classEnrollmentRepository.findByClassId.mockResolvedValue([
        { studentId: 'student-1', status: EnrollmentStatus.Approved } as any,
        { studentId: 'student-2', status: EnrollmentStatus.Approved } as any,
        { studentId: 'student-3', status: EnrollmentStatus.Pending } as any,
      ]);

      notificationService.createMany.mockResolvedValue([]);

      await job.handleClassReminders();

      expect(notificationService.createMany).toHaveBeenCalledWith({
        notifications: expect.arrayContaining([
          expect.objectContaining({ userId: 'instructor-1' }),
          expect.objectContaining({ userId: 'instructor-2' }),
          expect.objectContaining({ userId: 'student-1' }),
          expect.objectContaining({ userId: 'student-2' }),
        ]),
      });

      const call = notificationService.createMany.mock.calls[0][0];
      expect(call.notifications).toHaveLength(4);
      expect(
        call.notifications.every((n: any) => n.data.classId === 'class-1'),
      ).toBe(true);
    });

    it('should not send reminders for pending enrollments', async () => {
      const mockClass = {
        id: 'class-1',
        location: 'Beach Point',
      };
      classRepository.findScheduledStartingBetween.mockResolvedValue([
        mockClass as any,
      ]);

      classInstructorRepository.findByClassId.mockResolvedValue([]);

      classEnrollmentRepository.findByClassId.mockResolvedValue([
        { studentId: 'student-1', status: EnrollmentStatus.Pending } as any,
      ]);

      await job.handleClassReminders();

      expect(notificationService.createMany).not.toHaveBeenCalled();
    });

    it('should handle multiple classes', async () => {
      const mockClasses = [
        { id: 'class-1', location: 'Beach Point' },
        { id: 'class-2', location: 'Skate Park' },
      ];
      classRepository.findScheduledStartingBetween.mockResolvedValue(
        mockClasses as any,
      );

      classInstructorRepository.findByClassId.mockResolvedValue([
        { instructorId: 'instructor-1' } as any,
      ]);

      classEnrollmentRepository.findByClassId.mockResolvedValue([]);

      notificationService.createMany.mockResolvedValue([]);

      await job.handleClassReminders();

      expect(notificationService.createMany).toHaveBeenCalledTimes(2);
    });
  });
});
