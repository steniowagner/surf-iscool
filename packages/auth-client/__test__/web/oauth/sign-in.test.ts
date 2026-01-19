import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { signInWithOAuth } from "../../../src/web/oauth/sign-in";
import { makeSignInWithOAuthParams } from "../factory/web.params";

describe("WEB/OAuth/signInWithOAuth", () => {
  let supabase: SupabaseClient;

  beforeEach(() => {
    supabase = {
      auth: {
        signInWithOAuth: vi.fn(),
      },
    } as unknown as SupabaseClient;
  });

  it("should return OAuth URL for Google provider", async () => {
    const params = makeSignInWithOAuthParams({ provider: "google" });
    const expectedUrl =
      "https://supabase.com/auth/v1/authorize?provider=google";

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: expectedUrl, provider: "google" },
      error: null,
    });

    const result = await signInWithOAuth(params, supabase);

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: params.redirectTo,
        skipBrowserRedirect: true,
      },
    });
    expect(result.url).toBe(expectedUrl);
    expect(result.provider).toBe("google");
  });

  it("should return OAuth URL for Facebook provider", async () => {
    const params = makeSignInWithOAuthParams({ provider: "facebook" });
    const expectedUrl =
      "https://supabase.com/auth/v1/authorize?provider=facebook";

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: expectedUrl, provider: "facebook" },
      error: null,
    });

    const result = await signInWithOAuth(params, supabase);

    expect(result.url).toBe(expectedUrl);
    expect(result.provider).toBe("facebook");
  });

  it("should return OAuth URL for Apple provider", async () => {
    const params = makeSignInWithOAuthParams({ provider: "apple" });
    const expectedUrl = "https://supabase.com/auth/v1/authorize?provider=apple";

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: expectedUrl, provider: "apple" },
      error: null,
    });

    const result = await signInWithOAuth(params, supabase);

    expect(result.url).toBe(expectedUrl);
    expect(result.provider).toBe("apple");
  });

  it("should throw error from supabase", async () => {
    const params = makeSignInWithOAuthParams();
    const error = new Error("OAuth error");

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: null, provider: params.provider },
      error: error as any,
    });

    await expect(signInWithOAuth(params, supabase)).rejects.toBe(error);
  });

  it("should throw if URL is null", async () => {
    const params = makeSignInWithOAuthParams();

    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      data: { url: null, provider: params.provider },
      error: null,
    });

    await expect(signInWithOAuth(params, supabase)).rejects.toThrowError(
      "No OAuth URL returned",
    );
  });
});
