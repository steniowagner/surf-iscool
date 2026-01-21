import { DefaultModel, WithOptional } from '@shared-core/model/default.model';

import { Discipline, SkillLevel, ClassStatus } from '@surf-iscool/types';

export class ClassModel extends DefaultModel {
  discipline!: Discipline;
  skillLevel!: SkillLevel;
  scheduledAt!: Date;
  duration!: number;
  location!: string;
  maxCapacity!: number;
  status!: ClassStatus;
  cancellationReason?: string | null;
  createdBy!: string;

  private constructor(data: ClassModel) {
    super();
    Object.assign(this, data);
  }

  static create(
    data: WithOptional<
      ClassModel,
      | 'id'
      | 'status'
      | 'duration'
      | 'cancellationReason'
      | 'createdAt'
      | 'updatedAt'
      | 'deletedAt'
    >,
  ) {
    return new ClassModel({
      id: data.id ?? crypto.randomUUID(),
      discipline: data.discipline,
      skillLevel: data.skillLevel,
      scheduledAt: data.scheduledAt,
      duration: data.duration ?? 60,
      location: data.location,
      maxCapacity: data.maxCapacity,
      status: data.status ?? ClassStatus.Scheduled,
      cancellationReason: data.cancellationReason ?? null,
      createdBy: data.createdBy,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      deletedAt: data.deletedAt ?? null,
    });
  }

  static createFrom(data: ClassModel): ClassModel {
    return new ClassModel(data);
  }
}
