export type AuthProvider = "password";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  profilePicture: string | null;
  isEmailVerified: boolean;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
};

export type SignUpWithEmailParams = {
  email: string;
  password: string;
};

export type SignInWithEmailParams = {
  email: string;
  password: string;
};

export interface AuthClient {
  signUpWithEmail(params: SignUpWithEmailParams): Promise<AuthSession>;
  signInWithEmail(params: SignInWithEmailParams): Promise<AuthSession>;
}
