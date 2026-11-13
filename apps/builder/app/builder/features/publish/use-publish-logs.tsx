import { useCallback, useEffect, useRef, useState } from "react";
import { nativeClient } from "~/shared/trpc/trpc-client";
import type { PublishValidationFinding } from "./publish-diagnostics-dialog";

export type PublishLog = {
  buildId: string;
  domains: string[];
  target: "site" | "static";
  staticName?: string;
  findings: PublishValidationFinding[];
  logHandle?: string;
  status: "pending" | "success" | "failed";
  code?: string;
  startedAt?: string;
  completedAt?: string;
  failedStage?: string;
  issues?: { severity: "error" | "warning"; message: string }[];
  issuesOmitted?: number;
  logState?: "loading" | "available" | "unavailable";
  logText?: string;
};

const decodeChunk = (chunk: string) => {
  const binary = atob(chunk.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const decodePublishLog = (chunks: string[]) => {
  const decoder = new TextDecoder();
  return chunks
    .map((chunk, index) =>
      decoder.decode(decodeChunk(chunk), { stream: index < chunks.length - 1 })
    )
    .join("");
};

export const getPublishDuration = (item: PublishLog) => {
  if (item.startedAt === undefined || item.completedAt === undefined) {
    return;
  }
  const duration = Date.parse(item.completedAt) - Date.parse(item.startedAt);
  if (Number.isFinite(duration) && duration >= 0) {
    return Math.round(duration / 1000);
  }
};

export const selectPublishLogs = (
  items: PublishLog[],
  target: "site" | "static",
  domain?: string
) =>
  items.filter(
    (item) =>
      item.target === target &&
      (domain === undefined || item.domains.includes(domain))
  );

export const usePublishLogs = (
  projectId: string,
  canViewPublishLogs: boolean
) => {
  const [items, setItems] = useState<PublishLog[]>([]);
  const itemsProjectId = useRef(projectId);
  const currentProjectId = useRef(projectId);
  currentProjectId.current = projectId;
  const projectScope = useRef({ projectId, token: 0 });
  if (projectScope.current.projectId !== projectId) {
    projectScope.current = { projectId, token: projectScope.current.token + 1 };
  }
  const scopeToken = projectScope.current.token;
  const active = useRef(true);
  const generation = useRef(0);
  const permission = useRef({ allowed: canViewPublishLogs, generation: 0 });
  if (permission.current.allowed !== canViewPublishLogs) {
    permission.current = {
      allowed: canViewPublishLogs,
      generation: permission.current.generation + 1,
    };
  }
  const loading = useRef(
    new Map<string, { permissionGeneration: number; scopeToken: number }>()
  );
  const retainedBuilds = useRef(new Set<string>());

  const isCurrent = useCallback(
    () =>
      active.current &&
      currentProjectId.current === projectId &&
      projectScope.current.token === scopeToken,
    [projectId, scopeToken]
  );

  useEffect(() => {
    active.current = true;
    generation.current += 1;
    itemsProjectId.current = projectId;
    setItems([]);
    loading.current.clear();
    retainedBuilds.current.clear();
    return () => {
      active.current = false;
      generation.current += 1;
    };
  }, [projectId]);

  useEffect(() => {
    if (canViewPublishLogs === false) {
      setItems((current) =>
        current.map((item) => ({
          ...item,
          startedAt: undefined,
          completedAt: undefined,
          failedStage: undefined,
          code: undefined,
          issues: undefined,
          issuesOmitted: undefined,
          logState: undefined,
          logText: undefined,
        }))
      );
    }
  }, [canViewPublishLogs]);

  const update = useCallback((buildId: string, change: Partial<PublishLog>) => {
    setItems((current) =>
      current.map((item) =>
        item.buildId === buildId ? { ...item, ...change } : item
      )
    );
  }, []);

  const record = useCallback(
    (item: Omit<PublishLog, "status">) => {
      if (isCurrent() === false) {
        return;
      }
      const accepted: PublishLog = {
        ...item,
        status: "pending",
        startedAt: permission.current.allowed
          ? new Date().toISOString()
          : undefined,
      };
      retainedBuilds.current.delete(item.buildId);
      retainedBuilds.current.add(item.buildId);
      setItems((current) =>
        [
          accepted,
          ...current.filter(({ buildId }) => buildId !== item.buildId),
        ].slice(0, 10)
      );
      if (retainedBuilds.current.size > 10) {
        const oldest = [...retainedBuilds.current][0];
        retainedBuilds.current.delete(oldest);
      }
      return accepted;
    },
    [isCurrent]
  );

  const complete = useCallback(
    (buildId: string, status: "success" | "failed", code?: string) => {
      if (isCurrent() && retainedBuilds.current.has(buildId)) {
        update(buildId, {
          status,
          code: permission.current.allowed ? code : undefined,
        });
      }
    },
    [isCurrent, update]
  );

  const loadLog = useCallback(
    async (item: PublishLog) => {
      if (
        isCurrent() === false ||
        retainedBuilds.current.has(item.buildId) === false ||
        item.logHandle === undefined ||
        permission.current.allowed === false ||
        item.logState === "available" ||
        (loading.current.get(item.buildId)?.permissionGeneration ===
          permission.current.generation &&
          loading.current.get(item.buildId)?.scopeToken === scopeToken)
      ) {
        return;
      }
      const currentGeneration = generation.current;
      const currentPermissionGeneration = permission.current.generation;
      const request = {
        permissionGeneration: currentPermissionGeneration,
        scopeToken,
      };
      loading.current.set(item.buildId, request);
      update(item.buildId, { logState: "loading" });
      const isReadCurrent = () =>
        generation.current === currentGeneration &&
        isCurrent() &&
        retainedBuilds.current.has(item.buildId) &&
        permission.current.allowed &&
        permission.current.generation === currentPermissionGeneration;
      try {
        let cursor: number | undefined;
        const chunks: string[] = [];
        const issues: NonNullable<PublishLog["issues"]> = [];
        let issuesOmitted = 0;
        while (isReadCurrent()) {
          const result = await nativeClient.api.publish.getLog.query({
            projectId,
            buildId: item.buildId,
            logHandle: item.logHandle,
            cursor,
          });
          if (isReadCurrent() === false) {
            return;
          }
          if (result.availability !== "available") {
            update(item.buildId, { logState: "unavailable" });
            return;
          }
          update(item.buildId, {
            startedAt: result.startedAt ?? item.startedAt,
            completedAt: result.completedAt,
            failedStage: result.failedStage,
            code: result.code,
          });
          const log = result.log;
          if (log === undefined || !("chunk" in log)) {
            update(item.buildId, { logState: "unavailable" });
            return;
          }
          chunks.push(log.chunk);
          for (const issue of log.issues ?? []) {
            if (issues.length < 20) {
              issues.push(issue);
            } else if (issue.severity === "error") {
              const warningIndex = issues.findIndex(
                ({ severity }) => severity === "warning"
              );
              if (warningIndex !== -1) {
                issues.splice(warningIndex, 1, issue);
              }
              issuesOmitted += 1;
            } else {
              issuesOmitted += 1;
            }
          }
          issuesOmitted += log.issuesOmitted ?? 0;
          if (log.complete) {
            update(item.buildId, {
              logState: "available",
              logText: decodePublishLog(chunks),
              issues: [
                ...issues.filter(({ severity }) => severity === "error"),
                ...issues.filter(({ severity }) => severity === "warning"),
              ],
              issuesOmitted,
              startedAt: result.startedAt ?? item.startedAt,
              completedAt: result.completedAt,
              failedStage: result.failedStage,
              code: result.code,
            });
            return;
          }
          if (log.nextCursor === undefined || log.nextCursor === cursor) {
            update(item.buildId, { logState: "unavailable" });
            return;
          }
          cursor = log.nextCursor;
        }
      } catch {
        if (isReadCurrent()) {
          update(item.buildId, { logState: "unavailable" });
        }
      } finally {
        if (loading.current.get(item.buildId) === request) {
          loading.current.delete(item.buildId);
        }
      }
    },
    [isCurrent, projectId, scopeToken, update]
  );

  return {
    items: itemsProjectId.current === projectId ? items : [],
    record,
    complete,
    loadLog,
    isCurrent,
  };
};
