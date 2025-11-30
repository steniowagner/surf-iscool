import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import { AuthClient, SignUpWithEmailParams } from "../types";
import { signUpWithEmail } from "./email-password";

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
