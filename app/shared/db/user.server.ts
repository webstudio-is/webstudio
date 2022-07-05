import { User } from "@prisma/client";
import { GitHubProfile } from "remix-auth-github";
import { GoogleProfile } from "remix-auth-google";
import { prisma } from "./prisma.server";

export const createDemoUser = async (userId: string) => {
  await prisma.team.create({
    data: {
      users: {
        create: {
          id: userId,
        },
      },
    },
  });
};

export const ensureUser = async ({ userId }: { userId: string }) => {
  // Always check if the account userId exists because account could have been deleted
  // or we could be in a demo mode with a generated user
  const isUserCreated = Boolean(
    await prisma.user.findUnique({
      where: { id: userId },
    })
  );
  if (isUserCreated) {
    return userId;
  }
  await createDemoUser(userId);

  return userId;
};

const genericCreateAccount = async (userData: {
  email: string;
  username: string;
  image: string;
  provider: string;
}): Promise<User> => {
  const existingUserWithEmail = await prisma.user.findUnique({
    where: {
      email: userData.email,
    },
  });
  console.log(existingUserWithEmail);

  if (existingUserWithEmail) {
    if (existingUserWithEmail.teamId) {
      return existingUserWithEmail;
    }
    await prisma.team.create({
      data: {
        users: {
          connect: {
            id: existingUserWithEmail.id,
          },
        },
      },
    });

    return existingUserWithEmail;
  }

  const newTeam = await prisma.team.create({
    data: {
      users: {
        create: userData,
      },
    },
    include: {
      users: true,
    },
  });

  return newTeam.users[0];
};

export const createOrLoginWithGithub = async (
  profile: GitHubProfile
): Promise<User> => {
  const userData = {
    email: profile._json.email,
    username: profile.displayName,
    image: profile._json.avatar_url,
    provider: profile.provider,
  };
  const newUser = await genericCreateAccount(userData);
  return newUser;
};

export const createOrLoginWithGoogle = async (
  profile: GoogleProfile
): Promise<User> => {
  const userData = {
    email: profile._json.email,
    username: profile.displayName,
    image: profile._json.picture,
    provider: profile.provider,
  };
  const newUser = await genericCreateAccount(userData);
  return newUser;
};

export const createOrLoginWithDev = async (): Promise<User> => {
  const userData = {
    email: "hello@webstudio.is",
    username: "admin",
    image: "",
    provider: "dev",
  };

  const newUser = await genericCreateAccount(userData);
  return newUser;
};
