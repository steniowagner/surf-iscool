import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import { EmailVerification } from '../../core/model/email-verification.model';
import { emailVerifications } from '../database.schema';
import * as schema from '../database.schema';

@Injectable()
export class EmailVerificationRepository extends DefaultRepository<
  EmailVerification,
  typeof emailVerifications
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, emailVerifications, logger);
  }
  protected mapToModel(
    data: InferSelectModel<typeof emailVerifications>,
  ): EmailVerification {
    return EmailVerification.createFrom(data);
  }
}
