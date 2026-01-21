import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { ScheduleModule } from '@src/module/schedule/schedule.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { UserRole, ClassStatus, EnrollmentStatus } from '@surf-iscool/types';

import {
  makeUser,
  makeSupabaseUser,
  makeClass,
  makeClassEnrollment,
} from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('schedule/routes/admin-enrollments', () => {
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

  describe('GET /admin/enrollments', () => {
    it('should list all enrollments', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const enrollment1 = makeClassEnrollment({
        classId: testClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Pending,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment1);

      const response = await request(app.getHttpServer())
        .get('/admin/enrollments')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.enrollments).toHaveLength(1);
      expect(response.body.enrollments[0].id).toBe(enrollment1.id);
    });

    it('should filter enrollments by status', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const student1 = makeUser({ role: UserRole.Student });
      const student2 = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, student1, student2]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const pendingEnrollment = makeClassEnrollment({
        classId: testClass.id,
        studentId: student1.id,
        status: EnrollmentStatus.Pending,
      });
      const approvedEnrollment = makeClassEnrollment({
        classId: testClass.id,
        studentId: student2.id,
        status: EnrollmentStatus.Approved,
      });
      await testDbClient
        .instance(Tables.ClassEnrollments)
        .insert([pendingEnrollment, approvedEnrollment]);

      const response = await request(app.getHttpServer())
        .get('/admin/enrollments')
        .query({ status: EnrollmentStatus.Pending })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.enrollments).toHaveLength(1);
      expect(response.body.enrollments[0].status).toBe(EnrollmentStatus.Pending);
    });

    it('should reject non-admin users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/admin/enrollments')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('POST /admin/enrollments/:id/approve', () => {
    it('should approve a pending enrollment', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const enrollment = makeClassEnrollment({
        classId: testClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Pending,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .post(`/admin/enrollments/${enrollment.id}/approve`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.CREATED);

      expect(response.body.enrollment.status).toBe(EnrollmentStatus.Approved);
      expect(response.body.enrollment.reviewedBy).toBe(adminUser.id);
      expect(response.body.enrollment.reviewedAt).toBeDefined();
    });

    it('should return 400 when enrollment not found', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .post('/admin/enrollments/00000000-0000-0000-0000-000000000000/approve')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Enrollment not found');
    });

    it('should return 400 when enrollment is not pending', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const enrollment = makeClassEnrollment({
        classId: testClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Approved,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .post(`/admin/enrollments/${enrollment.id}/approve`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'Only pending enrollments can be approved',
      );
    });

    it('should reject non-admin users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .post('/admin/enrollments/some-id/approve')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('POST /admin/enrollments/:id/deny', () => {
    it('should deny a pending enrollment', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const enrollment = makeClassEnrollment({
        classId: testClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Pending,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .post(`/admin/enrollments/${enrollment.id}/deny`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.CREATED);

      expect(response.body.enrollment.status).toBe(EnrollmentStatus.Denied);
      expect(response.body.enrollment.reviewedBy).toBe(adminUser.id);
      expect(response.body.enrollment.reviewedAt).toBeDefined();
    });

    it('should deny enrollment with reason', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const enrollment = makeClassEnrollment({
        classId: testClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Pending,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const denialReason = 'Class is full for beginners';

      const response = await request(app.getHttpServer())
        .post(`/admin/enrollments/${enrollment.id}/deny`)
        .send({ reason: denialReason })
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.CREATED);

      expect(response.body.enrollment.status).toBe(EnrollmentStatus.Denied);
      expect(response.body.enrollment.denialReason).toBe(denialReason);
    });

    it('should return 400 when enrollment not found', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .post('/admin/enrollments/00000000-0000-0000-0000-000000000000/deny')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Enrollment not found');
    });

    it('should return 400 when enrollment is not pending', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const enrollment = makeClassEnrollment({
        classId: testClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Cancelled,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .post(`/admin/enrollments/${enrollment.id}/deny`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'Only pending enrollments can be denied',
      );
    });

    it('should reject non-admin users', async () => {
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient.instance(Tables.Users).insert(instructorUser);

      await request(app.getHttpServer())
        .post('/admin/enrollments/some-id/deny')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
