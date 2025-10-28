import { Injectable } from '@nestjs/common';
import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
} from '@getbrevo/brevo';

import { AppLoggerService } from '@shared-modules/logger/service/app-logger.service';
import { ConfigService } from '@shared-modules/config/service/config.service';

@Injectable()
export class EmailService {
  private client: TransactionalEmailsApi = new TransactionalEmailsApi();

  constructor(
    private readonly loggerService: AppLoggerService,
    private readonly configService: ConfigService,
  ) {
    this.client.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      this.configService.get('brevoApiKey'),
    );
  }

  async send(to: string) {
    try {
      const result = await this.client.sendTransacEmail({
        to: [{ email: to, name: 'John doe' }],
        subject: 'Hello from Brevo SDK!',
        htmlContent:
          '<h1>This is a transactional email sent using the Brevo SDK.</h1>',
        textContent: 'This is a transactional email sent using the Brevo SDK.',
        sender: { email: to, name: 'John doe' },
      });
      console.log(result);
    } catch (error: any) {
      this.loggerService.error(`Failed to send email to ${to}`, error);
    }
  }
}
