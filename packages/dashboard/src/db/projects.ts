import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";

type DomainVirtual = {
  domain: string;
  status: string;
  verified: boolean;
};

const fetchAndMapDomains = async <
  T extends {
    id: string;
    title: string;
    domain: string;
    createdAt: string;
    [key: string]: unknown;
  },
>(
  projects: T[],
  context: AppContext
) => {
  const projectIds = projects.map((project) => project.id);

  type ProjectWithDomains = T & {
    domainsVirtual: DomainVirtual[];
  };

  if (projectIds.length === 0) {
    return projects.map((project) => ({
      ...project,
      domainsVirtual: [],
    })) as ProjectWithDomains[];
  }

  // Query ProjectDomain and Domain tables
  const domainsData = await context.postgrest.client
    .from("ProjectDomain")
    .select("projectId, Domain!inner(domain, status, txtRecord), txtRecord")
    .in("projectId", projectIds);

  if (domainsData.error) {
    console.error("Error fetching domains:", domainsData.error);
    // Continue without domains rather than failing
  }

  // Map domains to projects
  const domainsByProject = new Map<string, DomainVirtual[]>();
  if (domainsData.data) {
    for (const projectDomain of domainsData.data) {
      if (!domainsByProject.has(projectDomain.projectId)) {
        domainsByProject.set(projectDomain.projectId, []);
      }
      // Type assertion needed for joined data
      const domainData = projectDomain.Domain as unknown as {
        domain: string;
        status: string;
        txtRecord: string;
      };
      const verified = domainData.txtRecord === projectDomain.txtRecord;
      domainsByProject.get(projectDomain.projectId)?.push({
        domain: domainData.domain,
        status: domainData.status,
        verified,
      });
    }
  }

  // Add domains to projects
  return projects.map((project) => ({
    ...project,
    domainsVirtual: project.id ? domainsByProject.get(project.id) || [] : [],
  })) as ProjectWithDomains[];
};

export type DashboardProject = Awaited<ReturnType<typeof findMany>>[number];

export const findMany = async ({
  userId,
  context,
  workspaceId,
  includeUnassigned,
}: {
  userId: string;
  context: AppContext;
  workspaceId?: string;
  includeUnassigned?: boolean;
}) => {
  if (context.authorization.type !== "user") {
    throw new AuthorizationError(
      "Only logged in users can view the project list"
    );
  }

  if (userId !== context.authorization.userId) {
    throw new AuthorizationError(
      "Only the project owner can view the project list"
    );
  }

  // When filtering by workspace, verify the caller is a member or owner
  // to prevent unauthorized access via direct tRPC calls.
  if (workspaceId !== undefined) {
    const workspace = await context.postgrest.client
      .from("Workspace")
      .select("userId")
      .eq("id", workspaceId)
      .eq("isDeleted", false)
      .maybeSingle();

    if (workspace.error) {
      throw workspace.error;
    }

    if (workspace.data === null) {
      throw new AuthorizationError("Workspace not found");
    }

    const isOwner = workspace.data.userId === userId;

    if (isOwner === false) {
      const membership = await context.postgrest.client
        .from("WorkspaceMember")
        .select("userId")
        .eq("workspaceId", workspaceId)
        .eq("userId", userId)
        .is("removedAt", null)
        .maybeSingle();

      if (membership.error) {
        throw membership.error;
      }

      if (membership.data === null) {
        throw new AuthorizationError("You don't have access to this workspace");
      }
    }
  }

  let query = context.postgrest.client
    .from("DashboardProject")
    .select("*, previewImageAsset:Asset (*), latestBuildVirtual (*)");

  // When filtering by workspace, show all workspace projects
  // (members can see all projects in the workspace)
  if (workspaceId !== undefined) {
    if (includeUnassigned) {
      // For the default workspace, also include pre-workspace projects that
      // have NULL workspaceId — these belong to the user but haven't been
      // assigned to a workspace yet.
      query = query.or(
        `workspaceId.eq.${workspaceId},and(workspaceId.is.null,userId.eq.${userId})`
      );
    } else {
      query = query.eq("workspaceId", workspaceId);
    }
  } else {
    query = query.eq("userId", userId);
  }

  query = query.eq("isDeleted", false);

  const data = await query
    .order("createdAt", { ascending: false })
    .order("id", { ascending: false });

  if (data.error) {
    throw data.error;
  }

  // Type assertion: These fields are never null in practice (come from Project table which has them as required)
  return await fetchAndMapDomains(
    data.data as Array<
      (typeof data.data)[number] & {
        id: string;
        title: string;
        domain: string;
        createdAt: string;
      }
    >,
    context
  );
};

export const countByUserId = async ({
  userId,
  context,
}: {
  userId: string;
  context: AppContext;
}) => {
  if (context.authorization.type !== "user") {
    throw new AuthorizationError(
      "Only logged in users can view the project count"
    );
  }
  if (userId !== context.authorization.userId) {
    throw new AuthorizationError(
      "Only the project owner can view the project count"
    );
  }
  const result = await context.postgrest.client
    .from("Project")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("isDeleted", false);
  if (result.error) {
    throw result.error;
  }
  return result.count ?? 0;
};

export const findManyByIds = async (
  projectIds: string[],
  context: AppContext
) => {
  if (projectIds.length === 0) {
    return [];
  }

  const userId =
    context.authorization.type === "user"
      ? context.authorization.userId
      : undefined;

  let query = context.postgrest.client
    .from("DashboardProject")
    .select("*, previewImageAsset:Asset (*), latestBuildVirtual (*)")
    .in("id", projectIds)
    .eq("isDeleted", false);

  if (userId !== undefined) {
    query = query.or(
      `userId.eq.${userId},marketplaceApprovalStatus.eq.APPROVED`
    );
  } else {
    query = query.eq("marketplaceApprovalStatus", "APPROVED");
  }

  const data = await query
    .order("createdAt", { ascending: false })
    .order("id", { ascending: false });
  if (data.error) {
    throw data.error;
  }

  // Type assertion: These fields are never null in practice (come from Project table which has them as required)
  return await fetchAndMapDomains(
    data.data as Array<
      (typeof data.data)[number] & {
        id: string;
        title: string;
        domain: string;
        createdAt: string;
      }
    >,
    context
  );
};
