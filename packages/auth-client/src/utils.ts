import type { User, Session } from "@supabase/supabase-js";

import { AuthSession, AuthUser } from "./types";

export const mapUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email ?? null,
  name: user.user_metadata?.full_name ?? null,
  profilePicture: user.user_metadata?.avatar_url ?? null,
  isEmailVerified: !!user.email_confirmed_at,
});

export const buildSession = (
  session: Session | null,
  user: User | null
): AuthSession | null => {
  if (!session || !user) return null;

  return {
    user: mapUser(user),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  };
};
