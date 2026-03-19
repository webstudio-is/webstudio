import type { Database } from "@webstudio-is/postgrest/index.server";
import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import type { GitHubProfile } from "remix-auth-github";
import type { GoogleProfile } from "remix-auth-google";
import { z } from "zod";

export type User = Omit<
  Database["public"]["Tables"]["User"]["Row"],
  "projectsTags"
> & {
  projectsTags: Array<ProjectTag>;
};

const formatUser = (user: Database["public"]["Tables"]["User"]["Row"]) => {
  return {
    ...user,
    projectsTags: (user.projectsTags || []) as User["projectsTags"],
  };
};

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

  return formatUser(dbUser.data);
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
    // Ensure the user has a default workspace — it may be missing if
    // the original workspace insert failed after user creation.
    const existingWorkspace = await context.postgrest.client
      .from("Workspace")
      .select("id")
      .eq("userId", dbUser.data.id)
      .eq("isDefault", true)
      .maybeSingle();

    if (existingWorkspace.data === null) {
      const ws = await context.postgrest.client
        .from("Workspace")
        .insert({
          name: "My workspace",
          isDefault: true,
          userId: dbUser.data.id,
        })
        .select("id")
        .single();

      if (ws.error) {
        console.error("Failed to lazily create default workspace", ws.error);
      }
    }

    return formatUser(dbUser.data);
  }

  // https://github.com/PostgREST/postgrest/blob/bfbd033c6e9f38cfbc8b1cfe19ee009a9379e3dd/docs/references/errors.rst#L234
  if (dbUser.error.code !== "PGRST116") {
    console.error(dbUser.error);
    throw new Error("User not found");
  }

  const userId = crypto.randomUUID();

  const newUser = await context.postgrest.client
    .from("User")
    .insert({
      id: userId,
      ...userData,
    })
    .select()
    .single();

  if (newUser.error) {
    console.error(newUser.error);
    throw new Error("Failed to create user");
  }

  // Every user gets a default workspace that cannot be deleted.
  const workspace = await context.postgrest.client
    .from("Workspace")
    .insert({
      name: "My workspace",
      isDefault: true,
      userId,
    })
    .select("id")
    .single();

  if (workspace.error) {
    console.error(workspace.error);
    throw new Error("Failed to create default workspace");
  }

  return formatUser(newUser.data);
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

export const userProjectTagSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(100),
});

export type ProjectTag = z.infer<typeof userProjectTagSchema>;

export const updateUserProjectsTags = async (
  { tags }: { tags: ProjectTag[] },
  context: AppContext
) => {
  if (context.authorization.type !== "user") {
    throw new AuthorizationError(
      "Only logged in users can update project tags"
    );
  }
  const result = await context.postgrest.client
    .from("User")
    .update({ projectsTags: tags })
    .eq("id", context.authorization.userId)
    .select()
    .single();

  if (result.error) {
    throw result.error;
  }
  return result.data.projectsTags as ProjectTag[];
};
