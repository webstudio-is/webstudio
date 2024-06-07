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

    // @todo Delete and use tokens
    const templateIds = [
      // Production
      "5e086cf4-4293-471c-8eab-ddca8b5cd4db",
      "94e6e1b8-c6c4-485a-9d7a-8282e11920c0",
      "05954204-fcee-407e-b47f-77a38de74431",
      "afc162c2-6396-41b7-a855-8fc04604a7b1",
      // Staging IDs
      "e3dd56f9-ffd9-4692-8a61-e835de822e21",
      "90b41d4e-f5e9-48d6-a954-6249b146852a",
    ];

    // @todo Delete and use tokens
    if (props.permit === "view" && templateIds.includes(props.projectId)) {
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

    console.info(`hasProjectPermit execution ${diff}ms`);
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

    console.info(`getProjectPermit execution ${diff}ms`);
  }
};
