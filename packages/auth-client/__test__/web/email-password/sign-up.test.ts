import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { signUpWithEmail } from "../../../src/web/email-password/sign-up";
import { makeSupabaseUser, makeSupabaseSession } from "../factory/entities";
import { makeSignUpWithEmailParams } from "../factory/web.params";

describe("WEB/EMAIL-PASSWORD/signUpWithEmail", () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    supabase = {
      auth: {
        signUp: vi.fn(),
      },
    } as unknown as SupabaseClient;
  });

  it("should create user and returns session", async () => {
    const params = makeSignUpWithEmailParams();
    const user = makeSupabaseUser();
    const session = makeSupabaseSession();

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user, session },
      error: null,
    });

    const result = await signUpWithEmail(params, supabase);

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: params.email,
      password: params.password,
    });
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe(user.email);
    expect(result.accessToken).toBe(session.access_token);
    expect(result.refreshToken).toBe(session.refresh_token);
  });

  it("should throw if session is null", async () => {
    const params = makeSignUpWithEmailParams();
    const user = makeSupabaseUser();

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user, session: null },
      error: null,
    });

    await expect(signUpWithEmail(params, supabase)).rejects.toThrowError(
      "No session after sign-up with email"
    );
  });

  it("should throw error from supabase", async () => {
    const params = makeSignUpWithEmailParams();
    const error = new Error("SOME_ERROR");

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: error as any,
    });

    await expect(signUpWithEmail(params, supabase)).rejects.toBe(error);
  });
});
