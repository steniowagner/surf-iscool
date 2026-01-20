import { lte } from 'drizzle-orm';

import { classesTable } from '../../../../database.schema';
import { ClassFilterStrategy } from '../types';

export const classEndDateFilterStrategy: ClassFilterStrategy = {
  shouldApply: (query) => !!query.endDate,
  toSQL: (query) =>
    query.endDate ? lte(classesTable.scheduledAt, query.endDate) : undefined,
};
