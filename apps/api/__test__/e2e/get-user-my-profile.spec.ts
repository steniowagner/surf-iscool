import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { FirebaseAuthService } from '@shared-modules/auth/service/firebase-auth.service';
import { UserModel } from '@src/module/identity/core/model/user.model';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { makeUser, makeDecodedToken } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

const NOW = new Date('2025-01-01');
const CURRENT_USER = makeUser();

describe('identity/routes/get-my-profile', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users]);
    await testDbClient.init();

    const testingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), IdentityModule],
    })
      .overrideProvider(FirebaseAuthService)
      .useValue({
        auth: () => ({
          verifyIdToken: jest.fn().mockResolvedValue(
            makeDecodedToken({
              uid: CURRENT_USER.id,
              email: CURRENT_USER.email,
            }),
          ),
        }),
      })
      .compile();

    app = testingModule.createNestApplication();
    await app.init();
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
    await testDbClient.destroy();
  });

  it('should return "UNAUTHORIZED" status when there are no authorization-header', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should return the current user correctly when the token is valid and the user already exists on the db', async () => {
    // inserting the user
    await testDbClient.instance(Tables.Users).insert(CURRENT_USER);
    // requesting with fake token
    const FAKE_TOKEN = 'FAKE_TOKEN';
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${FAKE_TOKEN}`)
      .expect(HttpStatus.OK);
    expect((response.body as Record<string, unknown>).profile).toEqual({
      ...CURRENT_USER,
      createdAt: CURRENT_USER.createdAt?.toISOString(),
      updatedAt: CURRENT_USER.updatedAt?.toISOString(),
    });
  });

  it('should insert and return a user when the token is valud and the user does not exist yet on the db', async () => {
    // no users in the db
    const usersBeforeInsert = await testDbClient
      .instance(Tables.Users)
      .select();
    expect(usersBeforeInsert.length).toEqual(0);
    // requesting with fake token
    const FAKE_TOKEN = 'FAKE_TOKEN';
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${FAKE_TOKEN}`)
      .expect(HttpStatus.OK);
    // new user just inserted
    const usersAfterInsertion = await testDbClient
      .instance(Tables.Users)
      .select<UserModel[]>();
    expect(usersAfterInsertion.length).toEqual(1);
    const user: UserModel = usersAfterInsertion[0];
    expect((response.body as Record<string, unknown>).profile).toEqual({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  });
});
