import type { Database } from "@webstudio-is/postrest/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { GitHubProfile } from "remix-auth-github";
import type { GoogleProfile } from "remix-auth-google";

export type User = Database["public"]["Tables"]["User"]["Row"];

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

  return dbUser.data;
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

  if (dbUser.error == null) {
    return dbUser.data;
  }

  // https://github.com/PostgREST/postgrest/blob/bfbd033c6e9f38cfbc8b1cfe19ee009a9379e3dd/docs/references/errors.rst#L234
  if (dbUser.error.code !== "PGRST116") {
    console.error(dbUser.error);
    throw new Error("User not found");
  }

  const newUser = await context.postgrest.client
    .from("User")
    .insert({
      id: crypto.randomUUID(),
      ...userData,
    })
    .select()
    .single();

  if (newUser.error) {
    console.error(newUser.error);
    throw new Error("Failed to create user");
  }

  return newUser.data;
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
