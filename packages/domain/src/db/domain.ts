import { v4 as uuid } from "uuid";
import { prisma, type Project } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { validateDomain } from "./validate";

const getProjectDomains = async (projectId: Project["id"]) =>
  await prisma.projectWithDomain.findMany({
    where: {
      projectId,
    },
    include: {
      domain: true,
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
  | { success: false; error: string }
  | { success: true; data: Awaited<ReturnType<typeof getProjectDomains>> }
> => {
  // Only builder of the project can list domains
  const canList = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "build" },
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

export const start = async (
  props: {
    projectId: Project["id"];
    domain: string;
    maxDomainsAllowedPerUser: number;
  },
  context: AppContext
): Promise<Result> => {
  // Only owner of the project can create domains
  const canCreateDomain = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "own" },
    context
  );

  if (canCreateDomain === false) {
    throw new Error("You don't have access to create this project domains");
  }

  // Query amount of domains
  const projectDomainsCount = await prisma.projectWithDomain.count({
    where: {
      userId: context.authorization.userId,
    },
  });

  if (projectDomainsCount >= props.maxDomainsAllowedPerUser) {
    return {
      success: false,
      error: "You have reached the maximum amount of domains allowed",
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
      status: "starting",
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
    },
  });

  return { success: true };
};

export const create = async (
  props: {
    projectId: Project["id"];
    domain: string;
  },
  context: AppContext
): Promise<Result> => {
  // Only owner of the project can register domains
  const canRegisterDomain = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "own" },
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

  // Get domain state
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
      status: "creating",
      txtRecord: projectDomain.txtRecord,
    },
  });

  return { success: true };
};

export const refresh = async (
  props: {
    projectId: Project["id"];
    domain: string;
  },
  context: AppContext
): Promise<Result> => {
  // Only owner of the project can register domains
  const canRefreshDomain = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "own" },
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

  const projectDomain = await prisma.projectWithDomain.findFirstOrThrow({
    where: {
      projectId: props.projectId,
      domain: {
        domain,
      },
    },
  });

  const statusResult = await context.domain.domainTrpc.getStatus.query({
    domain,
    txtRecord: projectDomain.txtRecord,
  });

  if (statusResult.success === false) {
    return statusResult;
  }

  const { status } = statusResult.data;

  // update domain status
  await prisma.domain.update({
    where: {
      domain,
    },
    data: {
      status,
      txtRecord: projectDomain.txtRecord,
    },
  });

  return { success: true };
};
