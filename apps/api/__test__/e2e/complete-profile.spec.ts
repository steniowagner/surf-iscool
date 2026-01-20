import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { UserStatus } from '@surf-iscool/types';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { makeUser, makeSupabaseUser } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

const NOW = new Date('2026-01-01');
const CURRENT_USER = makeUser({
  firstName: null,
  lastName: null,
  phone: null,
  avatarUrl: null,
  status: UserStatus.PendingProfileInformation,
});

describe('identity/routes/complete-profile', () => {
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
      .post('/auth/complete-profile')
      .send({
        firstName: 'Stenio',
        lastName: 'Wagner',
        phone: '5585987654321',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should complete profile and transition status to PENDING_APPROVAL', async () => {
    const completeProfileData = {
      firstName: 'Stenio',
      lastName: 'Wagner',
      phone: '5585987654321',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    const response = await request(app.getHttpServer())
      .post('/auth/complete-profile')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send(completeProfileData)
      .expect(HttpStatus.OK);

    expect(response.body.profile.status).toBe(UserStatus.PendingApproval);
    expect(response.body.profile.firstName).toBe(completeProfileData.firstName);
    expect(response.body.profile.lastName).toBe(completeProfileData.lastName);
    expect(response.body.profile.phone).toBe(completeProfileData.phone);
    expect(response.body.profile.avatarUrl).toBe(completeProfileData.avatarUrl);
  });

  it('should return BAD_REQUEST when firstName is missing', async () => {
    const incompleteData = {
      lastName: 'Wagner',
      phone: '5585987654321',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    await request(app.getHttpServer())
      .post('/auth/complete-profile')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send(incompleteData)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return BAD_REQUEST when lastName is missing', async () => {
    const incompleteData = {
      firstName: 'Stenio',
      phone: '5585987654321',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    await request(app.getHttpServer())
      .post('/auth/complete-profile')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send(incompleteData)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return BAD_REQUEST when phone is missing', async () => {
    const incompleteData = {
      firstName: 'Stenio',
      lastName: 'Wagner',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    await request(app.getHttpServer())
      .post('/auth/complete-profile')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send(incompleteData)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return BAD_REQUEST when avatarUrl is missing', async () => {
    const incompleteData = {
      firstName: 'Stenio',
      lastName: 'Wagner',
      phone: '5585987654321',
    };

    await request(app.getHttpServer())
      .post('/auth/complete-profile')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send(incompleteData)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return BAD_REQUEST when avatarUrl is invalid', async () => {
    const invalidData = {
      firstName: 'Stenio',
      lastName: 'Wagner',
      phone: '5585987654321',
      avatarUrl: 'not-a-valid-url',
    };

    await request(app.getHttpServer())
      .post('/auth/complete-profile')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .send(invalidData)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it.each(['PENDING_APPROVAL', 'ACTIVE', 'DENIED', 'DEACTIVATED', 'DELETED'])(
    'should return BAD_REQUEST when user is not in PENDING_PROFILE_INFORMATION status (status = %s)',
    async (status: string) => {
      await testDbClient.clean();
      const approvedUser = makeUser({
        id: CURRENT_USER.id,
        email: CURRENT_USER.email,
        status,
      });
      await testDbClient.instance(Tables.Users).insert(approvedUser);

      const completeProfileData = {
        firstName: 'Stenio',
        lastName: 'Wagner',
        phone: '5585987654321',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/complete-profile')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send(completeProfileData)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Not able to complete profile');
    },
  );
});
