import { User } from "@prisma/client";
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { GitHubStrategy } from "remix-auth-github";
import { GoogleStrategy } from "remix-auth-google";
import config from "~/config";
import { sessionStorage } from "~/services/session.server";
import {
  createOrLoginWithDev,
  createOrLoginWithGithub,
  createOrLoginWithGoogle,
} from "~/shared/db/user.server";
import { sentryException } from "~/shared/sentry";
import { AUTH_PROVIDERS } from "~/shared/session";

const url = `${
  process.env.DEPLOYMENT_ENVIRONMENT === "production"
    ? process.env.DEPLOYMENT_URL
    : `http://localhost:${process.env.PORT || 3000}`
}${config.authPath}`;

const github = new GitHubStrategy(
  {
    clientID: process.env.GH_CLIENT_ID as string,
    clientSecret: process.env.GH_CLIENT_SECRET as string,
    callbackURL: `${url}${config.githubCallbackPath}`,
  },
  async ({ profile, context }) => {
    const user = await createOrLoginWithGithub(profile, context?.userId);

    return user;
  }
);

const google = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: `${url}${config.googleCallbackPath}`,
  },
  async ({ profile, context }) => {
    const user = await createOrLoginWithGoogle(profile, context?.userId);

    return user;
  }
);

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<User>(sessionStorage);
if (process.env.GH_CLIENT_ID && process.env.GH_CLIENT_SECRET) {
  authenticator.use(github, "github");
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  authenticator.use(google, "google");
}
if (process.env.DEV_LOGIN === "true") {
  authenticator.use(
    new FormStrategy(async ({ form }) => {
      const secret = form.get("secret");

      if (secret === process.env.AUTH_SECRET) {
        try {
          const user = await createOrLoginWithDev(secret);
          return user;
        } catch (error: unknown) {
          if (error instanceof Error) {
            sentryException({
              message: error.message,
              extra: {
                loginMethod: AUTH_PROVIDERS.LOGIN_DEV,
              },
            });
          }
        }
      }

      throw new Error("The dev login code is incorrect");
    }),
    "dev"
  );
}
