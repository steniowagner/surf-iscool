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

import { makeUser, makeSupabaseUser, makeClass, makeClassInstructor } from '../factory';
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

  describe('GET /admin/classes/:id', () => {
    it('should return a class by id', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const response = await request(app.getHttpServer())
        .get(`/admin/classes/${classEntity.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.class).toBeDefined();
      expect(response.body.class.id).toBe(classEntity.id);
      expect(response.body.class.discipline).toBe(classEntity.discipline);
      expect(response.body.class.location).toBe(classEntity.location);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/admin/classes/${nonExistentId}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /admin/classes/:id', () => {
    it('should update a class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const response = await request(app.getHttpServer())
        .patch(`/admin/classes/${classEntity.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          location: 'Updated Beach Location',
          maxCapacity: 20,
        })
        .expect(HttpStatus.OK);

      expect(response.body.class.location).toBe('Updated Beach Location');
      expect(response.body.class.maxCapacity).toBe(20);
      expect(response.body.class.discipline).toBe(classEntity.discipline);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .patch(`/admin/classes/${nonExistentId}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ location: 'New Location' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when updating a cancelled class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient.instance(Tables.Classes).insert(cancelledClass);

      await request(app.getHttpServer())
        .patch(`/admin/classes/${cancelledClass.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ location: 'New Location' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when updating a completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      await request(app.getHttpServer())
        .patch(`/admin/classes/${completedClass.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ location: 'New Location' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /admin/classes/:id/cancel', () => {
    it('should cancel a class with reason', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const response = await request(app.getHttpServer())
        .post(`/admin/classes/${classEntity.id}/cancel`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ cancellationReason: 'Bad weather conditions' })
        .expect(HttpStatus.OK);

      expect(response.body.class.status).toBe(ClassStatus.Cancelled);
      expect(response.body.class.cancellationReason).toBe('Bad weather conditions');
    });

    it('should cancel a class without reason', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const response = await request(app.getHttpServer())
        .post(`/admin/classes/${classEntity.id}/cancel`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.class.status).toBe(ClassStatus.Cancelled);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .post(`/admin/classes/${nonExistentId}/cancel`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when cancelling an already cancelled class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient.instance(Tables.Classes).insert(cancelledClass);

      await request(app.getHttpServer())
        .post(`/admin/classes/${cancelledClass.id}/cancel`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when cancelling a completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      await request(app.getHttpServer())
        .post(`/admin/classes/${completedClass.id}/cancel`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /admin/classes/:id/complete', () => {
    it('should complete a class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const response = await request(app.getHttpServer())
        .post(`/admin/classes/${classEntity.id}/complete`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.class.status).toBe(ClassStatus.Completed);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .post(`/admin/classes/${nonExistentId}/complete`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when completing an already completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      await request(app.getHttpServer())
        .post(`/admin/classes/${completedClass.id}/complete`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when completing a cancelled class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient.instance(Tables.Classes).insert(cancelledClass);

      await request(app.getHttpServer())
        .post(`/admin/classes/${cancelledClass.id}/complete`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /admin/classes/:id/instructors', () => {
    it('should assign an instructor to a class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const response = await request(app.getHttpServer())
        .post(`/admin/classes/${classEntity.id}/instructors`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ instructorId: instructorUser.id })
        .expect(HttpStatus.CREATED);

      expect(response.body.classInstructor).toBeDefined();
      expect(response.body.classInstructor.classId).toBe(classEntity.id);
      expect(response.body.classInstructor.instructorId).toBe(instructorUser.id);
      expect(response.body.classInstructor.assignedBy).toBe(adminUser.id);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .post(`/admin/classes/${nonExistentId}/instructors`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ instructorId: instructorUser.id })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST for non-existent instructor', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const nonExistentInstructorId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .post(`/admin/classes/${classEntity.id}/instructors`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ instructorId: nonExistentInstructorId })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when instructor is already assigned', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const existingAssignment = makeClassInstructor({
        classId: classEntity.id,
        instructorId: instructorUser.id,
        assignedBy: adminUser.id,
      });
      await testDbClient.instance(Tables.ClassInstructors).insert(existingAssignment);

      await request(app.getHttpServer())
        .post(`/admin/classes/${classEntity.id}/instructors`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ instructorId: instructorUser.id })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when assigning to a cancelled class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient.instance(Tables.Classes).insert(cancelledClass);

      await request(app.getHttpServer())
        .post(`/admin/classes/${cancelledClass.id}/instructors`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ instructorId: instructorUser.id })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when assigning to a completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      await request(app.getHttpServer())
        .post(`/admin/classes/${completedClass.id}/instructors`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({ instructorId: instructorUser.id })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /admin/classes/:id/instructors/:instructorId', () => {
    it('should remove an instructor from a class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const assignment = makeClassInstructor({
        classId: classEntity.id,
        instructorId: instructorUser.id,
        assignedBy: adminUser.id,
      });
      await testDbClient.instance(Tables.ClassInstructors).insert(assignment);

      const response = await request(app.getHttpServer())
        .delete(`/admin/classes/${classEntity.id}/instructors/${instructorUser.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classInstructor).toBeDefined();
      expect(response.body.classInstructor.classId).toBe(classEntity.id);
      expect(response.body.classInstructor.instructorId).toBe(instructorUser.id);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/admin/classes/${nonExistentId}/instructors/${instructorUser.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when instructor is not assigned', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      await request(app.getHttpServer())
        .delete(`/admin/classes/${classEntity.id}/instructors/${instructorUser.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when removing from a cancelled class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient.instance(Tables.Classes).insert(cancelledClass);

      await request(app.getHttpServer())
        .delete(`/admin/classes/${cancelledClass.id}/instructors/${instructorUser.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when removing from a completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, instructorUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      await request(app.getHttpServer())
        .delete(`/admin/classes/${completedClass.id}/instructors/${instructorUser.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});
