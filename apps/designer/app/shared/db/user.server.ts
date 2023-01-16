import type { GitHubProfile } from "remix-auth-github";
import type { GoogleProfile } from "remix-auth-google";
import { prisma, User } from "@webstudio-is/prisma-client";

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

export const createOrLoginWithOAuth = async (
  profile: GoogleProfile | GitHubProfile
): Promise<User> => {
  const userData = {
    email: (profile.emails ?? [])[0]?.value,
    username: profile.displayName,
    image: (profile.photos ?? [])[0]?.value,
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
