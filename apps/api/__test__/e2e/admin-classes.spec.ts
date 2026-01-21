import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { ScheduleModule } from '@src/module/schedule/schedule.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { UserRole, Discipline, SkillLevel, ClassStatus } from '@surf-iscool/types';

import { makeUser, makeSupabaseUser, makeClass } from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('schedule/routes/admin-classes', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([
      Tables.Users,
      Tables.Classes,
      Tables.ClassInstructors,
    ]);
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

  describe('POST /admin/classes', () => {
    it('should return FORBIDDEN for non-admin users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .post('/admin/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          discipline: Discipline.Surf,
          skillLevel: SkillLevel.Beginner,
          scheduledAt: new Date().toISOString(),
          location: 'Beach',
          maxCapacity: 10,
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should create a class for admin user', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const scheduledAt = new Date('2026-06-15T10:00:00Z').toISOString();

      const response = await request(app.getHttpServer())
        .post('/admin/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          discipline: Discipline.Surf,
          skillLevel: SkillLevel.Beginner,
          scheduledAt,
          duration: 90,
          location: 'Copacabana Beach',
          maxCapacity: 15,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.class).toBeDefined();
      expect(response.body.class.discipline).toBe(Discipline.Surf);
      expect(response.body.class.skillLevel).toBe(SkillLevel.Beginner);
      expect(response.body.class.duration).toBe(90);
      expect(response.body.class.location).toBe('Copacabana Beach');
      expect(response.body.class.maxCapacity).toBe(15);
      expect(response.body.class.createdBy).toBe(adminUser.id);
    });

    it('should create a class with default duration when not provided', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .post('/admin/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          discipline: Discipline.Skate,
          skillLevel: SkillLevel.Advanced,
          scheduledAt: new Date().toISOString(),
          location: 'Skate Park',
          maxCapacity: 8,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.class.duration).toBe(60);
    });

    it('should return BAD_REQUEST for invalid discipline', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      await request(app.getHttpServer())
        .post('/admin/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          discipline: 'INVALID',
          skillLevel: SkillLevel.Beginner,
          scheduledAt: new Date().toISOString(),
          location: 'Beach',
          maxCapacity: 10,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST for missing required fields', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      await request(app.getHttpServer())
        .post('/admin/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          discipline: Discipline.Surf,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /admin/classes', () => {
    it('should list all classes with pagination', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const class1 = makeClass({ createdBy: adminUser.id });
      const class2 = makeClass({ createdBy: adminUser.id });
      const class3 = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert([class1, class2, class3]);

      const response = await request(app.getHttpServer())
        .get('/admin/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(15);
      expect(response.body.totalPages).toBe(1);
    });

    it('should filter classes by status', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const scheduledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient
        .instance(Tables.Classes)
        .insert([scheduledClass, cancelledClass]);

      const response = await request(app.getHttpServer())
        .get('/admin/classes')
        .query({ status: ClassStatus.Scheduled })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].status).toBe(ClassStatus.Scheduled);
    });

    it('should paginate results', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const classes = Array.from({ length: 5 }, () =>
        makeClass({ createdBy: adminUser.id }),
      );
      await testDbClient.instance(Tables.Classes).insert(classes);

      const response = await request(app.getHttpServer())
        .get('/admin/classes')
        .query({ page: 1, pageSize: 2 })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(2);
      expect(response.body.total).toBe(5);
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(2);
      expect(response.body.totalPages).toBe(3);
    });

    it('should return empty array when no classes exist', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });
});
