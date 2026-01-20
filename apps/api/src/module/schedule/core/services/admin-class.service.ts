import { Injectable } from '@nestjs/common';

import { Discipline, SkillLevel } from '@surf-iscool/types';

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
}
