import { User, type Auth } from "firebase/auth";

import { AuthSession, AuthUser } from "./types";

export const mapUser = (user: User): AuthUser => ({
  id: user.uid,
  email: user.email,
  name: user.displayName,
  profilePicture: user.photoURL,
  isEmailVerified: user.emailVerified,
});

export const buildSession = async (auth: Auth): Promise<AuthSession | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  const idToken = await user.getIdToken();
  const refreshToken = user.refreshToken;
  return {
    user: mapUser(user),
    refreshToken,
    idToken,
  };
};
