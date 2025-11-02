import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Inject, Injectable } from '@nestjs/common';
import { InferSelectModel } from 'drizzle-orm';

import { DefaultRepository } from '@shared-modules/persistence/repository/default.repository';
import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { DATABASE } from '@shared-modules/persistence/util/constants';

import { EmailPasswordCredentialModel } from '../../core/model/credential-email-password.model';
import { credentialsEmailPassword } from '../database.schema';
import * as schema from '../database.schema';

@Injectable()
export class CredentialEmailPasswordRepository extends DefaultRepository<
  EmailPasswordCredentialModel,
  typeof credentialsEmailPassword
> {
  constructor(
    @Inject(DATABASE)
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly logger: AppLoggerService,
  ) {
    super(db, credentialsEmailPassword, logger);
  }

  protected mapToModel(
    data: InferSelectModel<typeof credentialsEmailPassword>,
  ): EmailPasswordCredentialModel {
    return EmailPasswordCredentialModel.createFrom(data);
  }
}
