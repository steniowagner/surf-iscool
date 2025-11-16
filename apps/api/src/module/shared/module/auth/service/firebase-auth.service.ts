import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { Injectable } from '@nestjs/common';

import { ConfigService } from '@shared-modules/config/service/config.service';

@Injectable()
export class FirebaseAuthService {
  private readonly authClient: Auth;
  private readonly app: App;

  constructor(private readonly configService: ConfigService) {
    const projectId = this.configService.get('firebaseProjectId');
    const clientEmail = this.configService.get('firebaseClientEmail');
    const privateKey = this.configService.get('firebasePrivateKey');

    if (!getApps().length) {
      this.app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      this.app = getApps()[0]!;
    }

    this.authClient = getAuth(this.app);
  }

  auth(): Auth {
    return this.authClient;
  }
}
