import { nanoid } from "nanoid";
import { z } from "zod";
import * as projectApi from "@webstudio-is/project/index.server";
import {
  createProductionBuild,
  unpublishBuild,
} from "@webstudio-is/project-build/server";
import { parseDeployment } from "@webstudio-is/project-build/persistence";
import {
  templates as templateSchema,
  type Deployment,
} from "@webstudio-is/sdk";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { PrePublishAuditError } from "@webstudio-is/project-build/runtime";
import { db } from "./db";
import { validateDomain } from "./db/validate";
import {
  blockPublishAttempt,
  createPublishAttempt,
  getPublishAttempt,
  hashPublishIdempotencyKey,
  listPublishAttempts,
  toCompactPublishIssues,
  updatePublishAttempt,
} from "./publish-attempt.server";

type LoadedProject = Awaited<ReturnType<typeof projectApi.loadById>>;
type ProjectDomain = LoadedProject["domainsVirtual"][number];

const assertMutation = (result: { success: boolean; error?: string }) => {
  if (result.success === false) {
    throw new Error(result.error ?? "Domain operation failed");
  }
};

const getPublishActorLabel = async (context: AppContext) => {
  if (context.planFeatures.allowAdvancedPublishDiagnostics === false) {
    return;
  }
  if (context.authorization.type === "user") {
    const result = await context.postgrest.client
      .from("User")
      .select("username")
      .eq("id", context.authorization.userId)
      .maybeSingle();
    if (result.error) {
      throw result.error;
    }
    return result.data?.username?.trim().slice(0, 80) || "Team member";
  }
  if (context.authorization.type === "token") {
    const result = await context.postgrest.client
      .from("AuthorizationToken")
      .select("name")
      .eq("token", context.authorization.authToken)
      .maybeSingle();
    if (result.error) {
      throw result.error;
    }
    return result.data?.name.trim().slice(0, 80) || "Shared link";
  }
};

const storeBlockedPublishReport = async ({
  attemptId,
  retentionDays,
  findings,
  targetLabels,
  expiresAt,
  context,
}: {
  attemptId: string;
  retentionDays: number;
  findings: PrePublishAuditError["findings"];
  targetLabels: string[];
  expiresAt: string | null;
  context: AppContext;
}) => {
  if (retentionDays !== 1 && retentionDays !== 30) {
    return "NOT_CREATED" as const;
  }
  const result =
    await context.deployment.deploymentTrpc.storePublishReport.mutate({
      attemptId,
      retentionDays,
      report: {
        version: 1,
        attemptId,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt ?? undefined,
        outcome: "failed",
        actorLabel: await getPublishActorLabel(context),
        targetLabels,
        stages: [
          { name: "audit", status: "failed" },
          { name: "build", status: "skipped" },
          { name: "deploy", status: "skipped" },
        ],
        auditSnapshot: findings,
        diagnostics: [],
        truncation: { stagesOmitted: 0, diagnosticsOmitted: 0 },
      },
    });
  return result.success ? ("AVAILABLE" as const) : ("UNAVAILABLE" as const);
};

const storeInitialPublishReport = async ({
  attemptId,
  retentionDays,
  findings,
  targetLabels,
  expiresAt,
  context,
}: {
  attemptId: string;
  retentionDays: number;
  findings: PrePublishAuditError["findings"];
  targetLabels: string[];
  expiresAt: string | null;
  context: AppContext;
}) => {
  if (retentionDays !== 1 && retentionDays !== 30) {
    return;
  }
  await context.deployment.deploymentTrpc.storePublishReport.mutate({
    attemptId,
    retentionDays,
    report: {
      version: 1,
      attemptId,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt ?? undefined,
      outcome: "pending",
      actorLabel: await getPublishActorLabel(context),
      targetLabels,
      stages: [
        {
          name: "audit",
          status: findings.some(({ severity }) => severity === "warning")
            ? "warning"
            : "succeeded",
        },
        { name: "build", status: "pending" },
        { name: "deploy", status: "pending" },
      ],
      auditSnapshot: findings,
      diagnostics: [],
      truncation: { stagesOmitted: 0, diagnosticsOmitted: 0 },
    },
  });
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

export const listProjectPublishes = async (
  projectId: string,
  context: AppContext
) => {
  const attempts = await listPublishAttempts(projectId, context).catch(
    () => undefined
  );
  if (attempts !== undefined && attempts.length > 0) {
    return {
      publishes: attempts.map((attempt) => ({
        id: attempt.id,
        jobId: attempt.id,
        buildId: attempt.buildId ?? undefined,
        target: attempt.target.toLowerCase(),
        domains: attempt.targetLabels,
        status: attempt.status.toLowerCase(),
        summary: attempt.summary,
        auditErrorCount: attempt.auditErrorCount,
        auditWarningCount: attempt.auditWarningCount,
        diagnosticErrors: attempt.diagnosticErrors,
        diagnosticWarnings: attempt.diagnosticWarnings,
        issues: attempt.issues,
        reportAvailability: attempt.reportAvailability.toLowerCase(),
        artifact:
          attempt.target === "STATIC" && attempt.artifactName !== null
            ? {
                name: attempt.artifactName,
                readiness:
                  attempt.status === "SUCCEEDED"
                    ? "ready"
                    : attempt.status === "FAILED" ||
                      attempt.status === "BLOCKED"
                    ? "failed"
                    : "pending",
              }
            : undefined,
        createdAt: attempt.createdAt,
        completedAt: attempt.completedAt ?? undefined,
      })),
    };
  }
  const result = await context.postgrest.client
    .from("Build")
    .select("id, version, createdAt, updatedAt, deployment, publishStatus")
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
          buildId: build.id,
          version: build.version,
          target: deployment.domains.length > 1 ? "production" : "staging",
          domains: deployment.domains,
          status:
            build.publishStatus === "FAILED"
              ? "failed"
              : build.publishStatus === "PENDING"
              ? "building"
              : "succeeded",
          summary:
            build.publishStatus === "FAILED"
              ? "Publish failed"
              : build.publishStatus === "PENDING"
              ? "Publish in progress"
              : "Published successfully",
          auditErrorCount: 0,
          auditWarningCount: 0,
          diagnosticErrors: 0,
          diagnosticWarnings: 0,
          issues: [],
          reportAvailability: "not_created",
          artifact: undefined,
          createdAt: build.createdAt,
          completedAt:
            build.publishStatus === "PENDING" ? undefined : build.updatedAt,
        },
      ];
    }),
  };
};

export const getProjectPublishJob = async (
  input: { projectId: string; jobId: string },
  context: AppContext
) => {
  const attempt = await getPublishAttempt(
    { projectId: input.projectId, attemptId: input.jobId },
    context
  ).catch(() => null);
  if (attempt !== null) {
    return {
      id: attempt.id,
      jobId: attempt.id,
      buildId: attempt.buildId ?? undefined,
      status: attempt.status.toLowerCase(),
      domains: attempt.targetLabels,
      summary: attempt.summary,
      auditErrorCount: attempt.auditErrorCount,
      auditWarningCount: attempt.auditWarningCount,
      diagnosticErrors: attempt.diagnosticErrors,
      diagnosticWarnings: attempt.diagnosticWarnings,
      issues: attempt.issues,
      reportAvailability: attempt.reportAvailability.toLowerCase(),
      artifact:
        attempt.target === "STATIC" && attempt.artifactName !== null
          ? {
              name: attempt.artifactName,
              readiness:
                attempt.status === "SUCCEEDED"
                  ? "ready"
                  : attempt.status === "FAILED" || attempt.status === "BLOCKED"
                  ? "failed"
                  : "pending",
            }
          : undefined,
      createdAt: attempt.createdAt,
      completedAt: attempt.completedAt ?? undefined,
    };
  }
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
  return {
    id: publishJob.id,
    version: publishJob.version,
    status:
      deployment === undefined
        ? "removed"
        : publishJob.publishStatus === "FAILED"
        ? "failed"
        : publishJob.publishStatus === "PENDING"
        ? "building"
        : "succeeded",
    domains:
      deployment !== undefined && deployment.destination !== "static"
        ? deployment.domains
        : [],
    createdAt: publishJob.createdAt,
    completedAt:
      publishJob.publishStatus === "PENDING" ? undefined : publishJob.updatedAt,
  };
};

export const getProjectPublishReport = async (
  input: { projectId: string; attemptId: string },
  context: AppContext
) => {
  const attempt = await getPublishAttempt(input, context);
  if (attempt === null) {
    return { availability: "not_found" as const };
  }
  const currentRetention = context.planFeatures.publishLogRetentionDays ?? 0;
  const effectiveRetention = Math.min(attempt.retentionDays, currentRetention);
  if (
    context.planFeatures.allowAdvancedPublishDiagnostics === false ||
    effectiveRetention === 0
  ) {
    return { availability: "upgrade_required" as const };
  }
  const effectiveExpiresAt = Math.min(
    attempt.expiresAt === null
      ? Number.NEGATIVE_INFINITY
      : new Date(attempt.expiresAt).getTime(),
    new Date(attempt.createdAt).getTime() +
      effectiveRetention * 24 * 60 * 60 * 1000
  );
  if (attempt.expiresAt === null || effectiveExpiresAt <= Date.now()) {
    return { availability: "expired" as const };
  }
  if (attempt.reportAvailability === "PENDING") {
    return { availability: "pending" as const };
  }
  if (attempt.reportAvailability === "NOT_CREATED") {
    return { availability: "not_created" as const };
  }
  if (attempt.reportAvailability === "UNAVAILABLE") {
    return { availability: "unavailable" as const };
  }
  return context.deployment.deploymentTrpc.getPublishReport.query({
    attemptId: attempt.id,
    retentionDays: attempt.retentionDays as 1 | 30,
  });
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
    project,
    domains,
    idempotencyKey,
  }: {
    project: LoadedProject;
    domains: string[];
    idempotencyKey?: string;
  },
  context: AppContext
) => {
  const target =
    domains.length === 1 && domains[0] === project.domain
      ? "STAGING"
      : "PRODUCTION";
  const targetKeys = domains.map(
    (domain) =>
      project.domainsVirtual.find((item) => item.domain === domain)?.domainId ??
      "staging"
  );
  const { attempt, created } = await createPublishAttempt(
    {
      projectId: project.id,
      target,
      targetKeys,
      targetLabels: domains,
      idempotencyHash:
        idempotencyKey === undefined
          ? undefined
          : await hashPublishIdempotencyKey(
              JSON.stringify({ idempotencyKey, target, domains })
            ),
    },
    context
  );
  if (created === false) {
    return {
      attempt,
      build: attempt.buildId === null ? undefined : { id: attempt.buildId },
      project,
      deploymentNotImplemented: false,
    };
  }
  let build;
  try {
    build = await createProductionBuild(
      {
        projectId: project.id,
        deployment: createSaasDeployment({ project, domains }),
      },
      context
    );
  } catch (error) {
    if (error instanceof PrePublishAuditError) {
      await blockPublishAttempt(attempt.id, error.findings, context);
      error.attemptId = attempt.id;
      const reportAvailability = await storeBlockedPublishReport({
        attemptId: attempt.id,
        retentionDays: attempt.retentionDays,
        findings: error.findings,
        targetLabels: domains,
        expiresAt: attempt.expiresAt,
        context,
      }).catch(() => "UNAVAILABLE" as const);
      await updatePublishAttempt(attempt.id, { reportAvailability }, context, [
        "BLOCKED",
      ]);
    } else {
      await updatePublishAttempt(
        attempt.id,
        {
          status: "FAILED",
          failureCode: "validation_failed",
          summary: error instanceof Error ? error.message : "Publish failed",
          completedAt: new Date().toISOString(),
          reportAvailability: "UNAVAILABLE",
        },
        context,
        ["VALIDATING"]
      );
    }
    throw error;
  }
  const auditErrorCount = build.auditFindings.filter(
    ({ severity }) => severity === "error"
  ).length;
  const auditWarningCount = build.auditFindings.filter(
    ({ severity }) => severity === "warning"
  ).length;
  await storeInitialPublishReport({
    attemptId: attempt.id,
    retentionDays: attempt.retentionDays,
    findings: build.auditFindings,
    targetLabels: domains,
    expiresAt: attempt.expiresAt,
    context,
  }).catch(() => undefined);
  await updatePublishAttempt(
    attempt.id,
    {
      buildId: build.id,
      status: "QUEUED",
      summary: "Publish queued",
      auditErrorCount,
      auditWarningCount,
      issues: toCompactPublishIssues(build.auditFindings, "audit"),
      startedAt: new Date().toISOString(),
    },
    context,
    ["VALIDATING"]
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
    attemptId: attempt.id,
    reportRetentionDays: attempt.retentionDays as 0 | 1 | 30,
  });

  const deploymentNotImplemented =
    result.success === false && result.error === "NOT_IMPLEMENTED";
  if (result.success === false && deploymentNotImplemented === false) {
    await updatePublishAttempt(
      attempt.id,
      {
        status: "FAILED",
        failureCode: "dispatch_failed",
        summary: "The publish service could not start the build.",
        completedAt: new Date().toISOString(),
        reportAvailability: "UNAVAILABLE",
      },
      context,
      ["QUEUED"]
    );
    throw new Error(String(result.error ?? "Publish failed"));
  }

  return { attempt, build, project, deploymentNotImplemented };
};

export const publishStaticProject = async (
  {
    projectId,
    templates,
    name = `${projectId}-${nanoid()}.zip`,
    idempotencyKey,
  }: {
    projectId: string;
    templates: z.infer<typeof templateSchema>[];
    name?: string;
    idempotencyKey?: string;
  },
  context: AppContext
) => {
  const project = await projectApi.loadById(projectId, context);
  const { attempt, created } = await createPublishAttempt(
    {
      projectId,
      target: "STATIC",
      targetKeys: ["static"],
      targetLabels: ["Static export"],
      artifactName: name,
      idempotencyHash:
        idempotencyKey === undefined
          ? undefined
          : await hashPublishIdempotencyKey(
              JSON.stringify({
                idempotencyKey,
                target: "STATIC",
                templates,
                artifactName: name,
              })
            ),
    },
    context
  );
  if (created === false) {
    if (attempt.status === "BLOCKED" || attempt.status === "FAILED") {
      return { success: false as const, error: attempt.summary, attempt };
    }
    return {
      success: true as const,
      name: attempt.artifactName ?? name,
      build: attempt.buildId === null ? undefined : { id: attempt.buildId },
      project,
      attempt,
    };
  }
  let build;
  try {
    build = await createProductionBuild(
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
  } catch (error) {
    if (error instanceof PrePublishAuditError) {
      await blockPublishAttempt(attempt.id, error.findings, context);
      error.attemptId = attempt.id;
      const reportAvailability = await storeBlockedPublishReport({
        attemptId: attempt.id,
        retentionDays: attempt.retentionDays,
        findings: error.findings,
        targetLabels: ["Static export"],
        expiresAt: attempt.expiresAt,
        context,
      }).catch(() => "UNAVAILABLE" as const);
      await updatePublishAttempt(attempt.id, { reportAvailability }, context, [
        "BLOCKED",
      ]);
    } else {
      await updatePublishAttempt(
        attempt.id,
        {
          status: "FAILED",
          failureCode: "validation_failed",
          summary: error instanceof Error ? error.message : "Export failed",
          completedAt: new Date().toISOString(),
          reportAvailability: "UNAVAILABLE",
        },
        context,
        ["VALIDATING"]
      );
    }
    throw error;
  }
  await storeInitialPublishReport({
    attemptId: attempt.id,
    retentionDays: attempt.retentionDays,
    findings: build.auditFindings,
    targetLabels: ["Static export"],
    expiresAt: attempt.expiresAt,
    context,
  }).catch(() => undefined);
  await updatePublishAttempt(
    attempt.id,
    {
      buildId: build.id,
      status: "QUEUED",
      summary: "Static export queued",
      auditWarningCount: build.auditFindings.filter(
        ({ severity }) => severity === "warning"
      ).length,
      issues: toCompactPublishIssues(build.auditFindings, "audit"),
      startedAt: new Date().toISOString(),
    },
    context,
    ["VALIDATING"]
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
    destination: "static",
    logProjectName: `${project.title} - ${project.id}`,
    attemptId: attempt.id,
    reportRetentionDays: attempt.retentionDays as 0 | 1 | 30,
  });

  if (result.success === false) {
    await updatePublishAttempt(
      attempt.id,
      {
        status: "FAILED",
        failureCode: "dispatch_failed",
        summary: "The publish service could not start the static export.",
        completedAt: new Date().toISOString(),
        reportAvailability: "UNAVAILABLE",
      },
      context,
      ["QUEUED"]
    );
  }

  return result.success
    ? { success: true as const, name, build, project, attempt }
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

export const createUnpublishJobId = () => `unpublish-${nanoid()}`;
