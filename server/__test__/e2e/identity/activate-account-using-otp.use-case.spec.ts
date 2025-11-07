import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';

// IdentityModule/auth-email.controller.ts imports RegisterUsingEmailRequestDto, that uses env-vars
// so we need to load the env-vars before import it
import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';
import {
  UserModel,
  UserStatus,
} from '@src/module/identity/core/model/user.model';
import {
  EmailVerificationModel,
  EmailVerificationPurpose,
} from '@src/module/identity/core/model/email-verification.model';

import {
  createTestApp,
  TestDb,
  extractOtpFromEmailTemplate,
} from '../../utils';
import { sendEmailMock } from '../../../__mocks__/resend';
import { Tables } from '../../enum/tables.enum';
import {
  makeActivateAccountUsingOtpRequestDto,
  makeEmailVerification,
  makeRegisterUserUsingEmailAndPasswordDto,
  makeUser,
} from '../../factory';
import { subMinutes } from 'date-fns';
import { AuthProviderModel } from '@src/module/identity/core/model/auth-provider.model';

const NOW = new Date('2025-01-01');

describe('identity/use-case/activate-account-using-otp', () => {
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

  it('should throw "NotFoundException" when the user is not found', async () => {
    const body = makeActivateAccountUsingOtpRequestDto();
    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.NOT_FOUND);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'User not found',
    );
  });

  it.each([
    UserStatus.Active,
    UserStatus.PendingApproval,
    UserStatus.PendingProfileInformation,
  ])(
    'should throw "ConflictException" when the user is at %s state',
    async (status) => {
      const body = makeActivateAccountUsingOtpRequestDto();
      const user = makeUser({ status, email: body.email });
      await testDbClient.instance(Tables.Users).insert(user);
      const response = await request(app.getHttpServer())
        .post('/auth/email/activate/otp')
        .send(body)
        .expect(HttpStatus.CONFLICT);
      expect((response.body as Record<string, unknown>).message).toEqual(
        'User already active',
      );
    },
  );

  it('should throw "NotFoundException" when the requested "email-verification" does not exist', async () => {
    const body = makeActivateAccountUsingOtpRequestDto();
    const user = makeUser({
      status: UserStatus.PendingEmailActivation, // the status doesn't matter
      email: body.email,
    });
    await testDbClient.instance(Tables.Users).insert(user);
    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.NOT_FOUND);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'No active Email-verification not found',
    );
  });

  it('should throw "NotFoundException" when there is a "email-verification" for the user, but for a different purpose', async () => {
    const body = makeActivateAccountUsingOtpRequestDto();
    const user = makeUser({
      status: UserStatus.PendingEmailActivation, // the status doesn't matter
      email: body.email,
    });
    await testDbClient.instance(Tables.Users).insert(user);
    // creating the email verification with a different purpose other than EmailVerificationPurpose.AccountActivation
    const emailVerification = makeEmailVerification({
      userId: user.id,
      purpose: EmailVerificationPurpose.PasswordReset,
    });
    await testDbClient
      .instance(Tables.EmailVerifications)
      .insert(emailVerification);

    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.NOT_FOUND);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'No active Email-verification not found',
    );
  });

  it('should throw "NotFoundException" when there is a "email-verification", but it is already used', async () => {
    const body = makeActivateAccountUsingOtpRequestDto();
    const user = makeUser({
      status: UserStatus.PendingEmailActivation, // the status doesn't matter
      email: body.email,
    });
    await testDbClient.instance(Tables.Users).insert(user);
    // creating an used email verification
    const emailVerification = makeEmailVerification({
      userId: user.id,
      purpose: EmailVerificationPurpose.AccountActivation,
      usedAt: new Date(),
    });
    await testDbClient
      .instance(Tables.EmailVerifications)
      .insert(emailVerification);

    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.NOT_FOUND);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'No active Email-verification not found',
    );
  });

  it('should throw "GoneException" when there is a "email-verification", but it is already expired', async () => {
    const body = makeActivateAccountUsingOtpRequestDto();
    const user = makeUser({
      status: UserStatus.PendingEmailActivation, // the status doesn't matter
      email: body.email,
    });
    await testDbClient.instance(Tables.Users).insert(user);
    // creating an expired email verification
    const emailVerification = makeEmailVerification({
      userId: user.id,
      purpose: EmailVerificationPurpose.AccountActivation,
      expiresAt: subMinutes(NOW, 10),
    });
    await testDbClient
      .instance(Tables.EmailVerifications)
      .insert(emailVerification);

    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.GONE);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'This code is expired. Please request a new code.',
    );
  });

  it('should throw "BadRequestException" when the OTP is incorrect', async () => {
    // sign up the user
    const user = makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(user)
      .expect(HttpStatus.CREATED);
    // extract code from html template
    const html = sendEmailMock.emails.send.mock.calls[0][0].html as string;
    const code = extractOtpFromEmailTemplate(html) as string;
    expect(code).toBeDefined();
    // activating otp
    const body = makeActivateAccountUsingOtpRequestDto({
      code: code.split('').reverse().join(''),
      email: user.email,
    });
    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.BAD_REQUEST);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'Invalid code.',
    );
  });

  it('should increase by one the number of attempts even when otp is incorrect', async () => {
    // sign up the user
    const user = makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(user)
      .expect(HttpStatus.CREATED);
    // extract code from html template
    const html = sendEmailMock.emails.send.mock.calls[0][0].html as string;
    const code = extractOtpFromEmailTemplate(html) as string;
    expect(code).toBeDefined();
    // testing how many times user tried to activate otp initially
    const [userStored] = await testDbClient
      .instance(Tables.Users)
      .select<UserModel[]>('id')
      .where({ email: user.email });
    const [emailVerificationStoredBeforeAttempt] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .where({
        userId: userStored.id,
      });
    expect(emailVerificationStoredBeforeAttempt.attempts).toEqual('0');
    // activating otp
    const body = makeActivateAccountUsingOtpRequestDto({
      code: code.split('').reverse().join(''),
      email: user.email,
    });
    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.BAD_REQUEST);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'Invalid code.',
    );
    // testing how many times user tried to activate otp after the request
    const [emailVerificationStoredAfterAttempt] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .where({
        userId: userStored.id,
      });
    expect(emailVerificationStoredAfterAttempt.attempts).toEqual('1');
  });

  it('should throw "BadRequestException" when the current attempt reaches the max attempts allowed', async () => {
    // sign up the user
    const user = makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(user)
      .expect(HttpStatus.CREATED);
    // extract code from html template
    const html = sendEmailMock.emails.send.mock.calls[0][0].html as string;
    const code = extractOtpFromEmailTemplate(html) as string;
    expect(code).toBeDefined();
    // testing how many times user tried to activate otp initially
    const [userStored] = await testDbClient
      .instance(Tables.Users)
      .select<UserModel[]>('id')
      .where({ email: user.email });
    await testDbClient
      .instance(Tables.EmailVerifications)
      .update<EmailVerificationModel>({
        attempts:
          parseInt(process.env.VERIFICATION_EMAIL_MAX_ATTEMPTS!, 10) - 1,
      })
      .where({
        userId: userStored.id,
      });
    // registering that user didn't attempt to activate the code yet
    const [emailVerificationStoredBeforeAttempt] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .where({
        userId: userStored.id,
      });
    expect(emailVerificationStoredBeforeAttempt.lastAttemptAt).toBeNull();
    // activating otp
    const body = makeActivateAccountUsingOtpRequestDto({
      code: code.split('').reverse().join(''),
      email: user.email,
    });
    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.BAD_REQUEST);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'Maximum attempts reached. Request a new code.',
    );
    // registering when the last-attempt of code-activation occurred
    const [emailVerificationStoredAfterAttempt] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .where({
        userId: userStored.id,
      });
    expect(emailVerificationStoredAfterAttempt.lastAttemptAt).not.toBeNull();
  });

  it('should throw "BadRequestException" when user already reached the max attempts allowed', async () => {
    // sign up the user
    const user = makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(user)
      .expect(HttpStatus.CREATED);
    // extract code from html template
    const html = sendEmailMock.emails.send.mock.calls[0][0].html as string;
    const code = extractOtpFromEmailTemplate(html) as string;
    expect(code).toBeDefined();
    // testing how many times user tried to activate otp initially
    const [userStored] = await testDbClient
      .instance(Tables.Users)
      .select<UserModel[]>('id')
      .where({ email: user.email });
    await testDbClient
      .instance(Tables.EmailVerifications)
      .update<EmailVerificationModel>({
        attempts: parseInt(process.env.VERIFICATION_EMAIL_MAX_ATTEMPTS!, 10),
      })
      .where({
        userId: userStored.id,
      });
    // activating otp
    const body = makeActivateAccountUsingOtpRequestDto({
      code: code.split('').reverse().join(''),
      email: user.email,
    });
    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.BAD_REQUEST);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'Maximum attempts reached. Request a new code.',
    );
  });

  it('should invalidate active code when max attempts is reached', async () => {
    // sign up the user
    const user = makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(user)
      .expect(HttpStatus.CREATED);
    // extract code from html template
    const html = sendEmailMock.emails.send.mock.calls[0][0].html as string;
    const code = extractOtpFromEmailTemplate(html) as string;
    expect(code).toBeDefined();
    // testing how many times user tried to activate otp initially
    const [userStored] = await testDbClient
      .instance(Tables.Users)
      .select<UserModel[]>('id')
      .where({ email: user.email });
    await testDbClient
      .instance(Tables.EmailVerifications)
      .update<EmailVerificationModel>({
        attempts:
          parseInt(process.env.VERIFICATION_EMAIL_MAX_ATTEMPTS!, 10) - 1,
      })
      .where({
        userId: userStored.id,
      });
    const [emailVerificationBeforeUpdate] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .where({
        userId: userStored.id,
      });
    // code was not used yet
    expect(emailVerificationBeforeUpdate.usedAt).toBeNull();
    const body = makeActivateAccountUsingOtpRequestDto({
      code: code.split('').reverse().join(''),
      email: user.email,
    });
    // activating otp
    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.BAD_REQUEST);
    expect((response.body as Record<string, unknown>).message).toEqual(
      'Maximum attempts reached. Request a new code.',
    );
    const [emailVerificationAfterUpdate] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .where({
        id: emailVerificationBeforeUpdate.id,
      });
    expect(emailVerificationAfterUpdate.usedAt).not.toBeNull();
  });

  it('should invalidate the code, verify email and update user status correctly', async () => {
    // sign up the user
    const user = makeRegisterUserUsingEmailAndPasswordDto();
    await request(app.getHttpServer())
      .post('/auth/email')
      .send(user)
      .expect(HttpStatus.CREATED);
    // extract code from html template
    const html = sendEmailMock.emails.send.mock.calls[0][0].html as string;
    const code = extractOtpFromEmailTemplate(html) as string;
    expect(code).toBeDefined();
    // testing entities states after success
    // user status is PENDING_EMAIL_ACTIVATION
    const [userBeforeUpdate] = await testDbClient
      .instance(Tables.Users)
      .select<UserModel[]>()
      .where({
        email: user.email,
      });
    expect(userBeforeUpdate.status).toEqual(UserStatus.PendingEmailActivation);
    // code was not used yet
    const [emailVerificationBeforeUpdate] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .where({
        userId: userBeforeUpdate.id,
      });
    expect(emailVerificationBeforeUpdate.lastAttemptAt).toBeNull();
    expect(emailVerificationBeforeUpdate.usedAt).toBeNull();
    // email is not verified yet
    const [authProviderBeforeUpdate] = await testDbClient
      .instance(Tables.AuthProviders)
      .select<AuthProviderModel[]>()
      .where({
        userId: userBeforeUpdate.id,
      });
    expect(authProviderBeforeUpdate.isEmailVerified).toEqual(false);
    // activating otp
    const body = makeActivateAccountUsingOtpRequestDto({
      code,
      email: user.email,
    });
    const response = await request(app.getHttpServer())
      .post('/auth/email/activate/otp')
      .send(body)
      .expect(HttpStatus.OK);
    expect((response.body as Record<string, unknown>).activated).toEqual(true);
    // user status is now PENDING_PROFILE_INFORMATION
    const [userAfterUpdate] = await testDbClient
      .instance(Tables.Users)
      .select<UserModel[]>()
      .where({
        email: user.email,
      });
    expect(userAfterUpdate.status).toEqual(
      UserStatus.PendingProfileInformation,
    );
    // email-verification was used
    const [emailVerificationAfterUpdate] = await testDbClient
      .instance(Tables.EmailVerifications)
      .select<EmailVerificationModel[]>()
      .where({
        id: emailVerificationBeforeUpdate.id,
      });
    expect(emailVerificationAfterUpdate.lastAttemptAt).toBeNull();
    expect(emailVerificationAfterUpdate.usedAt).not.toBeNull();
    // email is now verified
    const [authProviderAfterUpdate] = await testDbClient
      .instance(Tables.AuthProviders)
      .select<AuthProviderModel[]>()
      .where({
        userId: userBeforeUpdate.id,
      });
    expect(authProviderAfterUpdate.isEmailVerified).toEqual(true);
  });
});
