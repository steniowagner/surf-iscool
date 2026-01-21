import { eq } from 'drizzle-orm';

import { classesTable } from '../../../../database.schema';
import { ClassFilterStrategy } from '../types';

export const classDisciplineFilterStrategy: ClassFilterStrategy = {
  shouldApply: (query) => !!query.discipline?.trim(),
  toSQL: (query) =>
    query.discipline
      ? eq(classesTable.discipline, query.discipline)
      : undefined,
};
