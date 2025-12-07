import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import { signUpWithEmail, signInWithEmail } from "./email-password";
import {
  AuthClient,
  SignUpWithEmailParams,
  SignInWithEmailParams,
} from "../types";

type URLRedirects = {
  confirmEmail: string;
};

export type WebAuthConfig = {
  urlRedirects: URLRedirects;
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

export const createWebAuthClient = (config: WebAuthConfig): AuthClient => {
  const app = initializeApp(config);
  const auth = getAuth(app);

  return {
    signInWithEmail: async (params: SignInWithEmailParams) =>
      signInWithEmail(params, auth),
    signUpWithEmail: async (params: SignUpWithEmailParams) =>
      signUpWithEmail(
        {
          ...params,
          onConfirmEmailRedirectUrl: config.urlRedirects.confirmEmail,
        },
        auth
      ),
  };
};
