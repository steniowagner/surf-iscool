import { SQL, count } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PgTransaction } from 'drizzle-orm/pg-core';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 15;

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type BuildPaginatedResultParams<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

type GetPaginatedCountParams = {
  db: PostgresJsDatabase<any> | PgTransaction<any, any, any>;
  table: PgTable;
  whereClause?: SQL;
};

export const getPaginatedCount = async ({
  db,
  table,
  whereClause,
}: GetPaginatedCountParams): Promise<number> => {
  const countQuery = db.select({ count: count() }).from(table);
  const [{ count: total }] = whereClause
    ? await countQuery.where(whereClause)
    : await countQuery;

  return Number(total);
};

export const buildPaginatedResult = <T>({
  data,
  total,
  page,
  pageSize,
}: BuildPaginatedResultParams<T>): PaginatedResult<T> => ({
  data,
  total,
  page,
  pageSize,
  totalPages: Math.ceil(total / pageSize),
});

export const getPaginationOffset = (page: number, pageSize: number) =>
  (page - 1) * pageSize;
