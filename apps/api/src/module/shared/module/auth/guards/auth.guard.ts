import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

import { SUPABASE_AUTH_GUARD } from '../utils/constants';

@Injectable()
export class AuthGuard extends PassportAuthGuard(SUPABASE_AUTH_GUARD) {}
