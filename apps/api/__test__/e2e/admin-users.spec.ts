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

describe('identity/routes/admin-users', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users, Tables.UserRoleHistory]);
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

  const setupApp = async (adminUser: ReturnType<typeof makeUser>) => {
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
                  id: adminUser.id,
                  email: adminUser.email,
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

  describe('GET /admin/users', () => {
    it('should return FORBIDDEN for non-admin users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should list all users for admin', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.users).toHaveLength(2);
    });

    it('should filter users by status', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const pendingUser = makeUser({ status: UserStatus.PendingApproval });
      const activeUser = makeUser({ status: UserStatus.Active });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, pendingUser, activeUser]);

      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ status: UserStatus.PendingApproval })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0].status).toBe(UserStatus.PendingApproval);
    });
  });

  describe('POST /admin/users/:id/approve', () => {
    it('should approve a pending user', async () => {
      jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
      const adminUser = makeUser({ role: UserRole.Admin });
      const pendingUser = makeUser({ status: UserStatus.PendingApproval });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, pendingUser]);

      const response = await request(app.getHttpServer())
        .post(`/admin/users/${pendingUser.id}/approve`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.user.status).toBe(UserStatus.Active);
      expect(response.body.user.approvedBy).toBe(adminUser.id);
    });

    it('should return BAD_REQUEST if user is not pending approval', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const activeUser = makeUser({ status: UserStatus.Active });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, activeUser]);

      await request(app.getHttpServer())
        .post(`/admin/users/${activeUser.id}/approve`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /admin/users/:id/deny', () => {
    it('should deny a pending user with reason', async () => {
      jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
      const reason = 'Invalid documentation';
      const adminUser = makeUser({ role: UserRole.Admin });
      const pendingUser = makeUser({ status: UserStatus.PendingApproval });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, pendingUser]);

      const response = await request(app.getHttpServer())
        .post(`/admin/users/${pendingUser.id}/deny`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ reason })
        .expect(HttpStatus.OK);

      expect(response.body.user.status).toBe(UserStatus.Denied);
      expect(response.body.user.deniedBy).toBe(adminUser.id);
      expect(response.body.user.denialReason).toBe(reason);
    });
  });

  describe('PATCH /admin/users/:id/role', () => {
    it('should change user role from Student to Instructor', async () => {
      jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/role`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ role: UserRole.Instructor, reason: 'Promoted to instructor' })
        .expect(HttpStatus.OK);

      expect(response.body.user.role).toBe(UserRole.Instructor);

      const [historyEntry] = await testDbClient
        .instance(Tables.UserRoleHistory)
        .select()
        .where({ userId: studentUser.id });

      expect(historyEntry.previousRole).toBe(UserRole.Student);
      expect(historyEntry.newRole).toBe(UserRole.Instructor);
      expect(historyEntry.changedBy).toBe(adminUser.id);
    });

    it('should return BAD_REQUEST when trying to promote to Admin', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      await request(app.getHttpServer())
        .patch(`/admin/users/${studentUser.id}/role`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ role: UserRole.Admin })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /admin/users/:id', () => {
    it('should soft-delete a user', async () => {
      jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      await request(app.getHttpServer())
        .delete(`/admin/users/${studentUser.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.NO_CONTENT);

      const [deletedUser] = await testDbClient
        .instance(Tables.Users)
        .select()
        .where({ id: studentUser.id });

      expect(deletedUser.status).toBe(UserStatus.Deleted);
      expect(deletedUser.deletedAt).not.toBeNull();
    });
  });

  describe('POST /admin/users/:id/reactivate', () => {
    it('should reactivate a deleted user', async () => {
      jest.useFakeTimers({ advanceTimers: true }).setSystemTime(NOW);
      const adminUser = makeUser({ role: UserRole.Admin });
      const deletedUser = makeUser({
        status: UserStatus.Deleted,
        deletedAt: new Date(),
      });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, deletedUser]);

      const response = await request(app.getHttpServer())
        .post(`/admin/users/${deletedUser.id}/reactivate`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.user.status).toBe(UserStatus.PendingApproval);
      expect(response.body.user.deletedAt).toBeNull();
    });

    it('should return BAD_REQUEST if user is not deleted', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const activeUser = makeUser({ status: UserStatus.Active });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, activeUser]);

      await request(app.getHttpServer())
        .post(`/admin/users/${activeUser.id}/reactivate`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
