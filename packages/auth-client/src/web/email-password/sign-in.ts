import { signInWithEmailAndPassword, type Auth } from "firebase/auth";

import { AuthSession, SignUpWithEmailParams } from "../../types";
import { buildSession } from "../../utils";

export const signInWithEmail = async (
  params: SignUpWithEmailParams,
  auth: Auth
): Promise<AuthSession> => {
  await signInWithEmailAndPassword(auth, params.email, params.password);
  const session = await buildSession(auth);
  if (!session) throw new Error("No session after sign-in");
  return session;
};
