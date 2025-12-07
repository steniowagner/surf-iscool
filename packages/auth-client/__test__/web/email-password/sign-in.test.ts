import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Auth } from "firebase/auth";
import { signInWithEmail } from "../../../src/web/email-password/sign-in";

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock("../../../src/utils", () => ({
  buildSession: vi.fn(),
}));

import { signInWithEmailAndPassword } from "firebase/auth";
import { buildSession } from "../../../src/utils";
import { makeSession } from "../factory/entities";
import { makeSignInWithEmailParams } from "../factory/web.params";

const auth = {} as Auth;

describe("WEB/EMAIL-PASSWORD/signInWithEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should returns session when user exists", async () => {
    const params = makeSignInWithEmailParams();
    const session = makeSession();

    (signInWithEmailAndPassword as any).mockResolvedValue();
    (buildSession as any).mockResolvedValue(session);

    const result = await signInWithEmail(params, auth);

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      params.email,
      params.password
    );
    expect(buildSession).toHaveBeenCalledWith(auth);
    expect(result).toEqual(session);
  });

  it('should propagate errors from "signInWithEmailAndPassword"', async () => {
    const params = makeSignInWithEmailParams();
    (signInWithEmailAndPassword as any).mockRejectedValue();

    expect(() => signInWithEmail(params, auth)).rejects.toThrow();
  });

  it("should throw if buildSession returns null", async () => {
    const params = makeSignInWithEmailParams();
    (signInWithEmailAndPassword as any).mockResolvedValue();
    (buildSession as any).mockResolvedValue(null);

    expect(signInWithEmail(params, auth)).rejects.toThrow();
  });
});
