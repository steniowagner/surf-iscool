import { Injectable } from '@nestjs/common';

import { ClassStatus, Discipline, SkillLevel } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { PaginatedResult } from '@shared-libs/pagination';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassInstructorRepository } from '@src/module/schedule/persistence/repository/class-instructor.repository';

import { ClassModel } from '../model/class.model';
import { ClassInstructorModel } from '../model/class-instructor.model';

type CreateClassParams = {
  discipline: Discipline;
  skillLevel: SkillLevel;
  scheduledAt: Date;
  duration?: number;
  location: string;
  maxCapacity: number;
  createdBy: string;
};

type UpdateClassParams = {
  id: string;
  discipline?: Discipline;
  skillLevel?: SkillLevel;
  scheduledAt?: Date;
  duration?: number;
  location?: string;
  maxCapacity?: number;
};

type CancelClassParams = {
  id: string;
  cancellationReason?: string;
};

type ListClassesParams = {
  status?: ClassStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
};

type AssignInstructorParams = {
  classId: string;
  instructorId: string;
  assignedBy: string;
};

type RemoveInstructorParams = {
  classId: string;
  instructorId: string;
};

@Injectable()
export class AdminClassService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly classInstructorRepository: ClassInstructorRepository,
  ) {}

  async create(params: CreateClassParams): Promise<ClassModel> {
    const classModel = ClassModel.create({
      discipline: params.discipline,
      skillLevel: params.skillLevel,
      scheduledAt: params.scheduledAt,
      duration: params.duration,
      location: params.location,
      maxCapacity: params.maxCapacity,
      createdBy: params.createdBy,
    });

    return await this.classRepository.create(classModel);
  }

  async update(params: UpdateClassParams): Promise<ClassModel> {
    const existingClass = await this.classRepository.findById(params.id);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status === ClassStatus.Cancelled)
      throw new DomainException('Cannot update a cancelled class');

    if (existingClass.status === ClassStatus.Completed)
      throw new DomainException('Cannot update a completed class');

    const updatedClass = await this.classRepository.update({
      id: params.id,
      discipline: params.discipline,
      skillLevel: params.skillLevel,
      scheduledAt: params.scheduledAt,
      duration: params.duration,
      location: params.location,
      maxCapacity: params.maxCapacity,
    });

    if (!updatedClass) throw new DomainException('Failed to update class');

    return updatedClass;
  }

  async cancel(params: CancelClassParams): Promise<ClassModel> {
    const existingClass = await this.classRepository.findById(params.id);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status === ClassStatus.Cancelled)
      throw new DomainException('Class is already cancelled');

    if (existingClass.status === ClassStatus.Completed)
      throw new DomainException('Cannot cancel a completed class');

    const cancelledClass = await this.classRepository.cancel({
      id: params.id,
      cancellationReason: params.cancellationReason,
    });

    if (!cancelledClass) throw new DomainException('Failed to cancel class');

    return cancelledClass;
  }

  async complete(id: string): Promise<ClassModel> {
    const existingClass = await this.classRepository.findById(id);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status === ClassStatus.Completed)
      throw new DomainException('Class is already completed');

    if (existingClass.status === ClassStatus.Cancelled)
      throw new DomainException('Cannot complete a cancelled class');

    const completedClass = await this.classRepository.complete({ id });

    if (!completedClass) throw new DomainException('Failed to complete class');

    return completedClass;
  }

  async list(
    params: ListClassesParams = {},
  ): Promise<PaginatedResult<ClassModel>> {
    return await this.classRepository.findAll({
      status: params.status,
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      pageSize: params.pageSize,
    });
  }

  async findById(id: string): Promise<ClassModel> {
    const existingClass = await this.classRepository.findById(id);

    if (!existingClass) throw new DomainException('Class not found');

    return existingClass;
  }

  async assignInstructor(
    params: AssignInstructorParams,
  ): Promise<ClassInstructorModel> {
    const existingClass = await this.classRepository.findById(params.classId);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status === ClassStatus.Cancelled)
      throw new DomainException(
        'Cannot assign instructor to a cancelled class',
      );

    if (existingClass.status === ClassStatus.Completed)
      throw new DomainException(
        'Cannot assign instructor to a completed class',
      );

    return await this.classInstructorRepository.create({
      classId: params.classId,
      instructorId: params.instructorId,
      assignedBy: params.assignedBy,
    });
  }

  async removeInstructor(
    params: RemoveInstructorParams,
  ): Promise<ClassInstructorModel> {
    const existingClass = await this.classRepository.findById(params.classId);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status === ClassStatus.Cancelled)
      throw new DomainException(
        'Cannot remove instructor from a cancelled class',
      );

    if (existingClass.status === ClassStatus.Completed)
      throw new DomainException(
        'Cannot remove instructor from a completed class',
      );

    const removed = await this.classInstructorRepository.delete({
      classId: params.classId,
      instructorId: params.instructorId,
    });

    if (!removed) throw new DomainException('Instructor assignment not found');

    return removed;
  }
}
