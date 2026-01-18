import type { SupabaseClient } from "@supabase/supabase-js";

import { AuthSession, SignUpWithEmailParams } from "../../types";
import { buildSession } from "../../utils";

export const signUpWithEmail = async (
  params: SignUpWithEmailParams,
  supabase: SupabaseClient
): Promise<AuthSession> => {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw error;
  }

  const session = buildSession(data.session, data.user);
  if (!session) {
    throw new Error("No session after sign-up with email");
  }

  return session;
};
