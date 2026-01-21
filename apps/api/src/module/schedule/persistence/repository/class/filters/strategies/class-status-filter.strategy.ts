import { eq } from 'drizzle-orm';

import { classesTable } from '../../../../database.schema';
import { ClassFilterStrategy } from '../types';

export const classStatusFilterStrategy: ClassFilterStrategy = {
  shouldApply: (query) => !!query.status?.trim(),
  toSQL: (query) =>
    query.status ? eq(classesTable.status, query.status) : undefined,
};
