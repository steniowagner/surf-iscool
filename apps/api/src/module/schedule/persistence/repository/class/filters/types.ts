import { ClassStatus } from '@surf-iscool/types';
import { type SQL } from 'drizzle-orm';

export type ClassFilters = {
  status?: ClassStatus;
  startDate?: Date;
  endDate?: Date;
};

export type ClassFilterStrategy = {
  shouldApply: (query: ClassFilters) => boolean;
  toSQL: (query: ClassFilters) => SQL | undefined;
};
