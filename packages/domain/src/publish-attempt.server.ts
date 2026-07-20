import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { PrePublishAuditFinding } from "@webstudio-is/project-build/runtime";

export type PublishAttemptStatus =
  | "VALIDATING"
  | "BLOCKED"
  | "QUEUED"
  | "BUILDING"
  | "SUCCEEDED"
  | "FAILED";

export type PublishAttempt = {
  id: string;
  projectId: string;
  buildId: string | null;
  artifactName: string | null;
  target: "STAGING" | "PRODUCTION" | "STATIC";
  targetKeys: string[];
  targetLabels: string[];
  status: PublishAttemptStatus;
  failureCode: string | null;
  auditErrorCount: number;
  auditWarningCount: number;
  diagnosticErrors: number;
  diagnosticWarnings: number;
  issues: CompactPublishIssue[];
  summary: string;
  retentionDays: number;
  expiresAt: string | null;
  reportAvailability: "NOT_CREATED" | "PENDING" | "AVAILABLE" | "UNAVAILABLE";
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type CompactPublishIssue = {
  severity: "error" | "warning";
  message: string;
  source: "audit" | "build";
};

type QueryResult = { data: unknown; error: unknown };
type AttemptQuery = PromiseLike<QueryResult> & {
  select: (columns?: string) => AttemptQuery;
  eq: (column: string, value: unknown) => AttemptQuery;
  gte: (column: string, value: string) => AttemptQuery;
  in: (column: string, values: string[]) => AttemptQuery;
  order: (column: string, options: { ascending: boolean }) => AttemptQuery;
  limit: (count: number) => AttemptQuery;
  range: (from: number, to: number) => AttemptQuery;
  maybeSingle: () => AttemptQuery;
};
type AttemptTable = {
  insert: (value: Record<string, unknown>) => AttemptQuery;
  update: (value: Record<string, unknown>) => AttemptQuery;
  select: (columns?: string) => AttemptQuery;
};

const table = (context: AppContext) =>
  (
    context.postgrest.client as unknown as {
      from: (relation: string) => AttemptTable;
    }
  ).from("PublishAttempt");

const throwOnError = (result: QueryResult) => {
  if (result.error !== null) {
    throw result.error;
  }
};

const truncateSummary = (summary: string) => summary.trim().slice(0, 512);

export const toCompactPublishIssues = (
  findings: Array<{ severity: "error" | "warning" | "info"; message: string }>,
  source: CompactPublishIssue["source"]
) =>
  findings
    .filter(
      (
        finding
      ): finding is { severity: "error" | "warning"; message: string } =>
        finding.severity === "error" || finding.severity === "warning"
    )
    .slice(0, 20)
    .map(({ severity, message }) => ({
      severity,
      source,
      message:
        message.length <= 160 ? message : `${message.slice(0, 157).trimEnd()}…`,
    }));

export const hashPublishIdempotencyKey = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const createPublishAttempt = async (
  {
    projectId,
    target,
    targetKeys,
    targetLabels,
    summary = "Validating publish",
    idempotencyHash,
    artifactName,
  }: {
    projectId: string;
    target: PublishAttempt["target"];
    targetKeys: string[];
    targetLabels: string[];
    summary?: string;
    idempotencyHash?: string;
    artifactName?: string;
  },
  context: AppContext
) => {
  if (idempotencyHash !== undefined) {
    const existing = await table(context)
      .select("*")
      .eq("projectId", projectId)
      .eq("idempotencyHash", idempotencyHash)
      .maybeSingle();
    throwOnError(existing);
    if (existing.data !== null) {
      return { attempt: existing.data as PublishAttempt, created: false };
    }
  }
  const retentionDays = context.planFeatures.publishLogRetentionDays ?? 0;
  const now = Date.now();
  const expiresAt =
    retentionDays === 0
      ? null
      : new Date(now + retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const attempt: Record<string, unknown> = {
    id: crypto.randomUUID(),
    projectId,
    target,
    targetKeys,
    targetLabels,
    summary: truncateSummary(summary),
    retentionDays,
    expiresAt,
    reportAvailability: retentionDays === 0 ? "NOT_CREATED" : "PENDING",
  };
  if (idempotencyHash !== undefined) {
    attempt.idempotencyHash = idempotencyHash;
  }
  if (artifactName !== undefined) {
    attempt.artifactName = artifactName.slice(0, 255);
  }
  const result = await table(context).insert(attempt).select("*").maybeSingle();
  if (result.error !== null && idempotencyHash !== undefined) {
    const existing = await table(context)
      .select("*")
      .eq("projectId", projectId)
      .eq("idempotencyHash", idempotencyHash)
      .maybeSingle();
    throwOnError(existing);
    if (existing.data !== null) {
      return { attempt: existing.data as PublishAttempt, created: false };
    }
  }
  throwOnError(result);
  return { attempt: result.data as PublishAttempt, created: true };
};

const staleAttemptTimeoutMs = 30 * 60 * 1000;

const normalizeStaleAttempt = (attempt: PublishAttempt): PublishAttempt => {
  if (attempt.status !== "QUEUED" && attempt.status !== "BUILDING") {
    return attempt;
  }
  if (
    Date.now() - new Date(attempt.updatedAt).getTime() <
    staleAttemptTimeoutMs
  ) {
    return attempt;
  }
  return {
    ...attempt,
    status: "FAILED",
    failureCode: "workflow_timeout",
    summary: "The publish did not complete within the expected time.",
    completedAt: attempt.updatedAt,
  };
};

export const updatePublishAttempt = async (
  id: string,
  values: Partial<PublishAttempt>,
  context: AppContext,
  allowedStatuses?: PublishAttemptStatus[]
) => {
  let query = table(context).update(values).eq("id", id);
  if (allowedStatuses !== undefined) {
    query = query.in("status", allowedStatuses);
  }
  const result = await query.select("*").maybeSingle();
  throwOnError(result);
  return result.data as PublishAttempt | null;
};

const reconcileStaleAttempt = async (
  attempt: PublishAttempt,
  context: AppContext
) => {
  const normalized = normalizeStaleAttempt(attempt);
  if (normalized === attempt) {
    return attempt;
  }
  return (
    (await updatePublishAttempt(
      attempt.id,
      {
        status: normalized.status,
        failureCode: normalized.failureCode,
        summary: normalized.summary,
        completedAt: normalized.completedAt,
      },
      context,
      ["QUEUED", "BUILDING"]
    ).catch(() => null)) ?? normalized
  );
};

export const blockPublishAttempt = async (
  id: string,
  findings: PrePublishAuditFinding[],
  context: AppContext
) => {
  const errors = findings.filter(({ severity }) => severity === "error");
  const warnings = findings.filter(({ severity }) => severity === "warning");
  return updatePublishAttempt(
    id,
    {
      status: "BLOCKED",
      failureCode: "audit_failed",
      auditErrorCount: errors.length,
      auditWarningCount: warnings.length,
      issues: toCompactPublishIssues(findings, "audit"),
      summary: truncateSummary(
        errors[0]?.message ?? "Publish was blocked by the pre-publish audit."
      ),
      completedAt: new Date().toISOString(),
    },
    context,
    ["VALIDATING"]
  );
};

export const listPublishAttempts = async (
  projectId: string,
  context: AppContext
) => {
  const activityRetentionDays =
    context.planFeatures.publishActivityRetentionDays ?? 0;
  if (activityRetentionDays === 0) {
    const result = await table(context)
      .select("*")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: false })
      .limit(25);
    throwOnError(result);
    const attempts = await Promise.all(
      (result.data as PublishAttempt[]).map((attempt) =>
        reconcileStaleAttempt(attempt, context)
      )
    );
    const seen = new Set<string>();
    return attempts.flatMap((attempt) => {
      const unseenIndexes = attempt.targetKeys.flatMap((key, index) =>
        seen.has(key) ? [] : [index]
      );
      unseenIndexes.forEach((index) => seen.add(attempt.targetKeys[index]!));
      if (unseenIndexes.length === 0) {
        return [];
      }
      return [
        {
          ...attempt,
          targetKeys: unseenIndexes.map((index) => attempt.targetKeys[index]!),
          targetLabels: unseenIndexes.map(
            (index) => attempt.targetLabels[index]!
          ),
        },
      ];
    });
  }

  const cutoff = new Date(
    Date.now() - activityRetentionDays * 24 * 60 * 60 * 1000
  ).toISOString();
  const attempts: PublishAttempt[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const result = await table(context)
      .select("*")
      .eq("projectId", projectId)
      .gte("createdAt", cutoff)
      .order("createdAt", { ascending: false })
      .range(from, from + pageSize - 1);
    throwOnError(result);
    const page = result.data as PublishAttempt[];
    attempts.push(
      ...(await Promise.all(
        page.map((attempt) => reconcileStaleAttempt(attempt, context))
      ))
    );
    if (page.length < pageSize) {
      break;
    }
  }
  return attempts;
};

export const getPublishAttempt = async (
  { projectId, attemptId }: { projectId: string; attemptId: string },
  context: AppContext
) => {
  const result = await table(context)
    .select("*")
    .eq("projectId", projectId)
    .eq("id", attemptId)
    .maybeSingle();
  throwOnError(result);
  const attempt = result.data as PublishAttempt | null;
  return attempt === null ? null : reconcileStaleAttempt(attempt, context);
};
