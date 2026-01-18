import { createClient } from '@supabase/supabase-js';
import { Injectable } from '@nestjs/common';

import { ConfigService } from '@shared-modules/config/service/config.service';

@Injectable()
export class SupabaseAuthService {
  private readonly client;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get('supabaseUrl');
    const supabaseServiceRoleKey = this.configService.get(
      'supabaseServiceRoleKey',
    );

    this.client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  get supabase() {
    return this.client;
  }
}
