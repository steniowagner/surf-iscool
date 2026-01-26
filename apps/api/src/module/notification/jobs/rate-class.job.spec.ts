import { Test, TestingModule } from '@nestjs/testing';

import { EnrollmentStatus } from '@surf-iscool/types';

import { RateClassJob } from './rate-class.job';
import { NotificationService } from '../core/services/notification.service';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';

describe('RateClassJob', () => {
  let job: RateClassJob;
  let classRepository: jest.Mocked<ClassRepository>;
  let classEnrollmentRepository: jest.Mocked<ClassEnrollmentRepository>;
  let notificationService: jest.Mocked<NotificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateClassJob,
        {
          provide: ClassRepository,
          useValue: {
            findCompletedEndedBetween: jest.fn(),
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

    job = module.get<RateClassJob>(RateClassJob);
    classRepository = module.get(ClassRepository);
    classEnrollmentRepository = module.get(ClassEnrollmentRepository);
    notificationService = module.get(NotificationService);
  });

  describe('handleRateClassPrompts', () => {
    it('should do nothing when no classes have ended recently', async () => {
      classRepository.findCompletedEndedBetween.mockResolvedValue([]);

      await job.handleRateClassPrompts();

      expect(notificationService.createMany).not.toHaveBeenCalled();
    });

    it('should send rate prompts to approved students only', async () => {
      const mockClass = { id: 'class-1' };
      classRepository.findCompletedEndedBetween.mockResolvedValue([
        mockClass as any,
      ]);

      classEnrollmentRepository.findByClassId.mockResolvedValue([
        { studentId: 'student-1', status: EnrollmentStatus.Approved } as any,
        { studentId: 'student-2', status: EnrollmentStatus.Approved } as any,
        { studentId: 'student-3', status: EnrollmentStatus.Cancelled } as any,
      ]);

      notificationService.createMany.mockResolvedValue([]);

      await job.handleRateClassPrompts();

      expect(notificationService.createMany).toHaveBeenCalledWith({
        notifications: expect.arrayContaining([
          expect.objectContaining({ userId: 'student-1' }),
          expect.objectContaining({ userId: 'student-2' }),
        ]),
      });

      const call = notificationService.createMany.mock.calls[0][0];
      expect(call.notifications).toHaveLength(2);
      expect(
        call.notifications.every((n: any) => n.data.classId === 'class-1'),
      ).toBe(true);
    });

    it('should not send prompts when there are no approved students', async () => {
      const mockClass = { id: 'class-1' };
      classRepository.findCompletedEndedBetween.mockResolvedValue([
        mockClass as any,
      ]);

      classEnrollmentRepository.findByClassId.mockResolvedValue([
        { studentId: 'student-1', status: EnrollmentStatus.Cancelled } as any,
      ]);

      await job.handleRateClassPrompts();

      expect(notificationService.createMany).not.toHaveBeenCalled();
    });

    it('should handle multiple completed classes', async () => {
      const mockClasses = [{ id: 'class-1' }, { id: 'class-2' }];
      classRepository.findCompletedEndedBetween.mockResolvedValue(
        mockClasses as any,
      );

      classEnrollmentRepository.findByClassId.mockResolvedValue([
        { studentId: 'student-1', status: EnrollmentStatus.Approved } as any,
      ]);

      notificationService.createMany.mockResolvedValue([]);

      await job.handleRateClassPrompts();

      expect(notificationService.createMany).toHaveBeenCalledTimes(2);
    });

    it('should handle empty enrollments list', async () => {
      const mockClass = { id: 'class-1' };
      classRepository.findCompletedEndedBetween.mockResolvedValue([
        mockClass as any,
      ]);

      classEnrollmentRepository.findByClassId.mockResolvedValue([]);

      await job.handleRateClassPrompts();

      expect(notificationService.createMany).not.toHaveBeenCalled();
    });
  });
});
