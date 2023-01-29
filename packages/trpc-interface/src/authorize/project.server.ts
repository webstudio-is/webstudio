import { AppContext } from "../context/context.server";
import { v4 as uuid } from "uuid";

/**
 * For 3rd party authorization systems like Ory we need to register the project owner
 * and create an initial read token for the project.
 *
 * We do that before the project create (and out of the transaction),
 * so in case of an error we will have just stale records of non existed projects in authorization system.
 */
export const registerProjectOwnerAndReadToken = async (
  props: { projectId: string },
  context: AppContext
) => {
  const { authorization } = context;
  const { userId, authorizeTrpc } = authorization;

  if (userId === undefined) {
    throw new Error("The user must be authenticated to create a project");
  }

  await authorizeTrpc.create.mutate({
    namespace: "Project",
    id: props.projectId,
    relation: "owner",
    subjectSet: {
      namespace: "User",
      id: userId,
    },
  });

  await authorizeTrpc.create.mutate({
    namespace: "Project",
    id: props.projectId,
    relation: "viewers",
    subjectSet: {
      namespace: "Token",
      id: uuid(),
    },
  });
};

export const hasProjectPermit = async (
  props: {
    projectId: string;
    permit: "view" | "edit" | "own";
  },
  context: AppContext
) => {
  const { authorization } = context;
  const { authorizeTrpc } = authorization;

  const checks = [];
  const namespace = "Project";

  // Allow load production build env i.e. "published" site
  if (props.permit === "view" && context.authorization.buildEnv === "prod") {
    return true;
  }

  // Edge-case to allow access the project on the canvas
  if (
    props.permit === "view" &&
    authorization.authReadToken !== undefined &&
    authorization.authReadToken.projectId === props.projectId
  ) {
    return true;
  }

  // Check if the user is allowed to access the project
  if (authorization.userId !== undefined) {
    checks.push(
      authorizeTrpc.check.query({
        subjectSet: {
          namespace: "User",
          id: authorization.userId,
        },
        namespace,
        id: props.projectId,
        permit: props.permit,
      })
    );
  }

  // Check if the special link with a token allows to access the project
  if (authorization.authToken !== undefined) {
    checks.push(
      authorizeTrpc.check.query({
        namespace,
        id: props.projectId,
        subjectSet: {
          id: authorization.authToken,
          namespace: "Token",
        },
        permit: props.permit,
      })
    );
  }

  if (checks.length === 0) {
    return false;
  }

  const authResults = await Promise.allSettled(checks);

  for (const authResult of authResults) {
    if (authResult.status === "rejected") {
      throw new Error(`Authorization call failed ${authResult.reason}`);
    }
  }

  const allowed = authResults.some(
    (authResult) =>
      authResult.status === "fulfilled" && authResult.value.allowed
  );

  return allowed;
};
