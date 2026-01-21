import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { ScheduleModule } from '@src/module/schedule/schedule.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import { UserRole, ClassStatus } from '@surf-iscool/types';

import {
  makeUser,
  makeSupabaseUser,
  makeClass,
  makeClassInstructor,
  makeClassEnrollment,
} from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('schedule/routes/instructor-classes', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([
      Tables.Users,
      Tables.Classes,
      Tables.ClassInstructors,
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

  const setupApp = async (instructorUser: ReturnType<typeof makeUser>) => {
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
                  id: instructorUser.id,
                  email: instructorUser.email,
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

  describe('GET /instructor/classes', () => {
    it('should return empty array when instructor has no assigned classes', async () => {
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient.instance(Tables.Users).insert(instructorUser);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toEqual([]);
    });

    it('should return assigned classes for instructor', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const class1 = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      const class2 = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert([class1, class2]);

      const assignment1 = makeClassInstructor({
        classId: class1.id,
        instructorId: instructorUser.id,
        assignedBy: adminUser.id,
      });
      const assignment2 = makeClassInstructor({
        classId: class2.id,
        instructorId: instructorUser.id,
        assignedBy: adminUser.id,
      });
      await testDbClient
        .instance(Tables.ClassInstructors)
        .insert([assignment1, assignment2]);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(2);
      expect(response.body.classes.map((c: { id: string }) => c.id)).toEqual(
        expect.arrayContaining([class1.id, class2.id]),
      );
    });

    it('should not return classes instructor is not assigned to', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      const otherInstructor = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser, otherInstructor]);

      const assignedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      const unassignedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient
        .instance(Tables.Classes)
        .insert([assignedClass, unassignedClass]);

      // Only assign one class to our instructor
      const assignment = makeClassInstructor({
        classId: assignedClass.id,
        instructorId: instructorUser.id,
        assignedBy: adminUser.id,
      });
      // Assign the other class to a different instructor
      const otherAssignment = makeClassInstructor({
        classId: unassignedClass.id,
        instructorId: otherInstructor.id,
        assignedBy: adminUser.id,
      });
      await testDbClient
        .instance(Tables.ClassInstructors)
        .insert([assignment, otherAssignment]);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].id).toBe(assignedClass.id);
    });

    it('should reject non-instructor users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/instructor/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /instructor/classes/:id', () => {
    it('should return class details with enrollments', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      const student1 = makeUser({ role: UserRole.Student });
      const student2 = makeUser({ role: UserRole.Student });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser, student1, student2]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const assignment = makeClassInstructor({
        classId: testClass.id,
        instructorId: instructorUser.id,
        assignedBy: adminUser.id,
      });
      await testDbClient.instance(Tables.ClassInstructors).insert(assignment);

      const enrollment1 = makeClassEnrollment({
        classId: testClass.id,
        studentId: student1.id,
      });
      const enrollment2 = makeClassEnrollment({
        classId: testClass.id,
        studentId: student2.id,
      });
      await testDbClient
        .instance(Tables.ClassEnrollments)
        .insert([enrollment1, enrollment2]);

      const response = await request(app.getHttpServer())
        .get(`/instructor/classes/${testClass.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.class.id).toBe(testClass.id);
      expect(response.body.class.enrollments).toHaveLength(2);
      expect(response.body.class.enrollmentCount).toBe(2);
    });

    it('should return 400 when class not found', async () => {
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient.instance(Tables.Users).insert(instructorUser);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Class not found');
    });

    it('should reject access when instructor not assigned to class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      const otherInstructor = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser, otherInstructor]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      // Assign class to a different instructor
      const assignment = makeClassInstructor({
        classId: testClass.id,
        instructorId: otherInstructor.id,
        assignedBy: adminUser.id,
      });
      await testDbClient.instance(Tables.ClassInstructors).insert(assignment);

      const response = await request(app.getHttpServer())
        .get(`/instructor/classes/${testClass.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('You are not assigned to this class');
    });

    it('should return correct enrollment count with empty enrollments', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const testClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(testClass);

      const assignment = makeClassInstructor({
        classId: testClass.id,
        instructorId: instructorUser.id,
        assignedBy: adminUser.id,
      });
      await testDbClient.instance(Tables.ClassInstructors).insert(assignment);

      const response = await request(app.getHttpServer())
        .get(`/instructor/classes/${testClass.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.class.enrollments).toEqual([]);
      expect(response.body.class.enrollmentCount).toBe(0);
    });

    it('should reject non-instructor users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/instructor/classes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
