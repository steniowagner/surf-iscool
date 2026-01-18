import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { signInWithEmail } from "../../../src/web/email-password/sign-in";
import { makeSupabaseUser, makeSupabaseSession } from "../factory/entities";
import { makeSignInWithEmailParams } from "../factory/web.params";

describe("WEB/EMAIL-PASSWORD/signInWithEmail", () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    supabase = {
      auth: {
        signInWithPassword: vi.fn(),
      },
    } as unknown as SupabaseClient;
  });

  it("should return session when user exists", async () => {
    const params = makeSignInWithEmailParams();
    const user = makeSupabaseUser();
    const session = makeSupabaseSession();

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user, session },
      error: null,
    });

    const result = await signInWithEmail(params, supabase);

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: params.email,
      password: params.password,
    });
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe(user.email);
    expect(result.accessToken).toBe(session.access_token);
    expect(result.refreshToken).toBe(session.refresh_token);
  });

  it("should throw error from supabase", async () => {
    const params = makeSignInWithEmailParams();
    const error = new Error("Invalid credentials");

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: error as any,
    });

    await expect(signInWithEmail(params, supabase)).rejects.toBe(error);
  });

  it("should throw if session is null", async () => {
    const params = makeSignInWithEmailParams();
    const user = makeSupabaseUser();

    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user, session: null },
      error: null,
    });

    await expect(signInWithEmail(params, supabase)).rejects.toThrowError(
      "No session after sign-in"
    );
  });
});
