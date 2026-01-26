import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { NotificationModule } from '@src/module/notification/notification.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { UserRole, UserStatus, NotificationType } from '@surf-iscool/types';

import { makeUser, makeSupabaseUser } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('notification/routes/admin-notifications', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users, Tables.Notifications]);
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
      imports: [ConfigModule.forRoot(), IdentityModule, NotificationModule],
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

  describe('POST /admin/notifications/broadcast', () => {
    it('should create notifications for all active users', async () => {
      const admin = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      const activeUser1 = makeUser({ role: UserRole.Student, status: UserStatus.Active });
      const activeUser2 = makeUser({ role: UserRole.Instructor, status: UserStatus.Active });
      await setupApp(admin);
      await testDbClient.instance(Tables.Users).insert([admin, activeUser1, activeUser2]);

      const response = await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          title: 'Important Announcement',
          body: 'This is a global announcement to all users.',
        })
        .expect(HttpStatus.OK);

      expect(response.body.notifications).toHaveLength(3);
      expect(response.body.unreadCount).toBe(3);

      const userIds = response.body.notifications.map((n: any) => n.userId);
      expect(userIds).toContain(admin.id);
      expect(userIds).toContain(activeUser1.id);
      expect(userIds).toContain(activeUser2.id);

      response.body.notifications.forEach((notification: any) => {
        expect(notification.type).toBe(NotificationType.GlobalAnnouncement);
        expect(notification.title).toBe('Important Announcement');
        expect(notification.body).toBe('This is a global announcement to all users.');
      });
    });

    it('should include optional data in notifications', async () => {
      const admin = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      const activeUser = makeUser({ role: UserRole.Student, status: UserStatus.Active });
      await setupApp(admin);
      await testDbClient.instance(Tables.Users).insert([admin, activeUser]);

      const response = await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          title: 'New Feature',
          body: 'Check out our new feature!',
          data: { featureId: '123', url: '/features/123' },
        })
        .expect(HttpStatus.OK);

      expect(response.body.notifications).toHaveLength(2);
      response.body.notifications.forEach((notification: any) => {
        expect(notification.data).toEqual({ featureId: '123', url: '/features/123' });
      });
    });

    it('should not create notifications for non-active users', async () => {
      const admin = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      const pendingUser = makeUser({
        role: UserRole.Student,
        status: UserStatus.PendingApproval,
      });
      const deniedUser = makeUser({
        role: UserRole.Student,
        status: UserStatus.Denied,
      });
      const deletedUser = makeUser({
        role: UserRole.Student,
        status: UserStatus.Deleted,
      });
      await setupApp(admin);
      await testDbClient
        .instance(Tables.Users)
        .insert([admin, pendingUser, deniedUser, deletedUser]);

      const response = await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          title: 'Test',
          body: 'Test body',
        })
        .expect(HttpStatus.OK);

      // Only the admin (who is active) should receive the notification
      expect(response.body.notifications).toHaveLength(1);
      expect(response.body.notifications[0].userId).toBe(admin.id);
    });

    it('should only create notification for admin when they are the only active user', async () => {
      const admin = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      const pendingUser = makeUser({
        role: UserRole.Student,
        status: UserStatus.PendingProfileInformation,
      });
      await setupApp(admin);
      await testDbClient.instance(Tables.Users).insert([admin, pendingUser]);

      const response = await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          title: 'Test',
          body: 'Test body',
        })
        .expect(HttpStatus.OK);

      expect(response.body.notifications).toHaveLength(1);
      expect(response.body.notifications[0].userId).toBe(admin.id);
    });

    it('should return 403 when non-admin tries to broadcast', async () => {
      const student = makeUser({ role: UserRole.Student, status: UserStatus.Active });
      await setupApp(student);
      await testDbClient.instance(Tables.Users).insert(student);

      await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          title: 'Test',
          body: 'Test body',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 403 when instructor tries to broadcast', async () => {
      const instructor = makeUser({ role: UserRole.Instructor, status: UserStatus.Active });
      await setupApp(instructor);
      await testDbClient.instance(Tables.Users).insert(instructor);

      await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          title: 'Test',
          body: 'Test body',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 400 when title is missing', async () => {
      const admin = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      await setupApp(admin);
      await testDbClient.instance(Tables.Users).insert(admin);

      const response = await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          body: 'Test body',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('title')]),
      );
    });

    it('should return 400 when body is missing', async () => {
      const admin = makeUser({ role: UserRole.Admin, status: UserStatus.Active });
      await setupApp(admin);
      await testDbClient.instance(Tables.Users).insert(admin);

      const response = await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          title: 'Test title',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('body')]),
      );
    });

    it('should return 401 when not authenticated', async () => {
      const admin = makeUser({ role: UserRole.Admin, status: UserStatus.Active });

      const testingModule = await Test.createTestingModule({
        imports: [ConfigModule.forRoot(), IdentityModule, NotificationModule],
      })
        .overrideProvider(SupabaseAuthService)
        .useValue({
          supabase: {
            auth: {
              getUser: jest.fn().mockResolvedValue({
                data: { user: null },
                error: { message: 'Invalid token' },
              }),
            },
          },
        })
        .compile();

      app = testingModule.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      await app.init();

      await testDbClient.instance(Tables.Users).insert(admin);

      await request(app.getHttpServer())
        .post('/admin/notifications/broadcast')
        .set('Authorization', 'Bearer INVALID_TOKEN')
        .send({
          title: 'Test',
          body: 'Test body',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
