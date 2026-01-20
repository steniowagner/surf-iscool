import { Injectable } from '@nestjs/common';

import { ClassStatus, Discipline, SkillLevel } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';

import { ClassModel } from '../model/class.model';

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

@Injectable()
export class AdminClassService {
  constructor(private readonly classRepository: ClassRepository) {}

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
}
