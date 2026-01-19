import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSession } from "../../../src/web/session/get-session";
import { makeSupabaseSession, makeSupabaseUser } from "../factory/entities";

describe("WEB/SESSION/getSession", () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    supabase = {
      auth: {
        getSession: vi.fn(),
      },
    } as unknown as SupabaseClient;
  });

  it("should return session when user is logged in", async () => {
    const user = makeSupabaseUser();
    const session = makeSupabaseSession({ user });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session },
      error: null,
    });

    const result = await getSession(supabase);

    expect(supabase.auth.getSession).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.user.id).toBe(user.id);
    expect(result!.user.email).toBe(user.email);
    expect(result!.accessToken).toBe(session.access_token);
    expect(result!.refreshToken).toBe(session.refresh_token);
  });

  it("should return null when no session exists", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const result = await getSession(supabase);

    expect(result).toBeNull();
  });

  it("should throw error from supabase", async () => {
    const error = new Error("Session error");

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: error as any,
    });

    await expect(getSession(supabase)).rejects.toBe(error);
  });
});
