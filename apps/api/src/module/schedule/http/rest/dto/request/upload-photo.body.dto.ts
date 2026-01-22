import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class UploadPhotoBodyDto {
  @IsString()
  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
