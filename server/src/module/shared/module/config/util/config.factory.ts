import { ConfigException } from '../exception/config.exception';
import { configSchema } from './config.schema';
import { Config } from './config.type';

export const factory = (): Config => {
  const result = configSchema.safeParse({
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    passwordMinLength: process.env.PASSWORD_MIN_LENGTH,
    passwordHashSalt: process.env.PASSWORD_HASH_SALT,
    verificationEmailExpirationMinutes:
      process.env.VERIFICATION_EMAIL_EXPIRATION_MINUTES,
    resendApiKey: process.env.RESEND_API_KEY,
    noReplyEmailSender: process.env.NO_REPLY_EMAIL_SENDER,
    database: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    },
  });

  if (result.success) {
    return result.data;
  }

  throw new ConfigException(
    `Invalid application configuration: ${result.error.message}`,
  );
};
