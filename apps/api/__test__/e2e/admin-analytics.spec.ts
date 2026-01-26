import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { UserRole, UserStatus } from '@surf-iscool/types';

import { makeUser, makeSupabaseUser } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('identity/routes/admin-analytics', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users]);
    await testDbClient.init();
  });

  afterEach(async () => {
    await testDbClient.clean();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
    await testDbClient.destroy();
  });

  const setupApp = async (authUser: ReturnType<typeof makeUser>) => {
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
                  id: authUser.id,
                  email: authUser.email,
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

  describe('GET /admin/analytics/users', () => {
    it('should return user analytics for admin', async () => {
      const adminUser = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      const student1 = makeUser({ role: UserRole.Student, status: UserStatus.Active });
      const student2 = makeUser({ role: UserRole.Student, status: UserStatus.PendingApproval });
      const instructor = makeUser({ role: UserRole.Instructor, status: UserStatus.Active });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, student1, student2, instructor]);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/users')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalUsers).toBe(4);
      expect(response.body.byRole).toBeDefined();
      expect(response.body.byRole[UserRole.Admin]).toBe(1);
      expect(response.body.byRole[UserRole.Student]).toBe(2);
      expect(response.body.byRole[UserRole.Instructor]).toBe(1);
      expect(response.body.byStatus).toBeDefined();
      expect(response.body.byStatus[UserStatus.Active]).toBe(3);
      expect(response.body.byStatus[UserStatus.PendingApproval]).toBe(1);
    });

    it('should return zero counts for missing roles/statuses', async () => {
      const adminUser = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/users')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalUsers).toBe(1);
      expect(response.body.byRole[UserRole.Admin]).toBe(1);
      expect(response.body.byRole[UserRole.Student]).toBe(0);
      expect(response.body.byRole[UserRole.Instructor]).toBe(0);
      expect(response.body.byStatus[UserStatus.Active]).toBe(1);
      expect(response.body.byStatus[UserStatus.PendingApproval]).toBe(0);
      expect(response.body.byStatus[UserStatus.Denied]).toBe(0);
    });

    it('should exclude deleted users from total count', async () => {
      const adminUser = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      const deletedUser = makeUser({
        role: UserRole.Student,
        status: UserStatus.Deleted,
        deletedAt: new Date(),
      });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, deletedUser]);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/users')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      // Total should exclude deleted users
      expect(response.body.totalUsers).toBe(1);
      // But byStatus should include deleted count
      expect(response.body.byStatus[UserStatus.Deleted]).toBe(1);
    });

    it('should reject non-admin users', async () => {
      const studentUser = makeUser({ role: UserRole.Student, status: UserStatus.Active });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/admin/analytics/users')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject instructor users', async () => {
      const instructorUser = makeUser({ role: UserRole.Instructor, status: UserStatus.Active });
      await setupApp(instructorUser);
      await testDbClient.instance(Tables.Users).insert(instructorUser);

      await request(app.getHttpServer())
        .get('/admin/analytics/users')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
