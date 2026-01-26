import { ClassStatus, Discipline, SkillLevel } from '@surf-iscool/types';

export class ClassAnalyticsResponseDto {
  totalClasses!: number;
  byStatus!: Record<ClassStatus, number>;
  byDiscipline!: Record<Discipline, number>;
  bySkillLevel!: Record<SkillLevel, number>;
}
