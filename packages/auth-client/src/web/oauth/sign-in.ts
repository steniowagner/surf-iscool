import type { SupabaseClient } from "@supabase/supabase-js";

import type { SignInWithOAuthParams, SignInWithOAuthResult } from "../../types";

export const signInWithOAuth = async (
  params: SignInWithOAuthParams,
  supabase: SupabaseClient,
): Promise<SignInWithOAuthResult> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: params.provider,
    options: {
      redirectTo: params.redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;

  if (!data.url) throw new Error("No OAuth URL returned");

  return {
    provider: params.provider,
    url: data.url,
  };
};
