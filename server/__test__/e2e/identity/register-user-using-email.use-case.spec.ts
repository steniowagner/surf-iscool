import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { createTestApp, TestDb, Tables } from '@src/module/shared/test';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { registerUserUsingEmailAndPasswordDto } from '../../factory';
import { sendEmailMock } from '../../../__mocks__/resend';

describe('identity/use-case/register-user-using-email', () => {
  let app: INestApplication;
  let module: TestingModule;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb();
    await testDbClient.init();

    const nestTestSetup = await createTestApp([
      ConfigModule.forRoot(),
      IdentityModule,
    ]);
    app = nestTestSetup.app;
    module = nestTestSetup.module;
  });

  beforeEach(() => {
    jest
      .useFakeTimers({ advanceTimers: true })
      .setSystemTime(new Date('2025-01-01'));
  });

  afterEach(async () => {
    await testDbClient.clean([
      Tables.CredentialsEmailPassword,
      Tables.EmailVerifications,
      Tables.AuthProviders,
      Tables.Users,
    ]);
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    await module.close();
    await testDbClient.destroy();
  });

  it('should register an user using e-mail', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/email')
      .send(registerUserUsingEmailAndPasswordDto());
    expect(sendEmailMock.emails.send).toHaveBeenCalledTimes(1);
  });
});
