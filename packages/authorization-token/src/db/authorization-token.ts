import { v4 as uuid } from "uuid";
import {
  prisma,
  type AuthorizationToken,
  type Project,
} from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  authorizeAuthorizationToken,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";

export const findMany = async (
  props: { projectId: Project["id"] },
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

  // Get all leaf nodes for the project
  const leafNodes =
    await context.authorization.authorizeTrpc.expandLeafNodes.query({
      namespace: "Project",
      id: props.projectId,
    });

  const tokenLeafNodes = leafNodes.filter(
    (leafNode) => leafNode.namespace === "Token"
  );

  const dbTokens = await prisma.authorizationToken.findMany({
    where: {
      token: {
        in: tokenLeafNodes.map((leafNode) => leafNode.id),
      },
    },
    // Stable order
    orderBy: [
      {
        createdAt: "asc",
      },
      { token: "asc" },
    ],
  });

  return dbTokens;
};

export const create = async (
  props: {
    projectId: Project["id"];
    relation: AuthorizationToken["relation"];
    name: string;
  },
  context: AppContext
) => {
  const tokenId = uuid();

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

  await authorizeAuthorizationToken.registerToken(
    {
      tokenId,
      projectId: props.projectId,
      relation: props.relation,
    },
    context
  );

  const dbToken = await prisma.authorizationToken.create({
    data: {
      projectId: props.projectId,
      relation: props.relation,
      token: tokenId,
      name: props.name,
    },
  });

  return dbToken;
};

export const update = async (
  props: {
    projectId: Project["id"];
    token: AuthorizationToken["token"];
    name: AuthorizationToken["name"];
    relation: AuthorizationToken["relation"];
  },
  context: AppContext
) => {
  // Only owner of the project can edit authorization tokens
  const canCreateToken = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "own" },
    context
  );

  if (canCreateToken === false) {
    throw new AuthorizationError(
      "You don't have access to edit this project authorization tokens"
    );
  }

  const previousToken = await prisma.authorizationToken.findUnique({
    where: {
      // eslint-disable-next-line camelcase
      token_projectId: {
        projectId: props.projectId,
        token: props.token,
      },
    },
  });

  if (previousToken === null) {
    throw new AuthorizationError("Authorization token not found");
  }

  if (previousToken.relation !== props.relation) {
    await authorizeAuthorizationToken.patchToken(
      { tokenId: props.token, projectId: props.projectId },
      previousToken.relation,
      props.relation,
      context
    );
  }

  const dbToken = await prisma.authorizationToken.update({
    where: {
      // eslint-disable-next-line camelcase
      token_projectId: {
        projectId: props.projectId,
        token: props.token,
      },
    },
    data: {
      name: props.name,
      relation: props.relation,
    },
  });

  return dbToken;
};

export const remove = async (
  props: {
    projectId: Project["id"];
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

  const dbToken = await prisma.authorizationToken.delete({
    where: {
      // eslint-disable-next-line camelcase
      token_projectId: {
        projectId: props.projectId,
        token: props.token,
      },
    },
  });

  return dbToken;
};
