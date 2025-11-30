import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  type Auth,
} from "firebase/auth";

import { AuthSession, SignUpWithEmailParams } from "../../types";
import { buildSession } from "../../utils";

export const signUpWithEmail = async (
  params: SignUpWithEmailParams & { onConfirmEmailRedirectUrl: string },
  auth: Auth
): Promise<AuthSession> => {
  const { user } = await createUserWithEmailAndPassword(
    auth,
    params.email,
    params.password
  );
  await sendEmailVerification(user, {
    url: params.onConfirmEmailRedirectUrl,
  });
  const session = await buildSession(auth);
  if (!session) throw new Error("No session after sign-up with email");
  return session;
};
