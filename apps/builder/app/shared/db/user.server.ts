import type { GitHubProfile } from "remix-auth-github";
import type { GoogleProfile } from "remix-auth-google";
import { prisma } from "@webstudio-is/prisma-client";
import { z } from "zod";

const User = z.object({
  id: z.string(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  username: z.string().nullable(),
  createdAt: z.date().transform((date) => date.toISOString()),
  teamId: z.string().nullable(),
});

export type User = z.infer<typeof User>;

export const getUserById = async (id: User["id"]) => {
  const dbUser = await prisma.user.findUnique({
    where: { id },
  });
  return User.parse(dbUser);
};

const genericCreateAccount = async (userData: {
  email: string;
  username: string;
  image: string;
  provider: string;
}): Promise<User> => {
  const dbUser = await prisma.user.findUnique({
    where: {
      email: userData.email,
    },
  });

  if (dbUser) {
    const user = User.parse(dbUser);

    if (user.teamId) {
      return user;
    }
    await prisma.team.create({
      data: {
        users: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    return user;
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

  return User.parse(newTeam.users[0]);
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
