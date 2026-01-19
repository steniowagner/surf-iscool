import { UserModel } from '@src/module/identity/core/model/user.model';

export class ListUsersResponseDto {
  users!: UserModel[];
}
