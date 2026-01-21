import { eq } from 'drizzle-orm';

import { classesTable } from '../../../../database.schema';
import { ClassFilterStrategy } from '../types';

export const classSkillLevelFilterStrategy: ClassFilterStrategy = {
  shouldApply: (query) => !!query.skillLevel?.trim(),
  toSQL: (query) =>
    query.skillLevel
      ? eq(classesTable.skillLevel, query.skillLevel)
      : undefined,
};
