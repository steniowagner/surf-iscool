export type PgErrorMetadata = {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  schema?: string;
};

const isRecord = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;

const readCode = (object: unknown): string | undefined =>
  isRecord(object) && typeof object.code === 'string' ? object.code : undefined;

const readMeta = (object: unknown): Omit<PgErrorMetadata, 'code'> => {
  if (!isRecord(object)) return {};
  return {
    detail: typeof object.detail === 'string' ? object.detail : undefined,
    constraint:
      typeof object.constraint_name === 'string'
        ? object.constraint_name
        : undefined,
    table:
      typeof object.table_name === 'string' ? object.table_name : undefined,
    schema:
      typeof object.schema_name === 'string' ? object.schema_name : undefined,
  };
};

export const getPgErrorMetadata = (error: unknown): PgErrorMetadata => {
  let current = error;
  if (isRecord(current) && isRecord(current.context)) {
    const context = current.context;
    const code = typeof context.code === 'string' ? context.code : undefined;
    if (code) {
      return {
        code,
        detail: typeof context.detail === 'string' ? context.detail : undefined,
        constraint:
          typeof context.constraint === 'string'
            ? context.constraint
            : undefined,
        table: typeof context.table === 'string' ? context.table : undefined,
      };
    }
  }
  while (current) {
    const code = readCode(current);
    if (code) return { code, ...readMeta(current) };
    current =
      isRecord(current) && 'cause' in current ? current.cause : undefined;
  }
  return {};
};
