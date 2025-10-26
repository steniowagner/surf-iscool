export type PersistenceErrorContext = {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  schema?: string;
};

type ErrorOptions = {
  cause?: unknown;
  context?: PersistenceErrorContext;
};

export abstract class PersistenceException extends Error {
  public readonly context?: PersistenceErrorContext;

  constructor(message: string, options: ErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.context = options.context;
  }
}

export class PersistenceInternalException extends PersistenceException {}

export class PersistenceClientException extends PersistenceException {}
