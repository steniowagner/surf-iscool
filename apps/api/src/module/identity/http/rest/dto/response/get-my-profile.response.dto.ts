import { Expose, Type } from 'class-transformer';
import {
  ValidateNested,
  IsDefined,
  IsNotEmptyObject,
  IsObject,
} from 'class-validator';

import { UserModel } from '@src/module/identity/core/model/user.model';

export class GetMyProfileResponseDto {
  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  @ValidateNested()
  @Type(() => UserModel)
  @Expose()
  profile!: UserModel;
}
