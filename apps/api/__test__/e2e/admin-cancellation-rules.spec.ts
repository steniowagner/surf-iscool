import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { ScheduleModule } from '@src/module/schedule/schedule.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { UserRole } from '@surf-iscool/types';

import { makeUser, makeSupabaseUser, makeCancellationRule } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('schedule/routes/admin-cancellation-rules', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([Tables.Users, Tables.CancellationRules]);
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

  const setupApp = async (adminUser: ReturnType<typeof makeUser>) => {
    const testingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), IdentityModule, ScheduleModule],
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

  describe('POST /admin/cancellation-rules', () => {
    it('should create a new cancellation rule', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .post('/admin/cancellation-rules')
        .send({ name: '24 Hour Rule', hoursBeforeClass: 24 })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.CREATED);

      expect(response.body.rule.name).toBe('24 Hour Rule');
      expect(response.body.rule.hoursBeforeClass).toBe(24);
      expect(response.body.rule.isActive).toBe(true);
      expect(response.body.rule.createdBy).toBe(adminUser.id);
    });

    it('should deactivate existing rules when creating a new one', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const existingRule = makeCancellationRule({
        createdBy: adminUser.id,
        isActive: true,
      });
      await testDbClient
        .instance(Tables.CancellationRules)
        .insert(existingRule);

      await request(app.getHttpServer())
        .post('/admin/cancellation-rules')
        .send({ name: 'New Rule', hoursBeforeClass: 48 })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.CREATED);

      // Verify the old rule is now inactive
      const listResponse = await request(app.getHttpServer())
        .get('/admin/cancellation-rules')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      const oldRule = listResponse.body.rules.find(
        (r: { id: string }) => r.id === existingRule.id,
      );
      expect(oldRule.isActive).toBe(false);

      const activeRules = listResponse.body.rules.filter(
        (r: { isActive: boolean }) => r.isActive,
      );
      expect(activeRules).toHaveLength(1);
      expect(activeRules[0].name).toBe('New Rule');
    });

    it('should validate required fields', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      await request(app.getHttpServer())
        .post('/admin/cancellation-rules')
        .send({})
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject non-admin users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .post('/admin/cancellation-rules')
        .send({ name: 'Test', hoursBeforeClass: 24 })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /admin/cancellation-rules', () => {
    it('should list all cancellation rules', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const rule1 = makeCancellationRule({
        createdBy: adminUser.id,
        isActive: false,
      });
      const rule2 = makeCancellationRule({
        createdBy: adminUser.id,
        isActive: true,
      });
      await testDbClient
        .instance(Tables.CancellationRules)
        .insert([rule1, rule2]);

      const response = await request(app.getHttpServer())
        .get('/admin/cancellation-rules')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.rules).toHaveLength(2);
    });

    it('should return empty array when no rules exist', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/cancellation-rules')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.rules).toEqual([]);
    });
  });

  describe('GET /admin/cancellation-rules/:id', () => {
    it('should return a cancellation rule by id', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const rule = makeCancellationRule({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.CancellationRules).insert(rule);

      const response = await request(app.getHttpServer())
        .get(`/admin/cancellation-rules/${rule.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.rule.id).toBe(rule.id);
      expect(response.body.rule.name).toBe(rule.name);
    });

    it('should return 400 when rule not found', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/cancellation-rules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Cancellation rule not found');
    });
  });

  describe('PATCH /admin/cancellation-rules/:id', () => {
    it('should update a cancellation rule', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const rule = makeCancellationRule({
        createdBy: adminUser.id,
        name: 'Old Name',
        hoursBeforeClass: 24,
      });
      await testDbClient.instance(Tables.CancellationRules).insert(rule);

      const response = await request(app.getHttpServer())
        .patch(`/admin/cancellation-rules/${rule.id}`)
        .send({ name: 'New Name', hoursBeforeClass: 48 })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.rule.name).toBe('New Name');
      expect(response.body.rule.hoursBeforeClass).toBe(48);
    });

    it('should deactivate other rules when activating one', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const activeRule = makeCancellationRule({
        createdBy: adminUser.id,
        isActive: true,
      });
      const inactiveRule = makeCancellationRule({
        createdBy: adminUser.id,
        isActive: false,
      });
      await testDbClient
        .instance(Tables.CancellationRules)
        .insert([activeRule, inactiveRule]);

      // Activate the inactive rule
      await request(app.getHttpServer())
        .patch(`/admin/cancellation-rules/${inactiveRule.id}`)
        .send({ isActive: true })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      // Verify only one rule is active
      const listResponse = await request(app.getHttpServer())
        .get('/admin/cancellation-rules')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      const activeRules = listResponse.body.rules.filter(
        (r: { isActive: boolean }) => r.isActive,
      );
      expect(activeRules).toHaveLength(1);
      expect(activeRules[0].id).toBe(inactiveRule.id);
    });

    it('should return 400 when rule not found', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .patch('/admin/cancellation-rules/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Test' })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Cancellation rule not found');
    });
  });

  describe('DELETE /admin/cancellation-rules/:id', () => {
    it('should delete a cancellation rule', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const rule = makeCancellationRule({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.CancellationRules).insert(rule);

      const response = await request(app.getHttpServer())
        .delete(`/admin/cancellation-rules/${rule.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.rule.id).toBe(rule.id);

      // Verify rule is deleted
      const listResponse = await request(app.getHttpServer())
        .get('/admin/cancellation-rules')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(listResponse.body.rules).toHaveLength(0);
    });

    it('should return 400 when rule not found', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .delete(
          '/admin/cancellation-rules/00000000-0000-0000-0000-000000000000',
        )
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Cancellation rule not found');
    });

    it('should reject non-admin users', async () => {
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient.instance(Tables.Users).insert(instructorUser);

      await request(app.getHttpServer())
        .delete('/admin/cancellation-rules/some-id')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
