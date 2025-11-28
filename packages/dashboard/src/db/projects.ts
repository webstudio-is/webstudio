import type { SetNonNullable } from "type-fest";
import {
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";

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

  // Fetch custom domains for all projects
  const projectIds = data.data
    .map((project) => project.id)
    .filter((id): id is string => id !== null);
  const domainsData = await context.postgrest.client
    .from("domainsVirtual")
    .select("projectId, domain, status, verified")
    .in("projectId", projectIds);

  // Map domains to projects
  const domainsByProject = new Map<
    string,
    Array<{ domain: string; status: string; verified: boolean }>
  >();
  if (domainsData.data) {
    for (const domain of domainsData.data) {
      if (!domainsByProject.has(domain.projectId)) {
        domainsByProject.set(domain.projectId, []);
      }
      domainsByProject.get(domain.projectId)?.push({
        domain: domain.domain,
        status: domain.status,
        verified: domain.verified,
      });
    }
  }

  // Add domains to projects
  const projectsWithDomains = data.data.map((project) => ({
    ...project,
    domainsVirtual: project.id ? domainsByProject.get(project.id) || [] : [],
  }));

  return projectsWithDomains as SetNonNullable<
    (typeof projectsWithDomains)[number],
    | "id"
    | "title"
    | "domain"
    | "isDeleted"
    | "createdAt"
    | "marketplaceApprovalStatus"
  >[];
};

export const findManyByIds = async (
  projectIds: string[],
  context: AppContext
) => {
  if (projectIds.length === 0) {
    return [];
  }
  const data = await context.postgrest.client
    .from("DashboardProject")
    .select("*, previewImageAsset:Asset (*), latestBuildVirtual (*)")
    .in("id", projectIds)
    .eq("isDeleted", false)
    .order("createdAt", { ascending: false })
    .order("id", { ascending: false });
  if (data.error) {
    throw data.error;
  }

  // Fetch custom domains for all projects
  const validProjectIds = data.data
    .map((project) => project.id)
    .filter((id): id is string => id !== null);
  const domainsData = await context.postgrest.client
    .from("domainsVirtual")
    .select("projectId, domain, status, verified")
    .in("projectId", validProjectIds);

  // Map domains to projects
  const domainsByProject = new Map<
    string,
    Array<{ domain: string; status: string; verified: boolean }>
  >();
  if (domainsData.data) {
    for (const domain of domainsData.data) {
      if (!domainsByProject.has(domain.projectId)) {
        domainsByProject.set(domain.projectId, []);
      }
      domainsByProject.get(domain.projectId)?.push({
        domain: domain.domain,
        status: domain.status,
        verified: domain.verified,
      });
    }
  }

  // Add domains to projects
  const projectsWithDomains = data.data.map((project) => ({
    ...project,
    domainsVirtual: project.id ? domainsByProject.get(project.id) || [] : [],
  }));

  return projectsWithDomains as SetNonNullable<
    (typeof projectsWithDomains)[number],
    | "id"
    | "title"
    | "domain"
    | "isDeleted"
    | "createdAt"
    | "marketplaceApprovalStatus"
  >[];
};
