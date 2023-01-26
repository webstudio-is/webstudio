import { AppContext } from "../context/context.server";
import { v4 as uuid } from "uuid";

export const beforeProjectCreate = async (
  props: { projectId: string; userId: string },
  context: AppContext
) => {
  const { authorization } = context;
  const { authorizeTrpc } = authorization;

  // Tell authorization service that user is owner of the project
  await authorizeTrpc.create.mutate({
    namespace: "Project",
    id: props.projectId,
    relation: "owner",
    subjectSet: {
      namespace: "User",
      id: props.userId,
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
