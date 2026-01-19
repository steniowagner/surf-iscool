import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';
import { UserStatus, UserRole } from '@surf-iscool/types';

import { makeUser, makeSupabaseUser } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

const NOW = new Date('2026-01-01');

describe('identity/routes/delete-my-account', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users]);
    await testDbClient.init();
  });

  afterEach(async () => {
    await testDbClient.clean();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
    await testDbClient.destroy();
  });

  const setupApp = async (user: ReturnType<typeof makeUser>) => {
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
                  id: user.id,
                  email: user.email,
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
  };

  it('should return UNAUTHORIZED when there is no authorization header', async () => {
    const user = makeUser({ role: UserRole.Student });
    await setupApp(user);
    await testDbClient.instance(Tables.Users).insert(user);

    await request(app.getHttpServer())
      .delete('/auth/me')
      .expect(HttpStatus.UNAUTHORIZED);
  });

  it('should soft-delete user account for Student role', async () => {
    jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
    const user = makeUser({ role: UserRole.Student });
    await setupApp(user);
    await testDbClient.instance(Tables.Users).insert(user);

    await request(app.getHttpServer())
      .delete('/auth/me')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .expect(HttpStatus.NO_CONTENT);

    const [deletedUser] = await testDbClient
      .instance(Tables.Users)
      .select()
      .where({ id: user.id });

    expect(deletedUser.status).toBe(UserStatus.Deleted);
    expect(deletedUser.deletedAt).not.toBeNull();
  });

  it('should soft-delete user account for Instructor role', async () => {
    jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
    const user = makeUser({ role: UserRole.Instructor });
    await setupApp(user);
    await testDbClient.instance(Tables.Users).insert(user);

    await request(app.getHttpServer())
      .delete('/auth/me')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .expect(HttpStatus.NO_CONTENT);

    const [deletedUser] = await testDbClient
      .instance(Tables.Users)
      .select()
      .where({ id: user.id });

    expect(deletedUser.status).toBe(UserStatus.Deleted);
    expect(deletedUser.deletedAt).not.toBeNull();
  });

  it('should return FORBIDDEN for Admin role', async () => {
    const user = makeUser({ role: UserRole.Admin });
    await setupApp(user);
    await testDbClient.instance(Tables.Users).insert(user);

    await request(app.getHttpServer())
      .delete('/auth/me')
      .set('Authorization', 'Bearer FAKE_TOKEN')
      .expect(HttpStatus.FORBIDDEN);
  });
});
