import type { SupabaseClient } from "@supabase/supabase-js";

import type { AuthSession } from "../../types";
import { buildSession } from "../../utils";

export const getSession = async (
  supabase: SupabaseClient,
): Promise<AuthSession | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  if (!session) return null;

  return buildSession(session, session.user);
};
