import { z } from "zod";
import * as projectApi from "@webstudio-is/project/index.server";
import {
  createProductionBuild,
  unpublishBuild,
} from "@webstudio-is/project-build/server";
import { parseDeployment } from "@webstudio-is/project-build/persistence";
import {
  createId,
  getPublishTarget,
  publishedDeploymentDestination,
  templates as templateSchema,
  type Deployment,
  type PublishTarget,
} from "@webstudio-is/sdk";
import {
  authorizeProject,
  AuthorizationError,
  getProjectPlanFeatures,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { PrePublishAuditError } from "@webstudio-is/project-build/runtime";
import { db } from "./db";
import { validateDomain } from "./db/validate";

type LoadedProject = Awaited<ReturnType<typeof projectApi.loadById>>;
type ProjectDomain = LoadedProject["domainsVirtual"][number];
export const getVisiblePublishFindings = (
  findings: PrePublishAuditError["findings"],
  allowPublishLogs: boolean | undefined
) =>
  allowPublishLogs === true
    ? findings
    : findings.map(({ message, location, ...finding }) => ({
        ...finding,
        message: message.slice(0, 160),
        location: {},
      }));

const publishResponseDiagnosticHeaders = [
  "content-type",
  "x-vercel-id",
  "x-request-id",
  "cf-ray",
] as const;

const getPublishResponseEnvelopeShape = (value: unknown) => {
  if (typeof value !== "object" || value === null) {
    return "other";
  }
  if ("result" in value) {
    return "result";
  }
  if ("error" in value) {
    return "error";
  }
  return "other";
};

/** Capture only safe metadata from the remote publish response. */
export const getDeploymentPublishErrorDiagnostics = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("meta" in error)) {
    return;
  }
  const meta = error.meta;
  if (typeof meta !== "object" || meta === null) {
    return;
  }

  const response = "response" in meta ? meta.response : undefined;
  const responseJSON = "responseJSON" in meta ? meta.responseJSON : undefined;
  if (!(response instanceof Response) && responseJSON === undefined) {
    return;
  }
  const headers: Record<string, string> = {};
  if (response instanceof Response) {
    for (const name of publishResponseDiagnosticHeaders) {
      const value = response.headers.get(name);
      if (value !== null) {
        headers[name] = value.slice(0, 128);
      }
    }
  }

  return {
    ...(response instanceof Response ? { status: response.status } : {}),
    headers,
    responseJson: {
      present: responseJSON !== undefined,
      ...(Array.isArray(responseJSON)
        ? { batchSize: responseJSON.length }
        : {}),
      envelopes: Array.isArray(responseJSON)
        ? responseJSON.slice(0, 20).map(getPublishResponseEnvelopeShape)
        : responseJSON === undefined
          ? []
          : [getPublishResponseEnvelopeShape(responseJSON)],
    },
  };
};

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
  target: PublishTarget
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

export const getPublishTargetForDomains = (
  project: LoadedProject,
  domains: string[]
): PublishTarget =>
  domains.some((domain) => domain !== project.domain)
    ? "production"
    : "staging";

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

export const listProjectPublishes = async (
  projectId: string,
  context: AppContext
) => {
  const result = await context.postgrest.client
    .from("Build")
    .select("id, version, createdAt, deployment")
    .eq("projectId", projectId)
    .not("deployment", "is", null)
    .order("createdAt", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  return {
    publishes: result.data.flatMap((build) => {
      const deployment = parseDeployment(build.deployment);
      if (deployment === undefined || deployment.destination === "static") {
        return [];
      }
      return [
        {
          id: build.id,
          jobId: build.id,
          version: build.version,
          target: getPublishTarget(deployment),
          domains: deployment.domains,
          createdAt: build.createdAt,
        },
      ];
    }),
  };
};

export const getProjectPublishJob = async (
  input: { projectId: string; jobId: string; logHandle?: string },
  context: AppContext
) => {
  const result = await context.postgrest.client
    .from("Build")
    .select("id, version, createdAt, updatedAt, deployment, publishStatus")
    .eq("projectId", input.projectId)
    .eq("id", input.jobId)
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }
  const publishJob = result.data;
  if (publishJob === null) {
    return undefined;
  }

  const deployment = parseDeployment(publishJob.deployment);
  const hostedDeployment =
    deployment === undefined || deployment.destination === "static"
      ? undefined
      : deployment;
  const target =
    hostedDeployment === undefined
      ? undefined
      : getPublishTarget(hostedDeployment);
  const hostedDomain =
    hostedDeployment?.assetsDomain ?? hostedDeployment?.projectDomain;
  const stagingDomain =
    target === "staging" &&
    hostedDomain !== undefined &&
    hostedDeployment?.domains.includes(hostedDomain)
      ? hostedDomain
      : undefined;
  let status: "removed" | "success" | "failed" | "pending" =
    deployment === undefined
      ? "removed"
      : publishJob.publishStatus === "PUBLISHED"
        ? "success"
        : publishJob.publishStatus === "FAILED"
          ? "failed"
          : "pending";
  let completedAt =
    status === "success" || status === "failed"
      ? publishJob.updatedAt
      : undefined;
  let code: string | undefined;
  if (input.logHandle !== undefined && status !== "removed") {
    try {
      const result =
        await context.deployment.deploymentTrpc.getPublishLog.query({
          buildId: publishJob.id,
          logHandle: input.logHandle,
          includeLog: false,
        });
      if (result.availability === "pending") {
        status = "pending";
        completedAt = undefined;
      }
      if (result.availability === "available") {
        status = result.outcome === "succeeded" ? "success" : "failed";
        completedAt = result.completedAt;
        code = result.outcome === "failed" ? result.code : undefined;
      }
    } catch {
      // The durable Build status remains available when GitHub status is not.
    }
  }
  return {
    id: publishJob.id,
    version: publishJob.version,
    status,
    ...(code === undefined ? {} : { code }),
    target,
    domains: hostedDeployment?.domains ?? [],
    ...(stagingDomain === undefined
      ? {}
      : {
          stagingUrl: `https://${
            stagingDomain.includes(".")
              ? stagingDomain
              : `${stagingDomain}.${context.deployment.env.PUBLISHER_HOST}`
          }`,
        }),
    createdAt: publishJob.createdAt,
    completedAt,
  };
};

export const getProjectPublishLog = async (
  input: {
    projectId: string;
    buildId: string;
    logHandle: string;
    cursor?: number;
  },
  context: AppContext
) => {
  const allowed = await authorizeProject.hasProjectPermit(
    { projectId: input.projectId, permit: "view" },
    context
  );
  if (allowed === false) {
    throw new AuthorizationError("You don't have access to this project");
  }
  const build = await context.postgrest.client
    .from("Build")
    .select("id")
    .eq("projectId", input.projectId)
    .eq("id", input.buildId)
    .maybeSingle();
  if (build.error) {
    throw build.error;
  }
  if (build.data === null) {
    return { availability: "unavailable" as const };
  }
  const { allowPublishLogs } = await getProjectPlanFeatures(
    input.projectId,
    context
  );
  if (allowPublishLogs !== true) {
    return { availability: "unavailable" as const };
  }
  return await context.deployment.deploymentTrpc.getPublishLog.query({
    buildId: input.buildId,
    logHandle: input.logHandle,
    cursor: input.cursor,
    includeLog: true,
  });
};

const createPublishedDeployment = ({
  project,
  domains,
  target,
}: {
  project: LoadedProject;
  domains: string[];
  target: PublishTarget;
}): Deployment => ({
  destination: publishedDeploymentDestination,
  target,
  domains,
  assetsDomain: project.domain,
  excludeWstdDomainFromSearch: project.domainsVirtual.some(
    (domain) => domain.status === "ACTIVE" && domain.verified
  ),
});

export const publishProject = async (
  {
    project,
    domains,
    target,
  }: {
    project: LoadedProject;
    domains: string[];
    target: PublishTarget;
  },
  context: AppContext
) => {
  const build = await createProductionBuild(
    {
      projectId: project.id,
      deployment: createPublishedDeployment({
        project,
        domains,
        target,
      }),
    },
    context
  );
  const findings = build.auditFindings;
  const { deploymentTrpc, env } = context.deployment;

  if (env.BUILDER_ORIGIN === undefined) {
    throw new Error("Missing env.BUILDER_ORIGIN");
  }

  let result: Awaited<ReturnType<typeof deploymentTrpc.publish.mutate>>;
  try {
    result = await deploymentTrpc.publish.mutate({
      builderOrigin: env.BUILDER_ORIGIN,
      githubSha: env.GITHUB_SHA,
      buildId: build.id,
      branchName: env.GITHUB_REF_NAME,
      destination: publishedDeploymentDestination,
      logProjectName: `${project.title} - ${project.id}`,
    });
  } catch (error) {
    const diagnostics = getDeploymentPublishErrorDiagnostics(error);
    if (diagnostics !== undefined) {
      console.error("Deployment publish request failed", diagnostics);
    }
    throw error;
  }

  const deploymentNotImplemented =
    result.success === false && result.error === "NOT_IMPLEMENTED";
  if (result.success === false && deploymentNotImplemented === false) {
    throw new Error(String(result.error ?? "Publish failed"));
  }

  return {
    build,
    project,
    logHandle: result.success ? result.logHandle : undefined,
    findings,
    deploymentNotImplemented,
  };
};

export const publishStaticProject = async (
  {
    projectId,
    templates,
    project: loadedProject,
    name = `${projectId}-${createId("nano")}.zip`,
  }: {
    projectId: string;
    templates: z.infer<typeof templateSchema>[];
    project?: LoadedProject;
    name?: string;
  },
  context: AppContext
) => {
  const project =
    loadedProject ?? (await projectApi.loadById(projectId, context));
  const build = await createProductionBuild(
    {
      projectId,
      deployment: {
        destination: "static",
        name,
        assetsDomain: project.domain,
        templates,
      },
    },
    context
  );

  const findings = build.auditFindings;
  const { deploymentTrpc, env } = context.deployment;

  if (env.BUILDER_ORIGIN === undefined) {
    throw new Error("Missing env.BUILDER_ORIGIN");
  }

  const result = await deploymentTrpc.publish.mutate({
    builderOrigin: env.BUILDER_ORIGIN,
    githubSha: env.GITHUB_SHA,
    buildId: build.id,
    branchName: env.GITHUB_REF_NAME,
    destination: "static",
    logProjectName: `${project.title} - ${project.id}`,
  });

  return result.success
    ? {
        success: true as const,
        name,
        build,
        project,
        logHandle: result.logHandle,
        findings,
      }
    : result;
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
    await unpublishBuild({ projectId, domain: dbDomain }, context);
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
  assertMutation(await createProjectDomainResult(input, context));
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

export const createProjectDomainResult = async (
  input: { projectId: string; domain: string },
  context: AppContext
) => {
  return await db.create(input, context);
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
  assertMutation(await deleteProjectDomainResult(input, context));
  return { status: "deleted" as const };
};

export const deleteProjectDomainResult = async (
  input: { projectId: string; domainId: string },
  context: AppContext
) => {
  return await db.remove(input, context);
};

export const verifyProjectDomain = async (
  input: { projectId: string; domainId: string },
  context: AppContext
) => {
  assertMutation(await verifyProjectDomainResult(input, context));
  const project = await projectApi.loadById(input.projectId, context);
  return serializeProjectDomain(
    getProjectDomainOrThrow(
      project,
      (domain) => domain.domainId === input.domainId
    )
  );
};

export const verifyProjectDomainResult = async (
  input: { projectId: string; domainId: string },
  context: AppContext
) => {
  return await db.verify(input, context);
};
