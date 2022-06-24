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

const url = `${
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
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
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
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
  authenticator.use(google, "google");
}

if (process.env.DEV_LOGIN === "true") {
  authenticator.use(
    new FormStrategy(async ({ form }) => {
      const secret = form.get("secret");

      if (secret === process.env.AUTH_SECRET) {
        console.log(secret, process.env.AUTH_SECRET);
        try {
          const user = await createOrLoginWithDev(secret);
          return user;
        } catch (e) {
          console.log(e);
        }
      }

      throw new Error("Wrong code");
    }),
    "dev"
  );
}
