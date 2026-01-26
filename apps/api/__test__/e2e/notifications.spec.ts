import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { NotificationModule } from '@src/module/notification/notification.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { UserRole, NotificationType } from '@surf-iscool/types';

import { makeUser, makeSupabaseUser, makeNotification } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('notification/routes/notifications', () => {
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

  describe('GET /notifications', () => {
    it('should return empty list when user has no notifications', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.notifications).toEqual([]);
      expect(response.body.unreadCount).toBe(0);
    });

    it('should return user notifications sorted by created date descending', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const notification1 = makeNotification({
        userId: user.id,
        type: NotificationType.UserApproved,
        title: 'Welcome!',
        body: 'Your account has been approved',
        createdAt: new Date('2024-01-01'),
      });
      const notification2 = makeNotification({
        userId: user.id,
        type: NotificationType.EnrollmentApproved,
        title: 'Enrollment Approved',
        body: 'You have been enrolled in the class',
        createdAt: new Date('2024-01-02'),
      });
      await testDbClient
        .instance(Tables.Notifications)
        .insert([notification1, notification2]);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.notifications).toHaveLength(2);
      // Most recent first
      expect(response.body.notifications[0].id).toBe(notification2.id);
      expect(response.body.notifications[1].id).toBe(notification1.id);
      expect(response.body.unreadCount).toBe(2);
    });

    it('should only return notifications for the authenticated user', async () => {
      const user = makeUser({ role: UserRole.Student });
      const otherUser = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert([user, otherUser]);

      const userNotification = makeNotification({
        userId: user.id,
        type: NotificationType.UserApproved,
      });
      const otherUserNotification = makeNotification({
        userId: otherUser.id,
        type: NotificationType.UserApproved,
      });
      await testDbClient
        .instance(Tables.Notifications)
        .insert([userNotification, otherUserNotification]);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.notifications).toHaveLength(1);
      expect(response.body.notifications[0].id).toBe(userNotification.id);
    });

    it('should count only unread notifications', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const unreadNotification = makeNotification({
        userId: user.id,
        readAt: null,
      });
      const readNotification = makeNotification({
        userId: user.id,
        readAt: new Date(),
      });
      await testDbClient
        .instance(Tables.Notifications)
        .insert([unreadNotification, readNotification]);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.unreadCount).toBe(1);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const notification = makeNotification({
        userId: user.id,
        readAt: null,
      });
      await testDbClient.instance(Tables.Notifications).insert(notification);

      const response = await request(app.getHttpServer())
        .patch(`/notifications/${notification.id}/read`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.notification.id).toBe(notification.id);
      expect(response.body.notification.readAt).not.toBeNull();
    });

    it('should return 400 when notification not found', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const response = await request(app.getHttpServer())
        .patch('/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Notification not found');
    });

    it('should return 400 when trying to mark another user notification', async () => {
      const user = makeUser({ role: UserRole.Student });
      const otherUser = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert([user, otherUser]);

      const notification = makeNotification({
        userId: otherUser.id,
        readAt: null,
      });
      await testDbClient.instance(Tables.Notifications).insert(notification);

      const response = await request(app.getHttpServer())
        .patch(`/notifications/${notification.id}/read`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'You do not have permission to mark this notification as read',
      );
    });

    it('should return 400 when notification already read', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const notification = makeNotification({
        userId: user.id,
        readAt: new Date(),
      });
      await testDbClient.instance(Tables.Notifications).insert(notification);

      const response = await request(app.getHttpServer())
        .patch(`/notifications/${notification.id}/read`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Notification already marked as read');
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all unread notifications as read', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const notification1 = makeNotification({
        userId: user.id,
        readAt: null,
      });
      const notification2 = makeNotification({
        userId: user.id,
        readAt: null,
      });
      const alreadyRead = makeNotification({
        userId: user.id,
        readAt: new Date(),
      });
      await testDbClient
        .instance(Tables.Notifications)
        .insert([notification1, notification2, alreadyRead]);

      const response = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      // Only the previously unread ones are returned
      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.unreadCount).toBe(0);
    });

    it('should return empty array when no unread notifications', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const response = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.notifications).toEqual([]);
      expect(response.body.unreadCount).toBe(0);
    });

    it('should not mark other users notifications as read', async () => {
      const user = makeUser({ role: UserRole.Student });
      const otherUser = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert([user, otherUser]);

      const userNotification = makeNotification({
        userId: user.id,
        readAt: null,
      });
      const otherUserNotification = makeNotification({
        userId: otherUser.id,
        readAt: null,
      });
      await testDbClient
        .instance(Tables.Notifications)
        .insert([userNotification, otherUserNotification]);

      const response = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      // Should only have marked the current user's notification as read
      expect(response.body.notifications).toHaveLength(1);
      expect(response.body.notifications[0].id).toBe(userNotification.id);
    });
  });
});
