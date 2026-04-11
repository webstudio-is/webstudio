import type { AppContext } from "../context/context.server";
import type { Role } from "./role";
import memoize from "memoize";

type Relation = Role;

export type AuthPermit = "view" | "edit" | "build" | "admin" | "own";

type TokenAuthPermit = Exclude<AuthPermit, "own">;

type CheckInput = {
  namespace: "Project";
  id: string;

  permit: AuthPermit;

  subjectSet: {
    namespace: "User" | "Token";
    id: string;
  };
};

const permitToRelationRewrite: Record<TokenAuthPermit, Relation[]> = {
  view: ["viewers", "editors", "builders", "administrators"],
  edit: ["editors", "builders", "administrators"],
  build: ["builders", "administrators"],
  admin: ["administrators"],
};

/**
 * Pure function: checks whether a set of workspace relations grants a given
 * permit. Used by the auth layer to evaluate workspace-based access.
 */
const isRolePermitted = (relations: string[], permit: AuthPermit): boolean => {
  // Workspace owner gets all permits
  if (relations.includes("own")) {
    return true;
  }
  // Only workspace owner gets "own" permit
  if (permit === "own") {
    return false;
  }
  const permitted = permitToRelationRewrite[permit] ?? [];
  return relations.some((r) => permitted.includes(r as Relation));
};

const check = async (
  postgrestClient: AppContext["postgrest"]["client"],
  input: CheckInput
) => {
  const { subjectSet } = input;

  if (subjectSet.namespace === "User") {
    // Check if the user is the direct owner of the project
    const row = await postgrestClient
      .from("Project")
      .select("id")
      .eq("id", input.id)
      .eq("userId", subjectSet.id)
      .maybeSingle();
    if (row.error) {
      throw row.error;
    }

    if (row.data !== null) {
      return { allowed: true };
    }

    // Workspace-based authorization
    const wpaRows = await postgrestClient
      .from("WorkspaceProjectAuthorization")
      .select("relation")
      .eq("userId", subjectSet.id)
      .eq("projectId", input.id);

    if (wpaRows.error) {
      throw wpaRows.error;
    }

    if (wpaRows.data.length > 0) {
      const relations = wpaRows.data.flatMap((r) =>
        r.relation !== null ? [r.relation] : []
      );
      return { allowed: isRolePermitted(relations, input.permit) };
    }

    return { allowed: false };
  }

  if (input.permit === "own") {
    return { allowed: false };
  }

  if (subjectSet.namespace !== "Token") {
    return { allowed: false };
  }

  const row = await postgrestClient
    .from("AuthorizationToken")
    .select("token")
    .eq("token", subjectSet.id)
    .in("relation", [...permitToRelationRewrite[input.permit]])
    .maybeSingle();

  if (row.error) {
    throw row.error;
  }

  return { allowed: row.data !== null };
};

// doesn't work in cloudflare workers
const memoizedCheck = memoize(check, {
  // Short TTL so plan downgrades propagate quickly. No cache invalidation
  // hook exists yet — keep this low until one is added.
  maxAge: 10 * 1000,
  cacheKey: ([_context, input]) => JSON.stringify(input),
});

type AuthInfo =
  | {
      type: "user";
      userId: string;
    }
  | {
      type: "token";
      authToken: string;
    }
  | {
      type: "service";
    };

export const checkProjectPermit = async ({
  projectId,
  permit,
  authInfo,
  postgrestClient,
}: {
  projectId: string;
  permit: AuthPermit;
  authInfo: AuthInfo;
  postgrestClient: AppContext["postgrest"]["client"];
}) => {
  const checks = [];
  const namespace = "Project";

  if (authInfo.type === "service") {
    return permit === "view";
  }

  // @todo Delete and use tokens
  const templateIds = [
    // Production
    "5e086cf4-4293-471c-8eab-ddca8b5cd4db",
    "94e6e1b8-c6c4-485a-9d7a-8282e11920c0",
    "05954204-fcee-407e-b47f-77a38de74431",
    "afc162c2-6396-41b7-a855-8fc04604a7b1",
    "3f260731-825b-486a-b534-e747f0ed6106",
    "400b1bde-def1-49e0-9b64-e26416d326fa",
    "2e802ad7-ef32-48e6-8706-3a162785ef95",
    "01f6f1d8-06f5-4a6c-a3b1-89a0448046c7",
    "5b33acf4-53cf-4f03-8973-d5679772edee",
    "909a139b-1f2d-415a-ac90-382fa19fa7d8",
    "ef82ee51-e4d6-4a69-a4cc-7bf1dee65ed7",
    "e761178f-6ac6-47f6-b881-56cc75640d73",
    // Staging IDs
    "c236999d-be6b-43fb-9edc-78a2ba59e56d",
    "a1371dce-752c-4ccf-8ea4-88bab577fe50",
    "6204396c-3f9e-4d29-8d19-ff0f76960a74",
  ];

  // @todo Delete and use tokens
  if (permit === "view" && templateIds.includes(projectId)) {
    return true;
  }

  if (authInfo.type === "token") {
    // Token doesn't have "own" permit, do not check it
    if (permit === "own") {
      return false;
    }

    checks.push(
      memoizedCheck(postgrestClient, {
        namespace,
        id: projectId,
        subjectSet: {
          id: authInfo.authToken,
          namespace: "Token",
        },
        permit: permit,
      })
    );
  }

  // Check if the user is allowed to access the project
  if (authInfo.type === "user") {
    checks.push(
      memoizedCheck(postgrestClient, {
        subjectSet: {
          namespace: "User",
          id: authInfo.userId,
        },
        namespace,
        id: projectId,
        permit: permit,
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

/**
 * Look up the workspace owner's userId for a given project.
 * Returns undefined when the project has no workspace.
 */
const getWorkspaceOwnerIdForProject = async (
  projectId: string,
  context: Pick<AppContext, "postgrest">
): Promise<string | undefined> => {
  const project = await context.postgrest.client
    .from("Project")
    .select("workspaceId")
    .eq("id", projectId)
    .maybeSingle();

  if (project.error || project.data?.workspaceId == null) {
    return;
  }

  const workspace = await context.postgrest.client
    .from("Workspace")
    .select("userId")
    .eq("id", project.data.workspaceId)
    .eq("isDeleted", false)
    .maybeSingle();

  return workspace.data?.userId ?? undefined;
};

export const hasProjectPermit = async (
  props: {
    projectId: string;
    permit: AuthPermit;
  },
  context: AppContext
) => {
  const { authorization } = context;

  if (authorization.type === "anonymous") {
    return false;
  }

  const authInfo: AuthInfo = authorization;

  if (authInfo === undefined) {
    return false;
  }

  const allowed = await checkProjectPermit({
    projectId: props.projectId,
    permit: props.permit,
    authInfo,
    postgrestClient: context.postgrest.client,
  });

  if (allowed === false) {
    return false;
  }

  // Workspace downgrade check: when a workspace member accesses a project,
  // verify the workspace owner's plan still supports workspace features.
  // Direct project owners and workspace owners are not affected.
  if (authorization.type === "user") {
    // "own" permit is only granted to direct owners and workspace owners —
    // both are unaffected by downgrade. This call is memoized.
    const isOwner = await checkProjectPermit({
      projectId: props.projectId,
      permit: "own",
      authInfo,
      postgrestClient: context.postgrest.client,
    });

    if (isOwner === false) {
      // User is a workspace member — verify the owner's plan
      const workspaceOwnerId = await getWorkspaceOwnerIdForProject(
        props.projectId,
        context
      );

      if (workspaceOwnerId !== undefined) {
        const ownerPlan = await context.getOwnerPlanFeatures(workspaceOwnerId);
        if (ownerPlan.maxWorkspaces <= 1) {
          return false;
        }
      }
    }
  }

  return true;
};

/**
 * Returns the first allowed permit from the list or undefined if none is allowed
 * @todo think about caching to authorizeTrpc.check.query
 * batching check queries would help too https://github.com/ory/keto/issues/812
 */
export const getProjectPermit = async (
  props: {
    projectId: string;
    permits: readonly AuthPermit[];
  },
  context: AppContext
): Promise<AuthPermit | undefined> => {
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
};

export const __testing__ = {
  isRolePermitted,
  getWorkspaceOwnerIdForProject,
};
