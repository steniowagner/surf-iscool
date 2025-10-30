import { EmailException } from '../exception/email.exception';

export const EMAIL = 'EMAIL';

export type Template = 'ACTIVATE_EMAIL_OTP';

const templateFooter = `
  <p>Atenciosamente,</p>
  <p>Equipe Rocha's Surf School</p>
`;

type ActivateEmailOtpParams = {
  code: string;
  userName: string;
  codeTtl: string;
};

const templates: Record<
  Template,
  (params: Record<string, unknown>) => { subject: string; html: string }
> = {
  ACTIVATE_EMAIL_OTP: (params: ActivateEmailOtpParams) => ({
    subject: 'Aqui está o seu código de ativação',
    html: `
      <p>Olá, ${params.userName}!</p>
      <p>Aqui está o seu código de acesso. Observe que este código será <b>válido por apenas ${params.codeTtl}</b> e poderá ser usado somente uma vez.</p>
      <h3>${params.code}</h3>
      <p>Se você não solicitou este código de acesso, desconsidere este email.</p>
      ${templateFooter}
    `,
  }),
};

export const getEmailTemplate = (template: Template) => {
  if (!templates[template]) {
    throw new EmailException('Template not found');
  }
  return templates[template];
};
