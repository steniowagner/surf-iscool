import { EmailException } from '../exception/email.exception';
import { TemplateId } from './constants';

export type TemplateParamsById = {
  ACTIVATE_EMAIL_OTP: {
    code: string;
    userName: string;
    codeTtl: string;
  };
};

export type BuiltEmail = { subject: string; html: string };

export type TemplateBuilder<P> = (params: P) => BuiltEmail;

export type TemplateRegistry = {
  [K in TemplateId]: TemplateBuilder<TemplateParamsById[K]>;
};

const templateFooter = `
  <p>Atenciosamente,</p>
  <p>Equipe Rocha's Surf School</p>
`;

const templates: TemplateRegistry = {
  ACTIVATE_EMAIL_OTP: (params) => ({
    subject: 'Aqui está o seu código de ativação',
    html: `
      <p>Olá, ${params.userName}!</p>
      <p>Aqui está o seu código de ativação. Este código será <b>válido por apenas ${params.codeTtl}</b> e poderá ser usado somente uma vez.</p>
      <h3>${params.code}</h3>
      <p>Se você não solicitou este código de acesso, desconsidere este email.</p>
      ${templateFooter}
    `,
  }),
};

export const getEmailTemplate = <T extends TemplateId>(
  template: T,
): TemplateBuilder<TemplateParamsById[T]> => {
  if (!templates[template]) {
    throw new EmailException('Template not found');
  }
  return templates[template];
};
