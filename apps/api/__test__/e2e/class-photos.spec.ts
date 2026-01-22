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
  makeClassInstructor,
  makeClassEnrollment,
  makeClassPhoto,
} from '../factory';
import { Tables } from '../enum/tables.enum';
import { TestDb } from '../utils';

describe('schedule/routes/class-photos', () => {
  let app: INestApplication;
  let testDbClient: TestDb;

  beforeAll(async () => {
    testDbClient = new TestDb([
      Tables.Users,
      Tables.Classes,
      Tables.ClassInstructors,
      Tables.ClassEnrollments,
      Tables.ClassPhotos,
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

  describe('POST /classes/:classId/photos', () => {
    it('should upload photo to completed class as enrolled student', async () => {
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
        .post(`/classes/${completedClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          url: 'https://example.com/photo.jpg',
          caption: 'Great surf session!',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.photo).toBeDefined();
      expect(response.body.photo.classId).toBe(completedClass.id);
      expect(response.body.photo.uploadedBy).toBe(studentUser.id);
      expect(response.body.photo.url).toBe('https://example.com/photo.jpg');
      expect(response.body.photo.caption).toBe('Great surf session!');
    });

    it('should upload photo to completed class as assigned instructor', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const assignment = makeClassInstructor({
        classId: completedClass.id,
        instructorId: instructorUser.id,
        assignedBy: adminUser.id,
      });
      await testDbClient.instance(Tables.ClassInstructors).insert(assignment);

      const response = await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          url: 'https://example.com/instructor-photo.jpg',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.photo.uploadedBy).toBe(instructorUser.id);
    });

    it('should upload photo to any completed class as admin', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      await setupApp(adminUser);
      await testDbClient.instance(Tables.Users).insert(adminUser);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const response = await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          url: 'https://example.com/admin-photo.jpg',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.photo.uploadedBy).toBe(adminUser.id);
    });

    it('should reject upload to non-completed class', async () => {
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
        .post(`/classes/${scheduledClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          url: 'https://example.com/photo.jpg',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'Photos can only be uploaded to completed classes',
      );
    });

    it('should reject upload from student not enrolled in class', async () => {
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
        .post(`/classes/${completedClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          url: 'https://example.com/photo.jpg',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'You do not have permission to upload photos to this class',
      );
    });

    it('should reject upload from instructor not assigned to class', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const instructorUser = makeUser({ role: UserRole.Instructor });
      await setupApp(instructorUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, instructorUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      // No assignment for this instructor

      const response = await request(app.getHttpServer())
        .post(`/classes/${completedClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          url: 'https://example.com/photo.jpg',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'You do not have permission to upload photos to this class',
      );
    });

    it('should return 400 for non-existent class', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const response = await request(app.getHttpServer())
        .post('/classes/00000000-0000-0000-0000-000000000000/photos')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          url: 'https://example.com/photo.jpg',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Class not found');
    });

    it('should reject invalid URL', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      await request(app.getHttpServer())
        .post('/classes/00000000-0000-0000-0000-000000000000/photos')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .send({
          url: 'not-a-valid-url',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /classes/:classId/photos', () => {
    it('should list photos for a class', async () => {
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

      const photo1 = makeClassPhoto({
        classId: completedClass.id,
        uploadedBy: adminUser.id,
      });
      const photo2 = makeClassPhoto({
        classId: completedClass.id,
        uploadedBy: studentUser.id,
      });
      await testDbClient.instance(Tables.ClassPhotos).insert([photo1, photo2]);

      const response = await request(app.getHttpServer())
        .get(`/classes/${completedClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.photos).toHaveLength(2);
    });

    it('should return empty array for class with no photos', async () => {
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
        .get(`/classes/${completedClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.photos).toEqual([]);
    });

    it('should return 400 for non-existent class', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const response = await request(app.getHttpServer())
        .get('/classes/00000000-0000-0000-0000-000000000000/photos')
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Class not found');
    });
  });

  describe('DELETE /classes/:classId/photos/:photoId', () => {
    it('should allow owner to delete their photo', async () => {
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

      const photo = makeClassPhoto({
        classId: completedClass.id,
        uploadedBy: studentUser.id,
      });
      await testDbClient.instance(Tables.ClassPhotos).insert(photo);

      const response = await request(app.getHttpServer())
        .delete(`/classes/${completedClass.id}/photos/${photo.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.photo.id).toBe(photo.id);

      // Verify photo is deleted
      const photosResponse = await request(app.getHttpServer())
        .get(`/classes/${completedClass.id}/photos`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(photosResponse.body.photos).toHaveLength(0);
    });

    it('should allow admin to delete any photo', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(adminUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const photo = makeClassPhoto({
        classId: completedClass.id,
        uploadedBy: studentUser.id, // Photo uploaded by student
      });
      await testDbClient.instance(Tables.ClassPhotos).insert(photo);

      const response = await request(app.getHttpServer())
        .delete(`/classes/${completedClass.id}/photos/${photo.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.OK);

      expect(response.body.photo.id).toBe(photo.id);
    });

    it('should reject deletion by non-owner non-admin', async () => {
      const adminUser = makeUser({ role: UserRole.Admin });
      const studentUser = makeUser({ role: UserRole.Student });
      const otherStudent = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient
        .instance(Tables.Users)
        .insert([adminUser, studentUser, otherStudent]);

      const completedClass = makeClass({
        createdBy: adminUser.id,
        status: ClassStatus.Completed,
      });
      await testDbClient.instance(Tables.Classes).insert(completedClass);

      const photo = makeClassPhoto({
        classId: completedClass.id,
        uploadedBy: otherStudent.id, // Photo uploaded by other student
      });
      await testDbClient.instance(Tables.ClassPhotos).insert(photo);

      const response = await request(app.getHttpServer())
        .delete(`/classes/${completedClass.id}/photos/${photo.id}`)
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe(
        'You do not have permission to delete this photo',
      );
    });

    it('should return 400 for non-existent photo', async () => {
      const studentUser = makeUser({ role: UserRole.Student });
      await setupApp(studentUser);
      await testDbClient.instance(Tables.Users).insert(studentUser);

      const response = await request(app.getHttpServer())
        .delete(
          '/classes/00000000-0000-0000-0000-000000000000/photos/00000000-0000-0000-0000-000000000001',
        )
        .set('Authorization', 'Bearer FAKE_TOKEN')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toBe('Photo not found');
    });
  });
});
