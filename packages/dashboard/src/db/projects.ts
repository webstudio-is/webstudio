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

export const findMany = async (userId: string, context: AppContext) => {
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

  const data = await context.postgrest.client
    .from("DashboardProject")
    .select("*, previewImageAsset:Asset (*), latestBuildVirtual (*)")
    .eq("userId", userId)
    .eq("isDeleted", false)
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

export const findManyByIds = async (
  projectIds: string[],
  context: AppContext
) => {
  if (projectIds.length === 0) {
    return [];
  }

  // Get the user ID for ownership filtering
  // Allow service context (no authorization) to access any projects (for templates)
  const userId =
    context.authorization.type === "user"
      ? context.authorization.userId
      : undefined;

  let query = context.postgrest.client
    .from("DashboardProject")
    .select("*, previewImageAsset:Asset (*), latestBuildVirtual (*)")
    .in("id", projectIds)
    .eq("isDeleted", false);

  // If user context, also filter by userId OR isMarketplaceApproved (public templates)
  if (userId !== undefined) {
    query = query.or(
      `userId.eq.${userId},marketplaceApprovalStatus.eq.APPROVED`
    );
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
