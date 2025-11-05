import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as crypto from 'crypto';

import { RegisterUsingEmailResponseDto } from '@src/module/identity/http/rest/dto/response/register-using-email.response.dto';

// IdentityModule/auth-email.controller.ts imports RegisterUsingEmailRequestDto, that uses env-vars
// so we need to load the env-vars before import it
import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';
import {
  UserModel,
  UserRole,
  UserStatus,
} from '@src/module/identity/core/model/user.model';
import {
  AuthProvider,
  AuthProviderModel,
} from '@src/module/identity/core/model/auth-provider.model';
import { EmailPasswordCredentialModel } from '@src/module/identity/core/model/email-password-credential.model';
import {
  EmailVerificationModel,
  Purpose,
  TokenType,
} from '@src/module/identity/core/model/email-verification.model';
import { getEmailTemplate } from '@shared-modules/email/util/templates';
import { ConfigService } from '@shared-modules/config/service/config.service';
import { AuthProviderRepository } from '@src/module/identity/persistence/repository/auth-provider.repository';
import { EmailPasswordCredentialRepository } from '@src/module/identity/persistence/repository/email-password-credential.repository';
import { EmailVerificationRepository } from '@src/module/identity/persistence/repository/email-verification.repository';
import { UserRepository } from '@src/module/identity/persistence/repository/user.repository';
import { HasherService } from '@shared-modules/security/service/hasher.service';

import { decodeSecret, isUUID, createTestApp, TestDb } from '../../utils';
import { sendEmailMock } from '../../../__mocks__/resend';
import { Tables } from '../../enum/tables.enum';
import { userFactory } from '../../factory';

const NOW = new Date('2025-01-01');

describe('identity/use-case/register-user-using-email', () => {
  let app: INestApplication;
  let module: TestingModule;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([
      Tables.CredentialsEmailPassword,
      Tables.EmailVerifications,
      Tables.AuthProviders,
      Tables.Users,
    ]);
    await testDbClient.init();

    const nestTestSetup = await createTestApp([
      ConfigModule.forRoot(),
      IdentityModule,
    ]);
    app = nestTestSetup.app;
    module = nestTestSetup.module;
  });

  beforeEach(() => {
    jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
  });

  afterEach(async () => {
    await testDbClient.clean();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await module.close();
    await testDbClient.destroy();
  });

  it('should register an user using e-mail', async () => {
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
    const response = await request(app.getHttpServer())
      .post('/auth/email')
      .send(body);
    // .expect(HttpStatus.CREATED);
    console.log(response.body);
    const data = response.body as RegisterUsingEmailResponseDto;
    // response body
    expect(new Date(data.expiresAt)).toBeInstanceOf(Date);
    expect(data.activationEmailSent).toEqual(true);
    // reading envolved tables
    const [users, authProviders, emailPasswordCredentials, emailVerifications] =
      await Promise.all([
        testDbClient.instance(Tables.Users).select<UserModel[]>(),
        testDbClient
          .instance(Tables.AuthProviders)
          .select<AuthProviderModel[]>(),
        testDbClient
          .instance(Tables.CredentialsEmailPassword)
          .select<EmailPasswordCredentialModel[]>(),
        testDbClient
          .instance(Tables.EmailVerifications)
          .select<EmailVerificationModel[]>(),
      ]);
    // user created
    expect(users.length).toEqual(1);
    const [user] = users;
    expect(isUUID(user.id)).toEqual(true);
    expect(user.firstName).toEqual(body.firstName);
    expect(user.lastName).toEqual(body.lastName);
    expect(user.email).toEqual(body.email);
    expect(user.avatarUrl).toBeNull();
    expect(user.phone).toEqual(body.phone);
    expect(user.status).toEqual(UserStatus.PendingEmailActivation);
    expect(user.role).toEqual(UserRole.Student);
    expect(new Date(user.createdAt)).toBeInstanceOf(Date);
    expect(new Date(user.updatedAt)).toBeInstanceOf(Date);
    expect(user.deletedAt).toBeNull();
    // auth-providers
    expect(authProviders.length).toEqual(1);
    const [authProvider] = authProviders;
    expect(isUUID(authProvider.id)).toEqual(true);
    expect(authProvider.userId).toEqual(user.id);
    expect(authProvider.provider).toEqual(AuthProvider.EmailPassword);
    expect(authProvider.isEmailVerified).toEqual(false);
    expect(new Date(authProvider.createdAt)).toBeInstanceOf(Date);
    expect(new Date(authProvider.updatedAt)).toBeInstanceOf(Date);
    // credentials-email-password
    expect(emailPasswordCredentials.length).toEqual(1);
    const [emailPasswordCredential] = emailPasswordCredentials;
    expect(isUUID(emailPasswordCredential.id)).toEqual(true);
    expect(emailPasswordCredential.userId).toEqual(user.id);
    expect(typeof emailPasswordCredential.passwordHash === 'string').toEqual(
      true,
    );
    expect(!!emailPasswordCredential.passwordHash.length).toEqual(true);
    expect(new Date(emailPasswordCredential.createdAt)).toBeInstanceOf(Date);
    expect(new Date(emailPasswordCredential.updatedAt)).toBeInstanceOf(Date);
    // email-verifications
    expect(emailVerifications.length).toEqual(1);
    const [emailVerification] = emailVerifications;
    expect(isUUID(emailVerification.id)).toEqual(true);
    expect(emailVerification.userId).toEqual(user.id);
    expect(typeof emailVerification.tokenHash).toEqual('string');
    expect(!!emailVerification.tokenHash.length).toEqual(true);
    expect(emailVerification.tokenType).toEqual(TokenType.Otp);
    expect(emailVerification.purpose).toEqual(Purpose.AccountActivation);
    expect(emailVerification.attempts).toEqual('0');
    expect(emailVerification.maxAttempts).toEqual(
      process.env.VERIFICATION_EMAIL_MAX_ATTEMPTS,
    );
    expect(new Date(emailVerification.expiresAt)).toBeInstanceOf(Date);
    expect(emailVerification.usedAt).toBeNull();
    expect(new Date(emailVerification.createdAt)).toBeInstanceOf(Date);
    expect(new Date(emailVerification.updatedAt)).toBeInstanceOf(Date);
  });

  it('should store the email correctly when it is sent upper-case', async () => {
    const email = 'MyEmAiLl@mAIl.com';
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto({
      email,
    });
    await request(app.getHttpServer()).post('/auth/email').send(body);
    const [user] = await testDbClient
      .instance(Tables.Users)
      .select<UserModel[]>();
    expect(user.email).toEqual(email.toLowerCase());
  });

  it('should send the otp with the correct template', async () => {
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer()).post('/auth/email').send(body);
    // extract otp from the template
    const [code] = /\b\d{6}\b/.exec(
      sendEmailMock.emails.send.mock.calls[0][0].html,
    ) as string[];
    // build a new template with the code
    const emailConfig = getEmailTemplate('ACTIVATE_EMAIL_OTP')({
      codeTtl: `${process.env.VERIFICATION_EMAIL_EXPIRATION_MINUTES} minutos`,
      userName: body.firstName,
      code,
    });
    // get the send-mock payload
    const payload = sendEmailMock.emails.send.mock.calls[0][0] as Record<
      string,
      string
    >;
    expect(sendEmailMock.emails.send).toHaveBeenCalledTimes(1);
    expect(payload.from).toEqual(
      `Rocha's Surf School <${process.env.NO_REPLY_EMAIL_SENDER}>`,
    );
    expect(payload.to).toEqual([body.email]);
    expect(payload.subject).toEqual(emailConfig.subject);
    expect(payload.html).toEqual(emailConfig.html);
  });

  it('should persist entities on database when some error happens when sending the otp-email', async () => {
    sendEmailMock.emails.send.mockRejectedValueOnce({});
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(body)
      .expect(HttpStatus.CREATED);
    const [users, authProviders, emailPasswordCredentials, emailVerifications] =
      await Promise.all([
        testDbClient.instance(Tables.Users).select<UserModel[]>(),
        testDbClient
          .instance(Tables.AuthProviders)
          .select<AuthProviderModel[]>(),
        testDbClient
          .instance(Tables.CredentialsEmailPassword)
          .select<EmailPasswordCredentialModel[]>(),
        testDbClient
          .instance(Tables.EmailVerifications)
          .select<EmailVerificationModel[]>(),
      ]);
    // user created
    expect(users.length).toEqual(1);
    const [user] = users;
    expect(isUUID(user.id)).toEqual(true);
    expect(user.firstName).toEqual(body.firstName);
    expect(user.lastName).toEqual(body.lastName);
    expect(user.email).toEqual(body.email);
    expect(user.avatarUrl).toBeNull();
    expect(user.phone).toEqual(body.phone);
    expect(user.status).toEqual(UserStatus.PendingEmailActivation);
    expect(user.role).toEqual(UserRole.Student);
    expect(new Date(user.createdAt)).toBeInstanceOf(Date);
    expect(new Date(user.updatedAt)).toBeInstanceOf(Date);
    expect(user.deletedAt).toBeNull();
    // auth-providers
    expect(authProviders.length).toEqual(1);
    const [authProvider] = authProviders;
    expect(isUUID(authProvider.id)).toEqual(true);
    expect(authProvider.userId).toEqual(user.id);
    expect(authProvider.provider).toEqual(AuthProvider.EmailPassword);
    expect(authProvider.isEmailVerified).toEqual(false);
    expect(new Date(authProvider.createdAt)).toBeInstanceOf(Date);
    expect(new Date(authProvider.updatedAt)).toBeInstanceOf(Date);
    // credentials-email-password
    expect(emailPasswordCredentials.length).toEqual(1);
    const [emailPasswordCredential] = emailPasswordCredentials;
    expect(isUUID(emailPasswordCredential.id)).toEqual(true);
    expect(emailPasswordCredential.userId).toEqual(user.id);
    expect(typeof emailPasswordCredential.passwordHash === 'string').toEqual(
      true,
    );
    expect(!!emailPasswordCredential.passwordHash.length).toEqual(true);
    expect(new Date(emailPasswordCredential.createdAt)).toBeInstanceOf(Date);
    expect(new Date(emailPasswordCredential.updatedAt)).toBeInstanceOf(Date);
    // email-verifications
    expect(emailVerifications.length).toEqual(1);
    const [emailVerification] = emailVerifications;
    expect(isUUID(emailVerification.id)).toEqual(true);
    expect(emailVerification.userId).toEqual(user.id);
    expect(typeof emailVerification.tokenHash).toEqual('string');
    expect(!!emailVerification.tokenHash.length).toEqual(true);
    expect(emailVerification.tokenType).toEqual(TokenType.Otp);
    expect(emailVerification.purpose).toEqual(Purpose.AccountActivation);
    expect(emailVerification.attempts).toEqual('0');
    expect(emailVerification.maxAttempts).toEqual(
      process.env.VERIFICATION_EMAIL_MAX_ATTEMPTS,
    );
    expect(new Date(emailVerification.expiresAt)).toBeInstanceOf(Date);
    expect(emailVerification.usedAt).toBeNull();
    expect(new Date(emailVerification.createdAt)).toBeInstanceOf(Date);
    expect(new Date(emailVerification.updatedAt)).toBeInstanceOf(Date);
  });

  it('should invalidate active email-verifications when user with status "PENDING_EMAIL_ACTIVATION" tries to register twice', async () => {
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer()).post('/auth/email').send(body);
    // create user
    const firstVerification = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .orderBy('createdAt');
    expect(firstVerification.length).toEqual(1);
    expect(firstVerification[0].usedAt).toBeNull();

    // uses same to create another user
    await request(app.getHttpServer()).post('/auth/email').send(body);
    // should have the first email_verification invalidated
    const secondVerification = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .orderBy('createdAt');
    expect(secondVerification.length).toEqual(2);
    expect(secondVerification[0].usedAt).toBeInstanceOf(Date);
    expect(secondVerification[1].usedAt).toBeNull();
  });

  it('should throw "ConflictException" when an user with status "ACTIVE" tries to register', async () => {
    const user = userFactory.makeUser({ status: UserStatus.Active });
    await testDbClient.instance(Tables.Users).insert(user);

    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto({
      email: user.email,
    });
    const response = await request(app.getHttpServer())
      .post('/auth/email')
      .send(body)
      .expect(HttpStatus.CONFLICT);
    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({
      message: 'Registration could not be completed.',
    });
  });

  it('should throw "ConflictException" when an user with status "PENDING_APPROVAL" tries to register', async () => {
    const user = userFactory.makeUser({ status: UserStatus.PendingApproval });
    await testDbClient.instance(Tables.Users).insert(user);
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto({
      email: user.email,
    });
    const response = await request(app.getHttpServer())
      .post('/auth/email')
      .send(body)
      .expect(HttpStatus.CONFLICT);
    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({
      message: 'Registration could not be completed.',
    });
  });

  it('should persist "tokenHash" correctly', async () => {
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(body)
      .expect(HttpStatus.CREATED);
    // extract code from html template
    const html = sendEmailMock.emails.send.mock.calls[0][0].html as string;
    const [code] = html.match(/\b\d{6}\b/) as string[];
    expect(code).toBeDefined();
    // setup secret
    const scope = `${body.email.trim().toLowerCase()}:${Purpose.AccountActivation}`;
    const configService = module.get<ConfigService>(ConfigService);
    const secret = decodeSecret(configService.get('otpSecret'));
    // define how the otp-hash should looks like
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(`${scope}:${code}`)
      .digest('hex');
    // read the latest email-verification
    const [emailVerification] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .orderBy('createdAt', 'desc')
      .limit(1);
    // should have the correct token_hash
    expect(emailVerification.tokenHash).toBe(expectedHash);
  });

  it('should be consistent on the "expiresAt" valeu on both response and database', async () => {
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
    // create a new email-verification record
    const response = await request(app.getHttpServer())
      .post('/auth/email')
      .send(body)
      .expect(HttpStatus.CREATED);
    // read it from db
    const [emailVerification] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>();
    // response and the stored record should have the same "expiresAt"
    expect(emailVerification.expiresAt.toISOString()).toEqual(
      (response.body as RegisterUsingEmailResponseDto).expiresAt,
    );
  });

  it.each([
    UserRepository,
    AuthProviderRepository,
    EmailPasswordCredentialRepository,
    EmailVerificationRepository,
  ])(
    'rolls back the whole transaction if a repository fails (no rows, no email)',
    async (repository) => {
      // override a repo method that is called *inside* the transaction
      const repo = module.get(repository);
      const spy = jest.spyOn(repo, 'create').mockImplementationOnce(() => {
        throw new Error('simulated failure in transaction');
      });
      const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
      // Call the endpoint; expect a 500
      const response = await request(app.getHttpServer())
        .post('/auth/email')
        .send(body);
      expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      // DB has NO rows in any of the affected tables (rollback happened)
      const [users, providers, creds, verifs] = await Promise.all([
        testDbClient.instance(Tables.Users).select<UserModel[]>(),
        testDbClient
          .instance(Tables.AuthProviders)
          .select<AuthProviderModel[]>(),
        testDbClient
          .instance(Tables.CredentialsEmailPassword)
          .select<EmailPasswordCredentialModel[]>(),
        testDbClient
          .instance(Tables.EmailVerifications)
          .select<EmailVerificationModel[]>(),
      ]);
      expect(users).toHaveLength(0);
      expect(providers).toHaveLength(0);
      expect(creds).toHaveLength(0);
      expect(verifs).toHaveLength(0);
      // no email dispatch attempted (send happens only after a successful commit)
      expect(sendEmailMock.emails.send).not.toHaveBeenCalled();
      // Cleanup
      spy.mockRestore();
    },
  );

  it('should throw "BAD_REQUEST" when some of the mandatory fields are missing', async () => {
    // missing first-name
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          firstName: undefined,
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // first-name is not a string
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          firstName: 1,
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // missing email
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          email: undefined,
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // email is not a string
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          email: 2,
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // invalid email
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          email: 'invalid_email',
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // missing phone
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          phone: undefined,
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // phone is not a string
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          phone: 1,
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // phone is not a brazilian phone number
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          phone: '1987654321',
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // missing password
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          password: undefined,
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // password is not a string
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          password: 1,
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // password has less characters than the allowed
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          password: Array(parseInt(process.env.PASSWORD_MIN_LENGTH!, 10) - 1)
            .fill('1')
            .join(''),
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
    // password has more characters than the allowed
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(
        userFactory.makeRegisterUserUsingEmailAndPasswordDto({
          password: Array(parseInt(process.env.PASSWORD_MAX_LENGTH!, 10) + 1)
            .fill('1')
            .join(''),
        }),
      )
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('hashes the password once and can be verified via compare (pepper + bcrypt)', async () => {
    const configService = module.get<ConfigService>(ConfigService);
    const hasherService = module.get<HasherService>(HasherService);
    const hashSpy = jest.spyOn(hasherService, 'hash');
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(body)
      .expect(HttpStatus.CREATED);
    // hash called once with the submitted password
    expect(hashSpy).toHaveBeenCalledTimes(1);
    expect(hashSpy).toHaveBeenCalledWith(body.password);
    // DB stored a bcrypt hash, not the plain password
    const [credentialEmailPassword] = await testDbClient
      .instance(Tables.CredentialsEmailPassword)
      .select<EmailPasswordCredentialModel[]>();
    expect(credentialEmailPassword).toBeDefined();
    expect(typeof credentialEmailPassword.passwordHash).toBe('string');
    expect(credentialEmailPassword.passwordHash).not.toBe(body.password);
    expect(credentialEmailPassword.passwordHash.startsWith('$2')).toBe(true); // bcrypt format
    // compare succeeds with correct pepper + plain
    const pepper = configService.get('passwordHashPepper');
    const ok = await hasherService.compare({
      plain: body.password,
      pepper,
      storedHash: credentialEmailPassword.passwordHash,
    });
    expect(ok).toBe(true);
    // Negative checks (defense in depth)
    const wrongPepperOk = await hasherService.compare({
      plain: body.password,
      pepper: pepper + '_wrong',
      storedHash: credentialEmailPassword.passwordHash,
    });
    expect(wrongPepperOk).toBe(false);
    const wrongPasswordOk = await hasherService.compare({
      plain: body.password + 'x',
      pepper,
      storedHash: credentialEmailPassword.passwordHash,
    });
    expect(wrongPasswordOk).toBe(false);
    hashSpy.mockRestore();
  });

  it('should issue an otp with the correct expiration-time', async () => {
    const configService = module.get<ConfigService>(ConfigService);
    const ttlMinutes = configService.get('verificationEmailExpirationMinutes');
    const expectedExpiresAt = new Date(NOW.getTime() + ttlMinutes * 60_000);
    const body = userFactory.makeRegisterUserUsingEmailAndPasswordDto();
    const response = await request(app.getHttpServer())
      .post('/auth/email')
      .send(body)
      .expect(HttpStatus.CREATED);
    const data = response.body as RegisterUsingEmailResponseDto;
    // tests the response expires-at
    expect(
      Math.abs(
        new Date(data.expiresAt).getTime() - expectedExpiresAt.getTime(),
      ),
    ).toBeLessThanOrEqual(1500);
    // tests the stored expires-at
    const [emailVerification] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>();
    expect(
      Math.abs(
        new Date(emailVerification.expiresAt).getTime() -
          expectedExpiresAt.getTime(),
      ),
    ).toBeLessThanOrEqual(1500);
  });
});
