import { and, type SQL } from 'drizzle-orm';

import { classStartDateFilterStrategy } from './strategies/class-start-date-filter.strategy';
import { classStatusFilterStrategy } from './strategies/class-status-filter.strategy';
import { classEndDateFilterStrategy } from './strategies/class-end-date-filter.strategy';
import { ClassFilterStrategy, ClassFilters } from './types';

const strategies: ClassFilterStrategy[] = [
  classStartDateFilterStrategy,
  classStatusFilterStrategy,
  classEndDateFilterStrategy,
];

export const buildWhereClause = (
  query: ClassFilters = {},
): SQL<unknown> | undefined => {
  const baseQuery: SQL[] = [];
  for (const strategy of strategies) {
    if (strategy.shouldApply(query)) {
      const predicate = strategy.toSQL(query);
      if (predicate) {
        baseQuery.push(predicate);
      }
    }
  }
  return and(...baseQuery);
};
