import { ClassStatus, Discipline, SkillLevel } from '@surf-iscool/types';
import { type SQL } from 'drizzle-orm';

export type ClassFilters = {
  status?: ClassStatus;
  discipline?: Discipline;
  skillLevel?: SkillLevel;
  startDate?: Date;
  endDate?: Date;
};

export type ClassFilterStrategy = {
  shouldApply: (query: ClassFilters) => boolean;
  toSQL: (query: ClassFilters) => SQL | undefined;
};
