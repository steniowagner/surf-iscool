import { gte } from 'drizzle-orm';

import { classesTable } from '../../../../database.schema';
import { ClassFilterStrategy } from '../types';

export const classStartDateFilterStrategy: ClassFilterStrategy = {
  shouldApply: (query) => !!query.startDate,
  toSQL: (query) =>
    query.startDate
      ? gte(classesTable.scheduledAt, query.startDate)
      : undefined,
};
