import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { signUpWithEmail, signInWithEmail } from "./email-password";
import {
  AuthClient,
  SignUpWithEmailParams,
  SignInWithEmailParams,
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
  };
};
