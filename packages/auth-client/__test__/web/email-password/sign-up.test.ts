import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Auth } from "firebase/auth";
import { signUpWithEmail } from "../../../src/web/email-password/sign-up";

vi.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
}));

vi.mock("../../../src/utils", () => ({
  buildSession: vi.fn(),
}));

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { buildSession } from "../../../src/utils";
import { makeUser, makeSession } from "../factory/entities";
import { makeSignUpWithEmailParams } from "../factory/web.params";

const auth = {} as Auth;

describe("WEB/EMAIL-PASSWORD/signUpWithEmail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should create user, sends verification email, and returns session", async () => {
    const params = makeSignUpWithEmailParams();
    const user = makeUser();
    const session = makeSession();

    (createUserWithEmailAndPassword as any).mockResolvedValue({
      user,
    });
    (sendEmailVerification as any).mockResolvedValue(undefined);
    (buildSession as any).mockResolvedValue(session);

    const result = await signUpWithEmail(params, auth);

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      params.email,
      params.password
    );
    expect(sendEmailVerification).toHaveBeenCalledWith(user, {
      url: params.onConfirmEmailRedirectUrl,
    });
    expect(buildSession).toHaveBeenCalledWith(auth);
    expect(result).toEqual(session);
  });

  it("should throw if buildSession returns null", async () => {
    const params = makeSignUpWithEmailParams();
    const user = makeUser();
    (createUserWithEmailAndPassword as any).mockResolvedValue({ user });
    (sendEmailVerification as any).mockResolvedValue(undefined);
    (buildSession as any).mockResolvedValue(null);

    await expect(signUpWithEmail(params, auth)).rejects.toThrowError(
      "No session after sign-up with email"
    );
  });

  it("should propagate errors from createUserWithEmailAndPassword", async () => {
    const error = new Error("SOME_ERROR");
    (createUserWithEmailAndPassword as any).mockRejectedValue(error);
    const params = makeSignUpWithEmailParams();

    await expect(signUpWithEmail(params, auth)).rejects.toBe(error);
  });
});
