import { Authenticator } from "remix-auth";
import { FormStrategy } from "remix-auth-form";
import { GitHubStrategy, type GitHubProfile } from "remix-auth-github";
import { GoogleStrategy, type GoogleProfile } from "remix-auth-google";
import * as db from "~/shared/db";
import { sessionStorage } from "~/services/session.server";
import { sentryException } from "~/shared/sentry";
import { AUTH_PROVIDERS } from "~/shared/session";
import { authCallbackPath } from "~/shared/router-utils";
import { getUserById, User } from "~/shared/db/user.server";
import env from "~/env/env.server";

const url =
  env.DEPLOYMENT_ENVIRONMENT === "production"
    ? env.DEPLOYMENT_URL
    : `http://localhost:${env.PORT || 3000}`;

const strategyCallback = async ({
  profile,
}: {
  profile: GitHubProfile | GoogleProfile;
}) => {
  try {
    const user = await db.user.createOrLoginWithOAuth(profile);
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
    throw error;
  }
};

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<User>(sessionStorage, {
  throwOnError: true,
});

if (env.GH_CLIENT_ID && env.GH_CLIENT_SECRET) {
  const github = new GitHubStrategy(
    {
      clientID: env.GH_CLIENT_ID,
      clientSecret: env.GH_CLIENT_SECRET,
      callbackURL: `${url}${authCallbackPath({ provider: "github" })}`,
    },
    strategyCallback
  );
  authenticator.use(github, "github");
}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  const google = new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${url}${authCallbackPath({ provider: "google" })}`,
    },
    strategyCallback
  );
  authenticator.use(google, "google");
}

if (env.DEV_LOGIN === "true") {
  authenticator.use(
    new FormStrategy(async ({ form }) => {
      const secret = form.get("secret");

      if (secret === env.AUTH_SECRET?.slice(0, 4)) {
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
          throw error;
        }
      }

      throw new Error("The dev login code is incorrect");
    }),
    "dev"
  );
}

export const findAuthenticatedUser = async (request: Request) => {
  const user = await authenticator.isAuthenticated(request);
  if (user == null) {
    return null;
  }
  return await getUserById(user.id);
};
