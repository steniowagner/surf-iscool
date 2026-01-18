import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthSession, SignInWithEmailParams } from "../../types";
import { buildSession } from "../../utils";

export const signInWithEmail = async (
  params: SignInWithEmailParams,
  supabase: SupabaseClient
): Promise<AuthSession> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw error;
  }

  const session = buildSession(data.session, data.user);
  if (!session) {
    throw new Error("No session after sign-in");
  }

  return session;
};
