import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { makeUser, makeSupabaseUser } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

const NOW = new Date('2026-01-01');
const CURRENT_USER = makeUser();

describe('identity/routes/update-my-profile', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users]);
    await testDbClient.init();

    const testingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), IdentityModule],
    })
      .overrideProvider(SupabaseAuthService)
      .useValue({
        supabase: {
          auth: {
            getUser: jest.fn().mockResolvedValue({
              data: {
                user: makeSupabaseUser({
                  id: CURRENT_USER.id,
                  email: CURRENT_USER.email,
                }),
              },
              error: null,
            }),
          },
        },
      })
      .compile();

    app = testingModule.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  beforeEach(async () => {
    jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
    await testDbClient.instance(Tables.Users).insert(CURRENT_USER);
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

  it('should return UNAUTHORIZED when there is no authorization header', async () => {
    await request(app.getHttpServer())
      .patch('/auth/me')
      .send({ firstName: 'Stenio' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should update firstName successfully', async () => {
    const firstName = 'UpdatedFirstName';
    const response = await request(app.getHttpServer())
      .patch('/auth/me')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send({ firstName })
      .expect(HttpStatus.OK);

    expect(response.body.profile.firstName).toBe(firstName);
    expect(response.body.profile.id).toBe(CURRENT_USER.id);
  });

  it('should update multiple fields at once', async () => {
    const updateData = {
      firstName: 'Stenio',
      lastName: 'Wagner',
      phone: '55859887766',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    const response = await request(app.getHttpServer())
      .patch('/auth/me')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send(updateData)
      .expect(HttpStatus.OK);

    expect(response.body.profile.firstName).toBe(updateData.firstName);
    expect(response.body.profile.lastName).toBe(updateData.lastName);
    expect(response.body.profile.phone).toBe(updateData.phone);
    expect(response.body.profile.avatarUrl).toBe(updateData.avatarUrl);
  });

  it('should return BAD_REQUEST for invalid avatarUrl', async () => {
    await request(app.getHttpServer())
      .patch('/auth/me')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send({ avatarUrl: 'not-a-valid-url' })
      .expect(HttpStatus.BAD_REQUEST);
  });
});
