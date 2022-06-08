import { User } from "@prisma/client";
import { Authenticator } from "remix-auth";
import { GitHubStrategy } from "remix-auth-github";
import { sessionStorage } from "~/services/session.server";
import { createOrLoginWithGithub } from "~/shared/db/user.server";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<User>(sessionStorage);
if (process.env.GH_CLIENT_ID && process.env.GH_CLIENT_SECRET) {
  authenticator.use(
    new GitHubStrategy(
      {
        clientID: process.env.GH_CLIENT_ID as string,
        clientSecret: process.env.GH_CLIENT_SECRET as string,
        callbackURL: `https://${
          process.env.VERCEL_URL || "192.168.1.91:3000"
        }/auth/github/callback`,
      },
      async ({ profile }) => {
        const user = createOrLoginWithGithub(profile);

        return user;
      }
    ),
    "github"
  );
}
