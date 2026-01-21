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

import {
  makeUser,
  makeSupabaseUser,
  makeClass,
  makeClassEnrollment,
} from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('schedule/routes/student-classes', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([
      Tables.Users,
      Tables.Classes,
      Tables.ClassEnrollments,
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

  const setupApp = async (studentUser: ReturnType<typeof makeUser>) => {
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
                  id: studentUser.id,
                  email: studentUser.email,
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

  describe('GET /classes', () => {
    it('should list available classes', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const class1 = makeClass({ createdBy: adminUser.id, status: ClassStatus.Scheduled });
      const class2 = makeClass({ createdBy: adminUser.id, status: ClassStatus.Scheduled });
      await testDbClient.instance(Tables.Classes).insert([class1, class2]);

      const response = await request(app.getHttpServer())
        .get('/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(2);
      expect(response.body.classes[0].enrollmentCount).toBeDefined();
      expect(response.body.classes[0].spotsRemaining).toBeDefined();
    });

    it('should filter classes by discipline', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const surfClass = makeClass({
        createdBy: adminUser.id,
        discipline: Discipline.Surf,
      });
      const skateClass = makeClass({
        createdBy: adminUser.id,
        discipline: Discipline.Skate,
      });
      await testDbClient.instance(Tables.Classes).insert([surfClass, skateClass]);

      const response = await request(app.getHttpServer())
        .get('/classes')
        .query({ discipline: Discipline.Surf })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].discipline).toBe(Discipline.Surf);
    });

    it('should filter classes by skill level', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const beginnerClass = makeClass({
        createdBy: adminUser.id,
        skillLevel: SkillLevel.Beginner,
      });
      const advancedClass = makeClass({
        createdBy: adminUser.id,
        skillLevel: SkillLevel.Advanced,
      });
      await testDbClient.instance(Tables.Classes).insert([beginnerClass, advancedClass]);

      const response = await request(app.getHttpServer())
        .get('/classes')
        .query({ skillLevel: SkillLevel.Beginner })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].skillLevel).toBe(SkillLevel.Beginner);
    });

    it('should not show cancelled classes', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const scheduledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient.instance(Tables.Classes).insert([scheduledClass, cancelledClass]);

      const response = await request(app.getHttpServer())
        .get('/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].status).toBe(ClassStatus.Scheduled);
    });

    it('should not show completed classes', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const scheduledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert([scheduledClass, completedClass]);

      const response = await request(app.getHttpServer())
        .get('/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].status).toBe(ClassStatus.Scheduled);
    });

    it('should paginate results', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const classes = Array.from({ length: 5 }, () =>
        makeClass({ createdBy: adminUser.id }),
      );
      await testDbClient.instance(Tables.Classes).insert(classes);

      const response = await request(app.getHttpServer())
        .get('/classes')
        .query({ page: 1, pageSize: 2 })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(2);
      expect(response.body.total).toBe(5);
      expect(response.body.totalPages).toBe(3);
    });
  });

  describe('GET /classes/:id', () => {
    it('should return class details with enrollment info', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const classEntity = makeClass({ createdBy: adminUser.id, maxCapacity: 10 });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const response = await request(app.getHttpServer())
        .get(`/classes/${classEntity.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.class).toBeDefined();
      expect(response.body.class.id).toBe(classEntity.id);
      expect(response.body.class.enrollmentCount).toBe(0);
      expect(response.body.class.spotsRemaining).toBe(10);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/classes/${nonExistentId}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should show correct enrollment count', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      const otherStudent = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser, otherStudent]);

      const classEntity = makeClass({ createdBy: adminUser.id, maxCapacity: 10 });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const enrollment = makeClassEnrollment({
        classId: classEntity.id,
        studentId: otherStudent.id,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .get(`/classes/${classEntity.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.class.enrollmentCount).toBe(1);
      expect(response.body.class.spotsRemaining).toBe(9);
    });
  });

  describe('POST /classes/:id/enroll', () => {
    it('should enroll student in a class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const response = await request(app.getHttpServer())
        .post(`/classes/${classEntity.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.CREATED);

      expect(response.body.enrollment).toBeDefined();
      expect(response.body.enrollment.classId).toBe(classEntity.id);
      expect(response.body.enrollment.studentId).toBe(studentUser.id);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .post(`/classes/${nonExistentId}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when class is full', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      const otherStudent = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser, otherStudent]);

      const classEntity = makeClass({ createdBy: adminUser.id, maxCapacity: 1 });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const existingEnrollment = makeClassEnrollment({
        classId: classEntity.id,
        studentId: otherStudent.id,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(existingEnrollment);

      await request(app.getHttpServer())
        .post(`/classes/${classEntity.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when already enrolled', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const existingEnrollment = makeClassEnrollment({
        classId: classEntity.id,
        studentId: studentUser.id,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(existingEnrollment);

      await request(app.getHttpServer())
        .post(`/classes/${classEntity.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST for cancelled class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient.instance(Tables.Classes).insert(cancelledClass);

      await request(app.getHttpServer())
        .post(`/classes/${cancelledClass.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST for completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /classes/:id/enroll', () => {
    it('should cancel enrollment', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      const enrollment = makeClassEnrollment({
        classId: classEntity.id,
        studentId: studentUser.id,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .delete(`/classes/${classEntity.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.enrollment).toBeDefined();
      expect(response.body.enrollment.classId).toBe(classEntity.id);
      expect(response.body.enrollment.studentId).toBe(studentUser.id);
    });

    it('should return BAD_REQUEST for non-existent class', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .delete(`/classes/${nonExistentId}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST when not enrolled', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const classEntity = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert(classEntity);

      await request(app.getHttpServer())
        .delete(`/classes/${classEntity.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST for cancelled class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
      });
      await testDbClient.instance(Tables.Classes).insert(cancelledClass);

      await request(app.getHttpServer())
        .delete(`/classes/${cancelledClass.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return BAD_REQUEST for completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      await request(app.getHttpServer())
        .delete(`/classes/${completedClass.id}/enroll`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /classes/me/enrollments', () => {
    it('should return student enrollments', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert([adminUser, studentUser]);

      const class1 = makeClass({ createdBy: adminUser.id });
      const class2 = makeClass({ createdBy: adminUser.id });
      await testDbClient.instance(Tables.Classes).insert([class1, class2]);

      const enrollment1 = makeClassEnrollment({
        classId: class1.id,
        studentId: studentUser.id,
      });
      const enrollment2 = makeClassEnrollment({
        classId: class2.id,
        studentId: studentUser.id,
      });
      await testDbClient
        .instance(Tables.ClassEnrollments)
        .insert([enrollment1, enrollment2]);

      const response = await request(app.getHttpServer())
        .get('/classes/me/enrollments')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.enrollments).toHaveLength(2);
    });

    it('should return empty array when no enrollments', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const response = await request(app.getHttpServer())
        .get('/classes/me/enrollments')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.enrollments).toHaveLength(0);
    });
  });
});
