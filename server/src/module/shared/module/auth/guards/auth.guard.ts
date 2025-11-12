import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

import { FIREBASE_AUTH_GUARD } from '../utils/constants';

@Injectable()
export class AuthGuard extends PassportAuthGuard(FIREBASE_AUTH_GUARD) {}
