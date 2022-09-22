import { User } from "@webstudio-is/prisma-client";
import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { GitHubStrategy } from "remix-auth-github";
import { GoogleStrategy } from "remix-auth-google";
import config from "~/config";
import * as db from "~/shared/db";
import { sessionStorage } from "~/services/session.server";
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
  async ({ profile }) => {
    const user = await db.user.createOrLoginWithGithub(profile);

    return user;
  }
);

const google = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: `${url}${config.googleCallbackPath}`,
  },
  async ({ profile }) => {
    const user = await db.user.createOrLoginWithGoogle(profile);

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

      if (secret === process.env.AUTH_SECRET?.slice(0, 4)) {
        try {
          const user = await db.user.createOrLoginWithDev();
          return user;
        } catch (error: unknown) {
          if (error instanceof Error) {
            sentryException({
              error,
              extras: {
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
