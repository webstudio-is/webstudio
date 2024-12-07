import type { Database } from "@webstudio-is/postrest/index.server";
import {
  type AppContext,
  authorizeProject,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";

type AuthorizationToken =
  Database["public"]["Tables"]["AuthorizationToken"]["Row"];

const applyTokenPermissions = (
  token: AuthorizationToken
): AuthorizationToken => {
  let result = token;

  // @todo: fix this on SQL level
  if (token.relation !== "viewers") {
    result = {
      ...result,
      canClone: true,
      canCopy: true,
    };
  }

  // @todo: fix this on SQL level
  if (token.relation === "viewers") {
    result = {
      ...result,
      canPublish: false,
    };
  }

  // @todo: fix this on SQL level
  if (token.relation === "builders") {
    result = {
      ...result,
      canPublish: false,
    };
  }

  // @todo: fix this on SQL level
  if (token.relation === "administrators") {
    result = {
      ...result,
      canPublish: true,
    };
  }

  return result;
};

export const findMany = async (
  props: { projectId: string },
  context: AppContext
) => {
  // Only owner of the project can list authorization tokens
  const canList = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "own" },
    context
  );

  if (canList === false) {
    throw new AuthorizationError(
      "You don't have access to list this project authorization tokens"
    );
  }

  const dbTokens = await context.postgrest.client
    .from("AuthorizationToken")
    .select()
    .eq("projectId", props.projectId)
    // Stable order
    .order("createdAt", { ascending: true })
    .order("token", { ascending: true });
  if (dbTokens.error) {
    throw dbTokens.error;
  }

  return dbTokens.data.map(applyTokenPermissions);
};

export const tokenDefaultPermissions = {
  canClone: true,
  canCopy: true,
  canPublish: true,
};

export type TokenPermissions = typeof tokenDefaultPermissions;

export const getTokenInfo = async (
  token: AuthorizationToken["token"],
  context: AppContext
) => {
  const dbToken = await context.postgrest.client
    .from("AuthorizationToken")
    .select()
    .eq("token", token)
    .maybeSingle();

  if (dbToken.error) {
    throw dbToken.error;
  }

  if (dbToken.data === null) {
    throw new AuthorizationError("Authorization token not found");
  }

  return applyTokenPermissions(dbToken.data);
};

export const getTokenPermissions = async (
  props: { projectId: string; token: AuthorizationToken["token"] },
  context: AppContext
): Promise<TokenPermissions> => {
  const dbToken = await getTokenInfo(props.token, context);

  return {
    canClone: dbToken.canClone,
    canCopy: dbToken.canCopy,
    canPublish: dbToken.canPublish,
  };
};

export const create = async (
  props: {
    projectId: string;
    relation: AuthorizationToken["relation"];
    name: string;
  },
  context: AppContext
) => {
  const tokenId = crypto.randomUUID();

  // Only owner of the project can create authorization tokens
  const canCreateToken = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "own" },
    context
  );

  if (canCreateToken === false) {
    throw new AuthorizationError(
      "You don't have access to create this project authorization tokens"
    );
  }

  const dbToken = await context.postgrest.client
    .from("AuthorizationToken")
    .insert({
      projectId: props.projectId,
      relation: props.relation,
      token: tokenId,
      name: props.name,
    })
    .select();
  if (dbToken.error) {
    throw dbToken.error;
  }

  return dbToken.data;
};

export const update = async (
  projectId: string,
  props: Pick<AuthorizationToken, "token" | "relation"> &
    Partial<AuthorizationToken>,
  context: AppContext
) => {
  // Only owner of the project can edit authorization tokens
  const canCreateToken = await authorizeProject.hasProjectPermit(
    { projectId, permit: "own" },
    context
  );

  if (canCreateToken === false) {
    throw new AuthorizationError(
      "You don't have access to edit this project authorization tokens"
    );
  }

  const previousToken = await context.postgrest.client
    .from("AuthorizationToken")
    .select()
    .eq("projectId", projectId)
    .eq("token", props.token)
    .maybeSingle();
  if (previousToken.error) {
    throw previousToken.error;
  }
  if (previousToken.data === null) {
    throw new AuthorizationError("Authorization token not found");
  }

  const dbToken = await context.postgrest.client
    .from("AuthorizationToken")
    .update({
      name: props.name,
      relation: props.relation,
      canClone: props.canClone,
      canCopy: props.canCopy,
      canPublish: props.canPublish,
    })
    .eq("projectId", projectId)
    .eq("token", props.token)
    .select()
    .single();
  if (dbToken.error) {
    throw dbToken.error;
  }

  return dbToken.data;
};

export const remove = async (
  props: {
    projectId: string;
    token: AuthorizationToken["token"];
  },
  context: AppContext
) => {
  // Only owner of the project can delete authorization tokens
  const canDeleteToken = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "own" },
    context
  );

  if (canDeleteToken === false) {
    throw new Error(
      "You don't have access to delete this project authorization tokens"
    );
  }

  const dbToken = await context.postgrest.client
    .from("AuthorizationToken")
    .delete()
    .eq("projectId", props.projectId)
    .eq("token", props.token)
    .select()
    .single();
  if (dbToken.error) {
    throw dbToken.error;
  }

  return dbToken.data;
};
