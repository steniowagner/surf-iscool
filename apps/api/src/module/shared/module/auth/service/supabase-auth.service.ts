import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Injectable } from '@nestjs/common';

import { ConfigService } from '@shared-modules/config/service/config.service';

type SupabaseClientType = SupabaseClient<never, 'public', never>;

@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClientType;

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
    }) as SupabaseClientType;
  }

  get supabase(): SupabaseClientType {
    return this.client;
  }
}
