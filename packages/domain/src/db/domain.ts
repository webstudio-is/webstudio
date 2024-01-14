import { v4 as uuid } from "uuid";
import {
  prisma,
  type Project,
  type Domain,
  type ProjectWithDomain,
  type LatestBuildPerProjectDomain,
} from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { validateDomain } from "./validate";
import { cnameFromUserId } from "./cname-from-user-id";

export type ProjectDomain = ProjectWithDomain & {
  domain: Domain;
  latestBuid: null | LatestBuildPerProjectDomain;
};

const getProjectDomains = async (
  projectId: Project["id"]
): Promise<ProjectDomain[]> =>
  await prisma.projectWithDomain.findMany({
    where: {
      projectId,
    },
    include: {
      domain: true,
      latestBuid: true,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  });

export const findMany = async (
  props: { projectId: Project["id"] },
  context: AppContext
): Promise<
  { success: false; error: string } | { success: true; data: ProjectDomain[] }
> => {
  // Only builder of the project can list domains
  const canList = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "view" },
    context
  );

  if (canList === false) {
    throw new Error("You don't have access to list this project domains");
  }

  const projectDomains = await getProjectDomains(props.projectId);

  return {
    success: true,
    data: projectDomains,
  };
};

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

  // Query amount of domains
  const projectDomainsCount = await prisma.projectWithDomain.count({
    where: {
      userId: ownerId,
    },
  });

  if (projectDomainsCount >= props.maxDomainsAllowedPerUser) {
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
  const dbDomain = await prisma.domain.upsert({
    update: {
      domain,
    },
    create: {
      domain,
      status: "INITIALIZING",
    },
    where: {
      domain,
    },
  });

  const txtRecord = uuid();

  // Create project domain relation
  await prisma.projectDomain.create({
    data: {
      domainId: dbDomain.id,
      projectId: props.projectId,
      txtRecord,
      cname: await cnameFromUserId(ownerId),
    },
  });

  return { success: true };
};

/**
 * Verify TXT record of the domain, update domain status, start 3rd party domain initialization process
 */
export const verify = async (
  props: {
    projectId: Project["id"];
    domain: string;
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

  const validationResult = validateDomain(props.domain);

  if (validationResult.success === false) {
    return validationResult;
  }

  const { domain } = validationResult;

  const projectDomain = await prisma.projectWithDomain.findFirstOrThrow({
    where: {
      projectId: props.projectId,
      domain: {
        domain,
      },
    },
    include: {
      domain: true,
    },
  });

  // @todo: TXT verification and domain initialization should be implemented in the future as queue service
  const createDomainResult = await context.domain.domainTrpc.create.mutate({
    domain,
    txtRecord: projectDomain.txtRecord,
  });

  if (createDomainResult.success === false) {
    return createDomainResult;
  }

  await prisma.domain.update({
    where: {
      domain,
    },
    data: {
      status: "PENDING",
      txtRecord: projectDomain.txtRecord,
    },
  });

  return { success: true };
};

/**
 * Removes projectDomain entry
 */
export const remove = async (
  props: {
    projectId: Project["id"];
    domain: string;
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

  const validationResult = validateDomain(props.domain);

  if (validationResult.success === false) {
    return validationResult;
  }

  const { domain } = validationResult;

  await prisma.projectDomain.deleteMany({
    where: {
      projectId: props.projectId,
      domain: {
        domain,
      },
    },
  });

  return { success: true };
};

type Status = "active" | "pending" | "error";
type StatusEnum = Uppercase<Status>;

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

  if (data.status === "error") {
    // update domain status
    const updatedDomain = await prisma.domain.update({
      where: {
        domain,
      },
      data: {
        status: statusToStatusEnum(data.status),
        error: data.error,
      },
    });

    return { success: true, domain: updatedDomain };
  }

  // update domain status
  const updatedDomain = await prisma.domain.update({
    where: {
      domain,
    },
    data: {
      status: statusToStatusEnum(data.status),
      error: null,
    },
  });

  return { success: true, domain: updatedDomain };
};
