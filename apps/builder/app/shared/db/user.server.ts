import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { GitHubProfile } from "remix-auth-github";
import type { GoogleProfile } from "remix-auth-google";
import { z } from "zod";

const User = z.object({
  id: z.string(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  username: z.string().nullable(),
  createdAt: z.string(),
  teamId: z.string().nullable(),
});

export type User = z.infer<typeof User>;

export const getUserById = async (context: AppContext, id: User["id"]) => {
  const dbUser = await context.postgrest.client
    .from("User")
    .select()
    .eq("id", id)
    .single();

  if (dbUser.error) {
    console.error(dbUser.error);
    throw new Error("User not found");
  }

  return User.parse(dbUser.data);
};

const genericCreateAccount = async (
  context: AppContext,
  userData: {
    email: string;
    username: string;
    image: string;
    provider: string;
  }
): Promise<User> => {
  const dbUser = await context.postgrest.client
    .from("User")
    .select()
    .eq("email", userData.email)
    .single();

  if (dbUser.error) {
    console.error(dbUser.error);
    throw new Error("User not found");
  }

  if (dbUser) {
    const user = User.parse(dbUser.data);
    return user;
  }

  const newUser = await context.postgrest.client
    .from("User")
    .insert({
      id: crypto.randomUUID(),
      ...userData,
    })
    .select();

  if (newUser.error) {
    console.error(newUser.error);
    throw new Error("Failed to create user");
  }

  return User.parse(newUser.data);
};

export const createOrLoginWithOAuth = async (
  context: AppContext,
  profile: GoogleProfile | GitHubProfile
): Promise<User> => {
  const userData = {
    email: (profile.emails ?? [])[0]?.value,
    username: profile.displayName,
    image: (profile.photos ?? [])[0]?.value,
    provider: profile.provider,
  };
  const newUser = await genericCreateAccount(context, userData);
  return newUser;
};

export const createOrLoginWithDev = async (
  context: AppContext,
  email: string
): Promise<User> => {
  const userData = {
    email,
    username: "admin",
    image: "",
    provider: "dev",
  };

  const newUser = await genericCreateAccount(context, userData);
  return newUser;
};
