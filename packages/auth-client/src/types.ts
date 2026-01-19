export type AuthProvider = "password" | "google" | "facebook" | "apple";

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

export type OAuthProvider = "google" | "facebook" | "apple";

export type SignInWithOAuthParams = {
  provider: OAuthProvider;
  redirectTo?: string;
};

export type SignInWithOAuthResult = {
  url: string;
  provider: OAuthProvider;
};

export interface AuthClient {
  signUpWithEmail(params: SignUpWithEmailParams): Promise<AuthSession>;
  signInWithEmail(params: SignInWithEmailParams): Promise<AuthSession>;
  signInWithOAuth(params: SignInWithOAuthParams): Promise<SignInWithOAuthResult>;
  getSession(): Promise<AuthSession | null>;
}
