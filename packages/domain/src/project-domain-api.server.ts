import { nanoid } from "nanoid";
import * as projectApi from "@webstudio-is/project/index.server";
import {
  createProductionBuild,
  unpublishBuild,
} from "@webstudio-is/project-build/index.server";
import type { Deployment } from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { db } from "./db";
import { validateDomain } from "./db/validate";

type LoadedProject = Awaited<ReturnType<typeof projectApi.loadById>>;
type ProjectDomain = LoadedProject["domainsVirtual"][number];

const assertMutation = (result: { success: boolean; error?: string }) => {
  if (result.success === false) {
    throw new Error(result.error ?? "Domain operation failed");
  }
};

const serializeProjectDomain = (domain: ProjectDomain) => ({
  id: domain.domainId,
  domain: domain.domain,
  status: domain.status,
  verified: domain.verified,
  txtRecord: domain.domainTxtRecord ?? undefined,
  expectedTxtRecord: domain.expectedTxtRecord,
  cname: domain.cname,
  error: domain.error ?? undefined,
  createdAt: domain.createdAt,
  updatedAt: domain.updatedAt,
});

const getProjectDomainOrThrow = (
  project: LoadedProject,
  predicate: (domain: ProjectDomain) => boolean
) => {
  const domain = project.domainsVirtual.find(predicate);
  if (domain === undefined) {
    throw new Error("Domain not found");
  }
  return domain;
};

export const getDefaultPublishDomains = (
  project: LoadedProject,
  target: "staging" | "production"
) => {
  if (target === "staging") {
    return [project.domain];
  }
  return [
    project.domain,
    ...project.domainsVirtual
      .filter((domain) => domain.status === "ACTIVE" && domain.verified)
      .map((domain) => domain.domain),
  ];
};

export const getVerifiedPublishDomains = (
  project: LoadedProject,
  domains: string[]
) => {
  const currentProjectDomains = project.domainsVirtual;
  const verifiedDomains: string[] = [];

  if (domains.includes(project.domain)) {
    verifiedDomains.push(project.domain);
  }

  verifiedDomains.push(
    ...domains.filter((domain) =>
      currentProjectDomains.some(
        (projectDomain) =>
          projectDomain.domain === domain &&
          projectDomain.status === "ACTIVE" &&
          projectDomain.verified
      )
    )
  );

  return verifiedDomains;
};

const createSaasDeployment = ({
  project,
  domains,
}: {
  project: LoadedProject;
  domains: string[];
}): Deployment => ({
  destination: "saas",
  domains,
  assetsDomain: project.domain,
  excludeWstdDomainFromSearch: project.domainsVirtual.some(
    (domain) => domain.status === "ACTIVE" && domain.verified
  ),
});

export const publishProject = async (
  {
    projectId,
    domains,
  }: {
    projectId: string;
    domains: string[];
  },
  context: AppContext
) => {
  const project = await projectApi.loadById(projectId, context);
  const build = await createProductionBuild(
    {
      projectId,
      deployment: createSaasDeployment({ project, domains }),
    },
    context
  );
  const { deploymentTrpc, env } = context.deployment;

  if (env.BUILDER_ORIGIN === undefined) {
    throw new Error("Missing env.BUILDER_ORIGIN");
  }

  const result = await deploymentTrpc.publish.mutate({
    builderOrigin: env.BUILDER_ORIGIN,
    githubSha: env.GITHUB_SHA,
    buildId: build.id,
    branchName: env.GITHUB_REF_NAME,
    destination: "saas",
    logProjectName: `${project.title} - ${project.id}`,
  });

  const deploymentNotImplemented =
    result.success === false && result.error === "NOT_IMPLEMENTED";
  if (result.success === false && deploymentNotImplemented === false) {
    throw new Error(String(result.error ?? "Publish failed"));
  }

  return { build, project, deploymentNotImplemented };
};

export const unpublishProjectDomains = async (
  {
    projectId,
    domains,
  }: {
    projectId: string;
    domains: string[];
  },
  context: AppContext
) => {
  const { deploymentTrpc, env } = context.deployment;

  for (const domain of domains) {
    const dbDomain = domain.replace(`.${env.PUBLISHER_HOST}`, "");
    const result = await deploymentTrpc.unpublish.mutate({ domain });
    await unpublishBuild({ projectId, domain: dbDomain }, context).catch(
      (error) => {
        if (
          error instanceof Error &&
          error.message === `Domain ${dbDomain} is not published`
        ) {
          return;
        }
        throw error;
      }
    );
    if (result.success === false && result.error !== "NOT_IMPLEMENTED") {
      throw new Error(`Failed to unpublish ${domain}: ${result.error}`);
    }
  }
};

export const listProjectDomains = async (
  projectId: string,
  context: AppContext
) => {
  const project = await projectApi.loadById(projectId, context);
  return project.domainsVirtual.map(serializeProjectDomain);
};

export const createProjectDomain = async (
  input: { projectId: string; domain: string },
  context: AppContext
) => {
  assertMutation(await db.create(input, context));
  const project = await projectApi.loadById(input.projectId, context);
  const validation = validateDomain(input.domain);
  const domain =
    validation.success === true
      ? validation.domain
      : input.domain.toLowerCase();
  return serializeProjectDomain(
    getProjectDomainOrThrow(project, (item) => item.domain === domain)
  );
};

export const updateProjectDomain = async (
  input: {
    projectId: string;
    domainId: string;
    updates: { domain?: string };
  },
  context: AppContext
) => {
  const project = await projectApi.loadById(input.projectId, context);
  getProjectDomainOrThrow(
    project,
    (domain) => domain.domainId === input.domainId
  );

  if (input.updates.domain !== undefined) {
    const validation = validateDomain(input.updates.domain);
    if (validation.success === false) {
      throw new Error(validation.error);
    }
    const result = await context.postgrest.client
      .from("Domain")
      .update({
        domain: validation.domain,
        status: "INITIALIZING",
        error: null,
        txtRecord: null,
      })
      .eq("id", input.domainId);
    if (result.error) {
      throw result.error;
    }
  }

  const updatedProject = await projectApi.loadById(input.projectId, context);
  return serializeProjectDomain(
    getProjectDomainOrThrow(
      updatedProject,
      (domain) => domain.domainId === input.domainId
    )
  );
};

export const deleteProjectDomain = async (
  input: { projectId: string; domainId: string },
  context: AppContext
) => {
  assertMutation(await db.remove(input, context));
  return { status: "deleted" as const };
};

export const verifyProjectDomain = async (
  input: { projectId: string; domainId: string },
  context: AppContext
) => {
  assertMutation(await db.verify(input, context));
  const project = await projectApi.loadById(input.projectId, context);
  return serializeProjectDomain(
    getProjectDomainOrThrow(
      project,
      (domain) => domain.domainId === input.domainId
    )
  );
};

export const createUnpublishJobId = () => `unpublish-${nanoid()}`;
