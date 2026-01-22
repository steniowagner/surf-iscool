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

  describe('GET /instructor/classes/upcoming', () => {
    it('should return empty array when instructor has no upcoming classes', async () => {
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient.instance(Tables.Users).insert(instructorUser);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes/upcoming')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toEqual([]);
    });

    it('should return only scheduled classes within next 7 days', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const now = new Date();

      // Class scheduled 2 days from now (should be included)
      const upcomingClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      });

      // Class scheduled 10 days from now (should NOT be included)
      const farFutureClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        scheduledAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      });

      // Class that already happened (should NOT be included)
      const pastClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        scheduledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      });

      await testDbClient
        .instance(Tables.Classes)
        .insert([upcomingClass, farFutureClass, pastClass]);

      // Assign all classes to instructor
      await testDbClient.instance(Tables.ClassInstructors).insert([
        makeClassInstructor({
          classId: upcomingClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
        makeClassInstructor({
          classId: farFutureClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
        makeClassInstructor({
          classId: pastClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes/upcoming')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].id).toBe(upcomingClass.id);
    });

    it('should not include cancelled classes', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const now = new Date();

      const scheduledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        scheduledAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      });

      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
        scheduledAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      });

      await testDbClient
        .instance(Tables.Classes)
        .insert([scheduledClass, cancelledClass]);

      await testDbClient.instance(Tables.ClassInstructors).insert([
        makeClassInstructor({
          classId: scheduledClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
        makeClassInstructor({
          classId: cancelledClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes/upcoming')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(1);
      expect(response.body.classes[0].id).toBe(scheduledClass.id);
    });

    it('should sort classes by scheduled date ascending', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const now = new Date();

      const laterClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      });

      const earlierClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        scheduledAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      });

      await testDbClient
        .instance(Tables.Classes)
        .insert([laterClass, earlierClass]);

      await testDbClient.instance(Tables.ClassInstructors).insert([
        makeClassInstructor({
          classId: laterClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
        makeClassInstructor({
          classId: earlierClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes/upcoming')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(2);
      expect(response.body.classes[0].id).toBe(earlierClass.id);
      expect(response.body.classes[1].id).toBe(laterClass.id);
    });

    it('should reject non-instructor users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/instructor/classes/upcoming')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /instructor/classes/history', () => {
    it('should return empty array when instructor has no past classes', async () => {
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient.instance(Tables.Users).insert(instructorUser);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes/history')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toEqual([]);
    });

    it('should return past and completed classes', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const now = new Date();

      // Completed class
      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
        scheduledAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      });

      // Past scheduled class (not yet marked completed)
      const pastScheduledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        scheduledAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      });

      // Future class (should NOT be included)
      const futureClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        scheduledAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      });

      await testDbClient
        .instance(Tables.Classes)
        .insert([completedClass, pastScheduledClass, futureClass]);

      await testDbClient.instance(Tables.ClassInstructors).insert([
        makeClassInstructor({
          classId: completedClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
        makeClassInstructor({
          classId: pastScheduledClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
        makeClassInstructor({
          classId: futureClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes/history')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(2);
      const classIds = response.body.classes.map((c: { id: string }) => c.id);
      expect(classIds).toContain(completedClass.id);
      expect(classIds).toContain(pastScheduledClass.id);
      expect(classIds).not.toContain(futureClass.id);
    });

    it('should sort classes by scheduled date descending', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const now = new Date();

      const olderClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
        scheduledAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      });

      const newerClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
        scheduledAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      });

      await testDbClient
        .instance(Tables.Classes)
        .insert([olderClass, newerClass]);

      await testDbClient.instance(Tables.ClassInstructors).insert([
        makeClassInstructor({
          classId: olderClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
        makeClassInstructor({
          classId: newerClass.id,
          instructorId: instructorUser.id,
          assignedBy: adminUser.id,
        }),
      ]);

      const response = await request(app.getHttpServer())
        .get('/instructor/classes/history')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.classes).toHaveLength(2);
      // Most recent first
      expect(response.body.classes[0].id).toBe(newerClass.id);
      expect(response.body.classes[1].id).toBe(olderClass.id);
    });

    it('should reject non-instructor users', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/instructor/classes/history')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
