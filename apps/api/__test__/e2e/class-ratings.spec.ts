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
  makeClassRating,
} from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('schedule/routes/class-ratings', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([
      Tables.Users,
      Tables.Classes,
      Tables.ClassEnrollments,
      Tables.ClassRatings,
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

  describe('POST /classes/:classId/ratings', () => {
    it('should allow enrolled student to rate completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const enrollment = makeClassEnrollment({
        classId: completedClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Approved,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 5,
          comment: 'Amazing surf class!',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.rating).toBeDefined();
      expect(response.body.rating.classId).toBe(completedClass.id);
      expect(response.body.rating.studentId).toBe(studentUser.id);
      expect(response.body.rating.rating).toBe(5);
      expect(response.body.rating.comment).toBe('Amazing surf class!');
    });

    it('should allow rating without comment', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const enrollment = makeClassEnrollment({
        classId: completedClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Approved,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 4,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.rating.rating).toBe(4);
      expect(response.body.rating.comment).toBeNull();
    });

    it('should reject rating from non-student user', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 5,
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject rating for non-completed class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const scheduledClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Scheduled,
      });
      await testDbClient.instance(Tables.Classes).insert(scheduledClass);

      const enrollment = makeClassEnrollment({
        classId: scheduledClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Approved,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .post(`/classes/${scheduledClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 5,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('You can only rate completed classes');
    });

    it('should reject rating from student not enrolled in class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      // No enrollment for this student

      const response = await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 5,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'You can only rate classes you were enrolled in',
      );
    });

    it('should reject rating from student with pending enrollment', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const enrollment = makeClassEnrollment({
        classId: completedClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Pending,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      const response = await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 5,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'You can only rate classes you were enrolled in',
      );
    });

    it('should reject duplicate rating from same student', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const enrollment = makeClassEnrollment({
        classId: completedClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Approved,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      // Existing rating
      const existingRating = makeClassRating({
        classId: completedClass.id,
        studentId: studentUser.id,
        rating: 4,
      });
      await testDbClient.instance(Tables.ClassRatings).insert(existingRating);

      const response = await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 5,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'You have already rated this class',
      );
    });

    it('should reject rating below 1', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const enrollment = makeClassEnrollment({
        classId: completedClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Approved,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 0,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject rating above 5', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const enrollment = makeClassEnrollment({
        classId: completedClass.id,
        studentId: studentUser.id,
        status: EnrollmentStatus.Approved,
      });
      await testDbClient.instance(Tables.ClassEnrollments).insert(enrollment);

      await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 6,
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 for non-existent class', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const response = await request(app.getHttpServer())
        .post('/classes/00000000-0000-0000-0000-000000000000/ratings')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          rating: 5,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Class not found');
    });
  });

  describe('GET /classes/:classId/ratings', () => {
    it('should list ratings for a class with stats', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      const student2 = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser, student2]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const rating1 = makeClassRating({
        classId: completedClass.id,
        studentId: studentUser.id,
        rating: 5,
        comment: 'Excellent!',
      });
      const rating2 = makeClassRating({
        classId: completedClass.id,
        studentId: student2.id,
        rating: 3,
        comment: 'Good',
      });
      await testDbClient.instance(Tables.ClassRatings).insert([rating1, rating2]);

      const response = await request(app.getHttpServer())
        .get(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.ratings).toHaveLength(2);
      expect(response.body.totalRatings).toBe(2);
      expect(response.body.averageRating).toBe(4); // (5+3)/2
    });

    it('should return empty array for class with no ratings', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const response = await request(app.getHttpServer())
        .get(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.ratings).toEqual([]);
      expect(response.body.totalRatings).toBe(0);
      expect(response.body.averageRating).toBeNull();
    });

    it('should allow any authenticated user to view ratings', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const rating = makeClassRating({
        classId: completedClass.id,
        studentId: studentUser.id,
        rating: 4,
      });
      await testDbClient.instance(Tables.ClassRatings).insert(rating);

      const response = await request(app.getHttpServer())
        .get(`/classes/${completedClass.id}/ratings`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.ratings).toHaveLength(1);
    });

    it('should return 400 for non-existent class', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const response = await request(app.getHttpServer())
        .get('/classes/00000000-0000-0000-0000-000000000000/ratings')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Class not found');
    });
  });
});
