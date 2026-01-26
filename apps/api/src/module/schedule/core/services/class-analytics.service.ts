import { Injectable } from '@nestjs/common';

import { ClassStatus, Discipline, SkillLevel } from '@surf-iscool/types';

import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';

export type ClassAnalytics = {
  totalClasses: number;
  byStatus: Record<ClassStatus, number>;
  byDiscipline: Record<Discipline, number>;
  bySkillLevel: Record<SkillLevel, number>;
};

@Injectable()
export class ClassAnalyticsService {
  constructor(private readonly classRepository: ClassRepository) {}

  async getClassAnalytics(): Promise<ClassAnalytics> {
    const [totalClasses, byStatus, byDiscipline, bySkillLevel] =
      await Promise.all([
        this.classRepository.countTotal(),
        this.classRepository.countByStatus(),
        this.classRepository.countByDiscipline(),
        this.classRepository.countBySkillLevel(),
      ]);

    // Ensure all statuses have a count (default to 0 if not present)
    const statusCountsComplete = Object.values(ClassStatus).reduce(
      (acc, status) => {
        acc[status] = byStatus?.[status] ?? 0;
        return acc;
      },
      {} as Record<ClassStatus, number>,
    );

    // Ensure all disciplines have a count (default to 0 if not present)
    const disciplineCountsComplete = Object.values(Discipline).reduce(
      (acc, discipline) => {
        acc[discipline] = byDiscipline?.[discipline] ?? 0;
        return acc;
      },
      {} as Record<Discipline, number>,
    );

    // Ensure all skill levels have a count (default to 0 if not present)
    const skillLevelCountsComplete = Object.values(SkillLevel).reduce(
      (acc, level) => {
        acc[level] = bySkillLevel?.[level] ?? 0;
        return acc;
      },
      {} as Record<SkillLevel, number>,
    );

    return {
      totalClasses: totalClasses ?? 0,
      byStatus: statusCountsComplete,
      byDiscipline: disciplineCountsComplete,
      bySkillLevel: skillLevelCountsComplete,
    };
  }
}
