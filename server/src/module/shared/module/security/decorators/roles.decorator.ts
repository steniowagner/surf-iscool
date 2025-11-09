import { SetMetadata } from '@nestjs/common';

import { UserRole } from '@src/module/identity/core/enum/user.enum';

export const ROLES_KEY = 'ROLES';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
