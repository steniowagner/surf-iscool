import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { signUpWithEmail, signInWithEmail } from "./email-password";
import { signInWithOAuth } from "./oauth/sign-in";
import { getSession } from "./session/get-session";
import {
  AuthClient,
  SignUpWithEmailParams,
  SignInWithEmailParams,
  SignInWithOAuthParams,
} from "../types";

export type WebAuthConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const createWebAuthClient = (config: WebAuthConfig): AuthClient => {
  const supabase: SupabaseClient = createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );

  return {
    signInWithEmail: async (params: SignInWithEmailParams) =>
      signInWithEmail(params, supabase),
    signUpWithEmail: async (params: SignUpWithEmailParams) =>
      signUpWithEmail(params, supabase),
    signInWithOAuth: async (params: SignInWithOAuthParams) =>
      signInWithOAuth(params, supabase),
    getSession: async () => getSession(supabase),
  };
};
