import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { validateDomain } from "./validate";
import { cnameFromUserId } from "./cname-from-user-id";
import type { Project } from "@webstudio-is/project";
import type { Database } from "@webstudio-is/postrest/index.server";

type Result = { success: false; error: string } | { success: true };

/**
 * Creates 2 entries in the database:
 * at the "domain" table and at the "projectDomain" table
 */
export const create = async (
  props: {
    projectId: Project["id"];
    domain: string;
    maxDomainsAllowedPerUser: number;
  },
  context: AppContext
): Promise<Result> => {
  // Only owner or admin of the project can create domains
  const canCreateDomain = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "admin" },
    context
  );

  if (canCreateDomain === false) {
    throw new AuthorizationError(
      "You don't have access to create this project domains"
    );
  }

  const project = await projectDb.project.loadById(props.projectId, context);

  const { userId: ownerId } = project;

  if (ownerId === null) {
    throw new AuthorizationError("Project must have project userId defined");
  }

  const totalDomainsCount = await countTotalDomains(ownerId, context);

  if (totalDomainsCount >= props.maxDomainsAllowedPerUser) {
    return {
      success: false,
      error:
        "You have reached the maximum number of allowed domains. Please upgrade to the Pro plan or higher.",
    };
  }

  const validationResult = validateDomain(props.domain);

  if (validationResult.success === false) {
    return validationResult;
  }

  const { domain } = validationResult;

  // Create domain in domain table
  const upsertResult = await context.postgrest.client
    .from("Domain")
    .upsert(
      {
        id: crypto.randomUUID(),
        domain,
        status: "INITIALIZING",
      },
      // Do not update if exists
      { onConflict: "domain", ignoreDuplicates: true }
    )
    .eq("domain", domain);

  if (upsertResult.error) {
    return { success: false, error: upsertResult.error.message };
  }

  // Get domain id (upsert in postgrest does not return anything in case of conflict and ignoreDuplicates)
  const domainRow = await context.postgrest.client
    .from("Domain")
    .select("id")
    .eq("domain", domain)
    .single();

  if (domainRow.error) {
    return { success: false, error: domainRow.error.message };
  }

  const domainId = domainRow.data.id;
  const txtRecord = crypto.randomUUID();

  const result = await context.postgrest.client.from("ProjectDomain").insert({
    domainId,
    projectId: props.projectId,
    txtRecord,
    cname: await cnameFromUserId(ownerId),
  });

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
};

/**
 * Verify TXT record of the domain, update domain status, start 3rd party domain initialization process
 */
export const verify = async (
  props: {
    projectId: string;
    domainId: string;
  },
  context: AppContext
): Promise<Result> => {
  // Only owner or admin of the project can register domains
  const canRegisterDomain = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "admin" },
    context
  );

  if (canRegisterDomain === false) {
    throw new Error("You don't have access to create this project domains");
  }

  const projectDomain = await context.postgrest.client
    .from("ProjectDomain")
    .select(
      `
      txtRecord,
      cname,
      domain:Domain(*)
      `
    )
    .eq("domainId", props.domainId)
    .eq("projectId", props.projectId)
    .single();

  if (projectDomain.error) {
    return { success: false, error: projectDomain.error.message };
  }

  const domain = projectDomain.data.domain?.domain;

  if (domain == null) {
    return { success: false, error: "Domain not found" };
  }

  // @todo: TXT verification and domain initialization should be implemented in the future as queue service
  const createDomainResult = await context.domain.domainTrpc.create.mutate({
    domain,
    txtRecord: projectDomain.data.txtRecord,
  });

  if (createDomainResult.success === false) {
    return createDomainResult;
  }

  const domainUpdateResult = await context.postgrest.client
    .from("Domain")
    .update({
      status: "PENDING",
      txtRecord: projectDomain.data.txtRecord,
    })
    .eq("id", props.domainId);

  if (domainUpdateResult.error) {
    return { success: false, error: domainUpdateResult.error.message };
  }

  return { success: true };
};

/**
 * Removes projectDomain entry
 */
export const remove = async (
  props: {
    projectId: string;
    domainId: string;
  },
  context: AppContext
): Promise<Result> => {
  // Only owner or admin of the project can register domains
  const canDeleteDomain = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "admin" },
    context
  );

  if (canDeleteDomain === false) {
    throw new Error("You don't have access to delete this project domains");
  }

  const deleteResult = await context.postgrest.client
    .from("ProjectDomain")
    .delete()
    .eq("domainId", props.domainId)
    .eq("projectId", props.projectId);

  if (deleteResult.error) {
    return { success: false, error: deleteResult.error.message };
  }

  return { success: true };
};

type Status = "active" | "pending" | "error";
type StatusEnum = Uppercase<Status>;

type Domain = Database["public"]["Tables"]["Domain"]["Row"];

type RefreshResult =
  | { success: false; error: string }
  | { success: true; domain: Domain };

const statusToStatusEnum = (status: Status): StatusEnum =>
  status.toUpperCase() as StatusEnum;

/**
 * Reads the status of the domain from the 3rd party provider
 * and updates the database accordingly
 *
 * @todo: In the future should be a read only status reader
 */
export const updateStatus = async (
  props: {
    projectId: Project["id"];
    domain: string;
  },
  context: AppContext
): Promise<RefreshResult> => {
  // Only owner or admin of the project can register domains
  const canRefreshDomain = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "admin" },
    context
  );

  if (canRefreshDomain === false) {
    throw new Error("You don't have access to refresh this project domains");
  }

  const validationResult = validateDomain(props.domain);

  if (validationResult.success === false) {
    return validationResult;
  }

  const { domain } = validationResult;

  // @todo: must be implemented as workflow/queue service part of 3rd party domain initialization process
  const statusResult = await context.domain.domainTrpc.getStatus.query({
    domain,
  });

  if (statusResult.success === false) {
    return statusResult;
  }

  const { data } = statusResult;

  // update domain status
  const updatedDomainResult = await context.postgrest.client
    .from("Domain")
    .update({
      status: statusToStatusEnum(data.status),
      error: data.status === "error" ? data.error : null,
    })
    .eq("domain", domain)
    .select("*")
    .single();

  if (updatedDomainResult.error) {
    return { success: false, error: updatedDomainResult.error.message };
  }

  return { success: true, domain: updatedDomainResult.data };
};

export const countTotalDomains = async (
  userId: string,
  context: AppContext
): Promise<number> => {
  const result = await context.postgrest.client
    .from("Domain")
    .select("Project!ProjectDomain!inner(id)", {
      count: "exact",
      head: true,
    })
    .eq("Project.userId", userId)
    .eq("Project.isDeleted", false);

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
};
