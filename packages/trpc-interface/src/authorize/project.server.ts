import { AppContext } from "../context/context.server";
import { v4 as uuid } from "uuid";

/**
 * For 3rd party authorize system like Ory we need to register project owner
 * and create initial read token for the project.
 *
 * We do that before project create (and out of transaction),
 * so in case of error we will have just stale records of non existed project in authorize system.
 */
export const registerProjectOwnerAndReadToken = async (
  props: { projectId: string },
  context: AppContext
) => {
  const { authorization } = context;
  const { userId, authorizeTrpc } = authorization;

  if (userId === undefined) {
    throw new Error("User must be authenticated to create project");
  }

  // Tell authorization service that user is owner of the project
  await authorizeTrpc.create.mutate({
    namespace: "Project",
    id: props.projectId,
    relation: "owner",
    subjectSet: {
      namespace: "User",
      id: userId,
    },
  });

  // Create initial read token for the project
  await authorizeTrpc.create.mutate({
    namespace: "Project",
    id: props.projectId,
    relation: "viewers",
    subjectSet: {
      namespace: "Token",
      // Random token
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

  // Edge case to allow access on canvas
  if (
    props.permit === "view" &&
    authorization.readToken !== undefined &&
    authorization.readToken.projectId === props.projectId
  ) {
    return true;
  }

  // Check if user is allowed to access the project
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

  // Check if special link with token allows to access the project
  if (authorization.token !== undefined) {
    checks.push(
      authorizeTrpc.check.query({
        namespace,
        id: props.projectId,
        subjectSet: {
          id: authorization.token,
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
