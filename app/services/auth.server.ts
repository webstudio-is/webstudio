import { User } from "@prisma/client";
import { Authenticator } from "remix-auth";
import { GitHubStrategy } from "remix-auth-github";
import { GoogleStrategy } from "remix-auth-google";
import { sessionStorage } from "~/services/session.server";
import {
  createOrLoginWithGithub,
  createOrLoginWithGoogle,
} from "~/shared/db/user.server";

const url = `${
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"
}/auth`;

const github = new GitHubStrategy(
  {
    clientID: process.env.GH_CLIENT_ID as string,
    clientSecret: process.env.GH_CLIENT_SECRET as string,
    callbackURL: `${url}/github/callback`,
  },
  async ({ profile, context }) => {
    const user = createOrLoginWithGithub(profile, context?.userId);

    return user;
  }
);

const google = new GoogleStrategy(
  {
    clientID: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    callbackURL: `${url}/google/callback`,
  },
  async ({ profile }) => {
    const user = createOrLoginWithGoogle(profile);

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
