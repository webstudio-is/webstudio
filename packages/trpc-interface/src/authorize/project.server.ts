import type { Project } from "@webstudio-is/prisma-client";
import type { AuthPermit } from "../shared/authorization-router";
import type { AppContext } from "../context/context.server";

/**
 * For 3rd party authorization systems like Ory we need to register the project owner.
 *
 * We do that before the project create (and out of the transaction),
 * so in case of an error we will have just stale records of non existed projects in authorization system.
 */
export const registerProjectOwner = async (
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
    relation: "owners",
    subjectSet: {
      namespace: "User",
      id: userId,
    },
  });
};

export const hasProjectPermit = async (
  props: {
    projectId: Project["id"];
    permit: AuthPermit;
  },
  context: AppContext
) => {
  const start = Date.now();

  try {
    const { authorization } = context;
    const { authorizeTrpc } = authorization;

    const checks = [];
    const namespace = "Project";

    // Allow load production build env i.e. "published" project
    if (props.permit === "view" && context.authorization.isServiceCall) {
      return true;
    }

    const isTemplate = context.authorization.projectTemplates.includes(
      props.projectId
    );
    if (props.permit === "view" && isTemplate) {
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
    // Token doesn't have own permit, do not check it
    if (authorization.authToken !== undefined && props.permit !== "own") {
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
  } finally {
    const diff = Date.now() - start;

    // eslint-disable-next-line no-console
    console.log(`hasProjectPermit execution ${diff}ms`);
  }
};

/**
 * Returns the first allowed permit from the list or undefined if none is allowed
 * @todo think about caching to authorizeTrpc.check.query
 * batching check queries would help too https://github.com/ory/keto/issues/812
 */
export const getProjectPermit = async <T extends AuthPermit>(
  props: {
    projectId: string;
    permits: readonly T[];
  },
  context: AppContext
): Promise<T | undefined> => {
  const start = Date.now();

  try {
    const permitToCheck = props.permits;

    const permits = await Promise.allSettled(
      permitToCheck.map((permit) =>
        hasProjectPermit({ projectId: props.projectId, permit }, context)
      )
    );

    for (const permit of permits) {
      if (permit.status === "rejected") {
        throw new Error(`Authorization call failed ${permit.reason}`);
      }

      if (permit.value === true) {
        return permitToCheck[permits.indexOf(permit)];
      }
    }
  } finally {
    const diff = Date.now() - start;

    // eslint-disable-next-line no-console
    console.log(`getProjectPermit execution ${diff}ms`);
  }
};
