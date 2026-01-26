import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { loadEnv } from '@shared-libs/load-env';
loadEnv();
import { SupabaseAuthService } from '@shared-modules/auth/service/supabase-auth.service';
import { ScheduleModule } from '@src/module/schedule/schedule.module';
import { IdentityModule } from '@src/module/identity/identity.module';
import { ConfigModule } from '@shared-modules/config/config.module';

import {
  UserRole,
  UserStatus,
  ClassStatus,
  Discipline,
  SkillLevel,
  EnrollmentStatus,
} from '@surf-iscool/types';

import {
  makeUser,
  makeSupabaseUser,
  makeClass,
  makeClassEnrollment,
  makeClassInstructor,
} from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('schedule/routes/admin-analytics', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([
      Tables.Users,
      Tables.Classes,
      Tables.ClassEnrollments,
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

  const setupApp = async (authUser: ReturnType<typeof makeUser>) => {
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

  describe('GET /admin/analytics/classes', () => {
    it('should return class analytics for admin', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        status: UserStatus.Active,
      });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      // Create classes with different statuses, disciplines, and skill levels
      const scheduledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        discipline: Discipline.Surf,
        skillLevel: SkillLevel.Beginner,
      });
      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
        discipline: Discipline.Surf,
        skillLevel: SkillLevel.Advanced,
      });
      const cancelledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Cancelled,
        discipline: Discipline.Skate,
        skillLevel: SkillLevel.Expert,
      });
      await testDbClient
        .instance(Tables.Classes)
        .insert([scheduledClass, completedClass, cancelledClass]);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalClasses).toBe(3);
      expect(response.body.byStatus).toBeDefined();
      expect(response.body.byStatus[ClassStatus.Scheduled]).toBe(1);
      expect(response.body.byStatus[ClassStatus.Completed]).toBe(1);
      expect(response.body.byStatus[ClassStatus.Cancelled]).toBe(1);
      expect(response.body.byDiscipline).toBeDefined();
      expect(response.body.byDiscipline[Discipline.Surf]).toBe(2);
      expect(response.body.byDiscipline[Discipline.Skate]).toBe(1);
      expect(response.body.bySkillLevel).toBeDefined();
      expect(response.body.bySkillLevel[SkillLevel.Beginner]).toBe(1);
      expect(response.body.bySkillLevel[SkillLevel.Advanced]).toBe(1);
      expect(response.body.bySkillLevel[SkillLevel.Expert]).toBe(1);
    });

    it('should return zero counts for missing statuses/disciplines/levels', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        status: UserStatus.Active,
      });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      // Only one class
      const singleClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
        discipline: Discipline.Surf,
        skillLevel: SkillLevel.Beginner,
      });
      await testDbClient.instance(Tables.Classes).insert(singleClass);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalClasses).toBe(1);
      expect(response.body.byStatus[ClassStatus.Scheduled]).toBe(1);
      expect(response.body.byStatus[ClassStatus.Completed]).toBe(0);
      expect(response.body.byStatus[ClassStatus.Cancelled]).toBe(0);
      expect(response.body.byDiscipline[Discipline.Surf]).toBe(1);
      expect(response.body.byDiscipline[Discipline.Skate]).toBe(0);
      expect(response.body.bySkillLevel[SkillLevel.Beginner]).toBe(1);
      expect(response.body.bySkillLevel[SkillLevel.Advanced]).toBe(0);
      expect(response.body.bySkillLevel[SkillLevel.Expert]).toBe(0);
    });

    it('should return zeros when no classes exist', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        status: UserStatus.Active,
      });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalClasses).toBe(0);
      expect(response.body.byStatus[ClassStatus.Scheduled]).toBe(0);
      expect(response.body.byDiscipline[Discipline.Surf]).toBe(0);
      expect(response.body.bySkillLevel[SkillLevel.Beginner]).toBe(0);
    });

    it('should reject non-admin users', async () => {
      const studentUser = makeUser({
        role: UserRole.Student,
        status: UserStatus.Active,
      });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/admin/analytics/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject instructor users', async () => {
      const instructorUser = makeUser({
        role: UserRole.Instructor,
        status: UserStatus.Active,
      });
      await setupApp(instructorUser);
      await testDbClient.instance(Tables.Users).insert(instructorUser);

      await request(app.getHttpServer())
        .get('/admin/analytics/classes')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /admin/analytics/enrollments', () => {
    it('should return enrollment analytics for admin', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        status: UserStatus.Active,
      });
      const student1 = makeUser({
        role: UserRole.Student,
        status: UserStatus.Active,
      });
      const student2 = makeUser({
        role: UserRole.Student,
        status: UserStatus.Active,
      });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, student1, student2]);

      const aClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(aClass);

      // Create enrollments with different statuses
      const pendingEnrollment = makeClassEnrollment({
        classId: aClass.id,
        studentId: student1.id,
        status: EnrollmentStatus.Pending,
        isExperimental: false,
      });
      const approvedEnrollment = makeClassEnrollment({
        classId: aClass.id,
        studentId: student2.id,
        status: EnrollmentStatus.Approved,
        isExperimental: true,
      });
      await testDbClient
        .instance(Tables.ClassEnrollments)
        .insert([pendingEnrollment, approvedEnrollment]);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/enrollments')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalEnrollments).toBe(2);
      expect(response.body.experimentalEnrollments).toBe(1);
      expect(response.body.byStatus).toBeDefined();
      expect(response.body.byStatus[EnrollmentStatus.Pending]).toBe(1);
      expect(response.body.byStatus[EnrollmentStatus.Approved]).toBe(1);
      expect(response.body.byStatus[EnrollmentStatus.Denied]).toBe(0);
      expect(response.body.byStatus[EnrollmentStatus.Cancelled]).toBe(0);
    });

    it('should return zeros when no enrollments exist', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        status: UserStatus.Active,
      });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/enrollments')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalEnrollments).toBe(0);
      expect(response.body.experimentalEnrollments).toBe(0);
      expect(response.body.byStatus[EnrollmentStatus.Pending]).toBe(0);
      expect(response.body.byStatus[EnrollmentStatus.Approved]).toBe(0);
    });

    it('should reject non-admin users', async () => {
      const studentUser = makeUser({
        role: UserRole.Student,
        status: UserStatus.Active,
      });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/admin/analytics/enrollments')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /admin/analytics/instructors', () => {
    it('should return instructor analytics for admin', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        status: UserStatus.Active,
      });
      const instructor1 = makeUser({
        role: UserRole.Instructor,
        status: UserStatus.Active,
      });
      const instructor2 = makeUser({
        role: UserRole.Instructor,
        status: UserStatus.Active,
      });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructor1, instructor2]);

      // Create classes
      const class1 = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      const class2 = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      const class3 = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient
        .instance(Tables.Classes)
        .insert([class1, class2, class3]);

      // Assign instructors to classes
      const assignment1 = makeClassInstructor({
        classId: class1.id,
        instructorId: instructor1.id,
        assignedBy: adminUser.id,
      });
      const assignment2 = makeClassInstructor({
        classId: class2.id,
        instructorId: instructor1.id,
        assignedBy: adminUser.id,
      });
      const assignment3 = makeClassInstructor({
        classId: class3.id,
        instructorId: instructor2.id,
        assignedBy: adminUser.id,
      });
      await testDbClient
        .instance(Tables.ClassInstructors)
        .insert([assignment1, assignment2, assignment3]);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/instructors')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalAssignments).toBe(3);
      expect(response.body.uniqueInstructorsWithClasses).toBe(2);
      expect(response.body.classesPerInstructor).toHaveLength(2);
      // First instructor should have 2 classes
      const firstInstructor = response.body.classesPerInstructor.find(
        (i: { instructorId: string }) => i.instructorId === instructor1.id,
      );
      expect(firstInstructor?.classCount).toBe(2);
    });

    it('should return zeros when no instructor assignments exist', async () => {
      const adminUser = makeUser({
        role: UserRole.Admin,
        status: UserStatus.Active,
      });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/analytics/instructors')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.totalAssignments).toBe(0);
      expect(response.body.uniqueInstructorsWithClasses).toBe(0);
      expect(response.body.classesPerInstructor).toEqual([]);
    });

    it('should reject non-admin users', async () => {
      const studentUser = makeUser({
        role: UserRole.Student,
        status: UserStatus.Active,
      });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .get('/admin/analytics/instructors')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
