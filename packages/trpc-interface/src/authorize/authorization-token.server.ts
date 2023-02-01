import type { AppContext } from "../context/context.server";

/**
 * For 3rd party authorization systems like Ory we need to register token for the project.
 *
 * We do that before the authorizationToken create (and out of the transaction),
 * so in case of an error we will have just stale records of non existed projects in authorization system.
 */
export const registerToken = async (
  props: {
    projectId: string;
    tokenId: string;
    relation: "viewers" | "editors" | "builders";
  },
  context: AppContext
) => {
  const { authorization } = context;
  const { userId, authorizeTrpc } = authorization;

  if (userId === undefined) {
    throw new Error("The user must be authenticated to create a token");
  }

  await authorizeTrpc.create.mutate({
    namespace: "Project",
    id: props.projectId,
    relation: props.relation,
    subjectSet: {
      namespace: "Token",
      id: props.tokenId,
    },
  });
};

// Implement any update operations in the single transaction on authorization system
export const patchToken = async (
  props: { projectId: string; tokenId: string },

  prevRelation: "viewers" | "editors" | "builders",

  nextRelation: "viewers" | "editors" | "builders",

  context: AppContext
) => {
  const { authorization } = context;
  const { userId, authorizeTrpc } = authorization;

  if (userId === undefined) {
    throw new Error("The user must be authenticated to delete a token");
  }

  if (prevRelation !== nextRelation) {
    await authorizeTrpc.patch.mutate([
      {
        action: "delete",
        relationTuple: {
          namespace: "Project",
          id: props.projectId,
          relation: prevRelation,
          subjectSet: {
            namespace: "Token",
            id: props.tokenId,
          },
        },
      },
      {
        action: "insert",
        relationTuple: {
          namespace: "Project",
          id: props.projectId,
          relation: nextRelation,
          subjectSet: {
            namespace: "Token",
            id: props.tokenId,
          },
        },
      },
    ]);
  }
};

export const unregisterToken = async (
  props: {
    projectId: string;
    tokenId: string;
    relation: "viewers" | "editors";
  },
  context: AppContext
) => {
  const { authorization } = context;
  const { userId, authorizeTrpc } = authorization;

  if (userId === undefined) {
    throw new Error("The user must be authenticated to delete a token");
  }

  await authorizeTrpc.delete.mutate({
    namespace: "Project",
    id: props.projectId,
    relation: props.relation,
    subjectSet: {
      namespace: "Token",
      id: props.tokenId,
    },
  });
};
