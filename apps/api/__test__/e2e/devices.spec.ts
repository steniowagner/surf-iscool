import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { NotificationModule } from '@src/module/notification/notification.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { UserRole } from '@surf-iscool/types';

import { makeUser, makeSupabaseUser, makeUserDevice } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('notification/routes/devices', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users, Tables.UserDevices]);
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

  describe('POST /devices', () => {
    it('should register a new device', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const response = await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          deviceToken: 'test-device-token-123',
          platform: 'ios',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.device).toBeDefined();
      expect(response.body.device.deviceToken).toBe('test-device-token-123');
      expect(response.body.device.platform).toBe('ios');
      expect(response.body.device.userId).toBe(user.id);
      expect(response.body.device.isActive).toBe(true);
    });

    it('should return existing device if already registered and active', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const existingDevice = makeUserDevice({
        userId: user.id,
        deviceToken: 'existing-token',
        platform: 'android',
        isActive: true,
      });
      await testDbClient.instance(Tables.UserDevices).insert(existingDevice);

      const response = await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          deviceToken: 'existing-token',
          platform: 'android',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.device.id).toBe(existingDevice.id);
      expect(response.body.device.isActive).toBe(true);
    });

    it('should reactivate device if previously deactivated', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const deactivatedDevice = makeUserDevice({
        userId: user.id,
        deviceToken: 'deactivated-token',
        platform: 'ios',
        isActive: false,
      });
      await testDbClient.instance(Tables.UserDevices).insert(deactivatedDevice);

      const response = await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          deviceToken: 'deactivated-token',
          platform: 'ios',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.device.id).toBe(deactivatedDevice.id);
      expect(response.body.device.isActive).toBe(true);
    });

    it('should return 400 when deviceToken is missing', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const response = await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          platform: 'ios',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('deviceToken')]),
      );
    });

    it('should return 400 when platform is invalid', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const response = await request(app.getHttpServer())
        .post('/devices')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          deviceToken: 'test-token',
          platform: 'windows',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('platform')]),
      );
    });
  });

  describe('GET /devices', () => {
    it('should return empty list when user has no devices', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const response = await request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.devices).toEqual([]);
    });

    it('should return only active devices for the user', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const activeDevice = makeUserDevice({
        userId: user.id,
        deviceToken: 'active-token',
        isActive: true,
      });
      const inactiveDevice = makeUserDevice({
        userId: user.id,
        deviceToken: 'inactive-token',
        isActive: false,
      });
      await testDbClient
        .instance(Tables.UserDevices)
        .insert([activeDevice, inactiveDevice]);

      const response = await request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].id).toBe(activeDevice.id);
    });

    it('should only return devices for the authenticated user', async () => {
      const user = makeUser({ role: UserRole.Student });
      const otherUser = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert([user, otherUser]);

      const userDevice = makeUserDevice({
        userId: user.id,
        deviceToken: 'user-token',
      });
      const otherUserDevice = makeUserDevice({
        userId: otherUser.id,
        deviceToken: 'other-token',
      });
      await testDbClient
        .instance(Tables.UserDevices)
        .insert([userDevice, otherUserDevice]);

      const response = await request(app.getHttpServer())
        .get('/devices')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].id).toBe(userDevice.id);
    });
  });

  describe('DELETE /devices/:token', () => {
    it('should deactivate the device', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const device = makeUserDevice({
        userId: user.id,
        deviceToken: 'device-to-remove',
        isActive: true,
      });
      await testDbClient.instance(Tables.UserDevices).insert(device);

      const response = await request(app.getHttpServer())
        .delete('/devices/device-to-remove')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.device.id).toBe(device.id);
      expect(response.body.device.isActive).toBe(false);
    });

    it('should return 400 when device not found', async () => {
      const user = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert(user);

      const response = await request(app.getHttpServer())
        .delete('/devices/non-existent-token')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Device not found');
    });

    it('should not allow deactivating another user device', async () => {
      const user = makeUser({ role: UserRole.Student });
      const otherUser = makeUser({ role: UserRole.Student });
      await setupApp(user);
      await testDbClient.instance(Tables.Users).insert([user, otherUser]);

      const otherUserDevice = makeUserDevice({
        userId: otherUser.id,
        deviceToken: 'other-user-token',
        isActive: true,
      });
      await testDbClient.instance(Tables.UserDevices).insert(otherUserDevice);

      const response = await request(app.getHttpServer())
        .delete('/devices/other-user-token')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Device not found');
    });
  });
});
