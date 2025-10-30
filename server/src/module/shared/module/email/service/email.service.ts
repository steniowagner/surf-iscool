import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { ConfigService } from '@shared-modules/config/service/config.service';

import { getEmailTemplate, Template } from '../util/constants';

type SendParams = {
  templateParams: Record<string, unknown>;
  template: Template;
  userEmail: string;
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

  async send(params: SendParams) {
    try {
      const template = getEmailTemplate(params.template)(params.templateParams);
      const { data, error } = await this.client.emails.send({
        from: this.configService.get('noReplyEmailSender'),
        to: [params.userEmail],
        subject: template.subject,
        html: template.html,
      });

      console.log(data);

      if (error) {
        return console.error({ error });
      }
    } catch (error: any) {
      this.loggerService.error(
        `Failed to send email to ${params.userEmail}`,
        error,
      );
    }
  }
}
