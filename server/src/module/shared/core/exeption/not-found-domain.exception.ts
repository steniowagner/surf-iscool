import { DomainException } from './domain.exception';

export class NotFoundDomainException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}
