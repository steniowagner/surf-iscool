import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { ConfigService } from '@shared-modules/config/service/config.service';

import { getEmailTemplate, TemplateParamsById } from '../util/templates';
import { TemplateId } from '../util/constants';

type SendParams<T extends TemplateId> = {
  userEmail: string;
  template: T;
  templateParams: TemplateParamsById[T];
};

@Injectable()
export class EmailService {
  private client: Resend;

  constructor(
    private readonly loggerService: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.client = new Resend(this.configService.get('resendApiKey'));
  }

  private handleError(userEmail: string, error: any) {
    this.loggerService.error(`Failed to send email to ${userEmail}`, error);
  }

  async send<T extends TemplateId>(params: SendParams<T>) {
    try {
      const template = getEmailTemplate(params.template)(params.templateParams);
      const result = await this.client.emails.send({
        from: this.configService.get('noReplyEmailSender'),
        to: [params.userEmail],
        subject: template.subject,
        html: template.html,
      });
      if (result.error) {
        this.handleError(params.userEmail, result.error);
      }
    } catch (error: any) {
      this.handleError(params.userEmail, error);
    }
  }
}
