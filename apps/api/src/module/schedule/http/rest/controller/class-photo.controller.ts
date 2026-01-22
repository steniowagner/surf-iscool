import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '@shared-modules/auth/decorators/current-user.decorator';
import { AuthGuard } from '@shared-modules/auth/guards/auth.guard';
import { UserModel } from '@src/module/identity/core/model/user.model';

import { ClassPhotoService } from '../../../core/services/class-photo.service';
import { UploadPhotoBodyDto } from '../dto/request/upload-photo.body.dto';
import { ClassPhotoResponseDto } from '../dto/response/class-photo.response.dto';
import { ListClassPhotosResponseDto } from '../dto/response/list-class-photos.response.dto';

@Controller('classes')
@UseGuards(AuthGuard)
export class ClassPhotoController {
  constructor(private readonly classPhotoService: ClassPhotoService) {}

  @Post(':classId/photos')
  async uploadPhoto(
    @Param('classId') classId: string,
    @CurrentUser() user: UserModel,
    @Body() body: UploadPhotoBodyDto,
  ): Promise<ClassPhotoResponseDto> {
    const photo = await this.classPhotoService.uploadPhoto({
      classId,
      userId: user.id,
      userRole: user.role,
      url: body.url,
      caption: body.caption,
    });
    return { photo };
  }

  @Get(':classId/photos')
  async listPhotos(
    @Param('classId') classId: string,
  ): Promise<ListClassPhotosResponseDto> {
    const photos = await this.classPhotoService.listPhotos(classId);
    return { photos };
  }

  @Delete(':classId/photos/:photoId')
  async deletePhoto(
    @Param('photoId') photoId: string,
    @CurrentUser() user: UserModel,
  ): Promise<ClassPhotoResponseDto> {
    const photo = await this.classPhotoService.deletePhoto({
      photoId,
      userId: user.id,
      userRole: user.role,
    });
    return { photo };
  }
}
