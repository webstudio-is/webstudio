import { User } from "@prisma/client";
import { GitHubProfile } from "remix-auth-github";
import { GoogleProfile } from "remix-auth-google";
import { prisma } from "./prisma.server";

const genericCreateAccount = async (
  userData: {
    email: string;
    username: string;
    image: string;
    provider: string;
  },
  userId: string
): Promise<User> => {
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (userExists) {
    const connectedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...userData,
      },
    });

    return connectedUser;
  }

  const newUser = await prisma.user.create({
    data: {
      id: userId,
      ...userData,
    },
  });

  return newUser;
};

export const createOrLoginWithGithub = async (
  profile: GitHubProfile,
  userId: string
): Promise<User> => {
  const userData = {
    email: profile._json.email,
    username: profile.displayName,
    image: profile._json.avatar_url,
    provider: profile.provider,
  };
  const newUser = await genericCreateAccount(userData, userId);
  return newUser;
};

export const createOrLoginWithGoogle = async (
  profile: GoogleProfile,
  userId: string
): Promise<User> => {
  const userData = {
    email: profile._json.email,
    username: profile.displayName,
    image: profile._json.picture,
    provider: profile.provider,
  };
  const newUser = await genericCreateAccount(userData, userId);
  return newUser;
};
