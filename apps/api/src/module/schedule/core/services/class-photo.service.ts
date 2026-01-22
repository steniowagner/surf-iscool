import { Injectable } from '@nestjs/common';

import { ClassStatus, EnrollmentStatus, UserRole } from '@surf-iscool/types';

import { DomainException } from '@shared-core/exeption/domain.exception';
import { ClassRepository } from '@src/module/schedule/persistence/repository/class/class.repository';
import { ClassPhotoRepository } from '@src/module/schedule/persistence/repository/class-photo.repository';
import { ClassEnrollmentRepository } from '@src/module/schedule/persistence/repository/class-enrollment.repository';
import { ClassInstructorRepository } from '@src/module/schedule/persistence/repository/class-instructor.repository';

import { ClassPhotoModel } from '../model/class-photo.model';

type UploadPhotoParams = {
  classId: string;
  userId: string;
  userRole: UserRole;
  url: string;
  caption?: string;
};

type DeletePhotoParams = {
  photoId: string;
  userId: string;
  userRole: UserRole;
};

@Injectable()
export class ClassPhotoService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly classPhotoRepository: ClassPhotoRepository,
    private readonly classEnrollmentRepository: ClassEnrollmentRepository,
    private readonly classInstructorRepository: ClassInstructorRepository,
  ) {}

  async uploadPhoto(params: UploadPhotoParams): Promise<ClassPhotoModel> {
    const existingClass = await this.classRepository.findById(params.classId);

    if (!existingClass) throw new DomainException('Class not found');

    if (existingClass.status !== ClassStatus.Completed)
      throw new DomainException(
        'Photos can only be uploaded to completed classes',
      );

    // Admins can upload to any class
    if (params.userRole !== UserRole.Admin) {
      const hasPermission = await this.userCanUploadPhoto(
        params.classId,
        params.userId,
        params.userRole,
      );

      if (!hasPermission)
        throw new DomainException(
          'You do not have permission to upload photos to this class',
        );
    }

    return await this.classPhotoRepository.create({
      classId: params.classId,
      uploadedBy: params.userId,
      url: params.url,
      caption: params.caption,
    });
  }

  async listPhotos(classId: string): Promise<ClassPhotoModel[]> {
    const existingClass = await this.classRepository.findById(classId);

    if (!existingClass) throw new DomainException('Class not found');

    return await this.classPhotoRepository.findByClassId(classId);
  }

  async deletePhoto(params: DeletePhotoParams): Promise<ClassPhotoModel> {
    const photo = await this.classPhotoRepository.findById(params.photoId);

    if (!photo) throw new DomainException('Photo not found');

    // Only the owner or admin can delete
    if (
      params.userRole !== UserRole.Admin &&
      photo.uploadedBy !== params.userId
    )
      throw new DomainException(
        'You do not have permission to delete this photo',
      );

    const deleted = await this.classPhotoRepository.delete(params.photoId);

    if (!deleted) throw new DomainException('Failed to delete photo');

    return deleted;
  }

  private async userCanUploadPhoto(
    classId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<boolean> {
    if (userRole === UserRole.Student) {
      // Students can upload if they had an approved enrollment
      const enrollment =
        await this.classEnrollmentRepository.findByClassAndStudent(
          classId,
          userId,
        );

      return enrollment?.status === EnrollmentStatus.Approved;
    }

    if (userRole === UserRole.Instructor) {
      // Instructors can upload if they were assigned to the class
      const assignments =
        await this.classInstructorRepository.findByClassId(classId);
      return assignments.some((a) => a.instructorId === userId);
    }

    return false;
  }
}
