import { useCallback, useEffect, useRef, useState } from "react";
import { nativeClient } from "~/shared/trpc/trpc-client";
import type { PublishValidationFinding } from "./publish-validation-results";

export type PublishSessionItem = {
  attemptId: string;
  buildId: string;
  domains: string[];
  target: "site" | "static";
  findings: PublishValidationFinding[];
  availability: "pending" | "unavailable" | "available";
  outcome?: "succeeded" | "failed";
  logAvailability?: "available" | "unavailable";
  startedAt?: string;
  completedAt?: string;
  failureReason?: string;
  failedStage?: string;
  issues?: { severity: "error" | "warning"; message: string }[];
  issuesOmitted?: number;
  logState?: "loading" | "available" | "unavailable";
  logText?: string;
  executionHandle?: string;
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

export const getPublishDuration = (item: PublishSessionItem) => {
  if (item.startedAt === undefined || item.completedAt === undefined) {
    return;
  }
  const duration = Date.parse(item.completedAt) - Date.parse(item.startedAt);
  if (Number.isFinite(duration) && duration >= 0) {
    return Math.round(duration / 1000);
  }
};

export const selectPublishSessionItems = (
  items: PublishSessionItem[],
  target: "site" | "static",
  domain?: string
) =>
  items.filter(
    (item) =>
      item.target === target &&
      (domain === undefined || item.domains.includes(domain))
  );

export const usePublishSession = (projectId: string, isPro: boolean) => {
  const [items, setItems] = useState<PublishSessionItem[]>([]);
  const itemsProjectId = useRef(projectId);
  const currentProjectId = useRef(projectId);
  currentProjectId.current = projectId;
  const generation = useRef(0);
  const retainedAttempts = useRef<string[]>([]);
  const plan = useRef({ isPro, generation: 0 });
  if (plan.current.isPro !== isPro) {
    plan.current = { isPro, generation: plan.current.generation + 1 };
  }
  const canReadLogs = () => plan.current.isPro;
  const loadingLogs = useRef(new Set<string>());

  useEffect(() => {
    generation.current += 1;
    itemsProjectId.current = projectId;
    setItems([]);
    retainedAttempts.current = [];
    loadingLogs.current.clear();
    return () => {
      generation.current += 1;
    };
  }, [projectId]);

  useEffect(() => {
    if (isPro === false) {
      setItems((current) =>
        current.map((item) => ({
          ...item,
          logText: undefined,
          logState: undefined,
        }))
      );
    }
  }, [isPro]);

  const update = useCallback(
    (attemptId: string, change: Partial<PublishSessionItem>) => {
      setItems((current) =>
        current.map((item) =>
          item.attemptId === attemptId ? { ...item, ...change } : item
        )
      );
    },
    []
  );

  const record = useCallback(
    (item: Omit<PublishSessionItem, "availability">) => {
      if (currentProjectId.current !== projectId) {
        return;
      }
      const currentGeneration = generation.current;
      const accepted: PublishSessionItem = { ...item, availability: "pending" };
      retainedAttempts.current = [
        item.attemptId,
        ...retainedAttempts.current.filter(
          (attemptId) => attemptId !== item.attemptId
        ),
      ].slice(0, 10);
      setItems((current) =>
        [
          accepted,
          ...current.filter(({ attemptId }) => attemptId !== item.attemptId),
        ].slice(0, 10)
      );
      if (item.executionHandle === undefined) {
        update(item.attemptId, { availability: "unavailable" });
        return;
      }

      const poll = async () => {
        let cursor: number | undefined;
        const chunks: string[] = [];
        let bytesGeneration = canReadLogs()
          ? plan.current.generation
          : undefined;
        let issues: NonNullable<PublishSessionItem["issues"]> = [];
        let issuesOmitted = 0;
        while (
          generation.current === currentGeneration &&
          currentProjectId.current === projectId &&
          retainedAttempts.current.includes(item.attemptId)
        ) {
          try {
            const response = await nativeClient.domain.publishExecution.query({
              projectId,
              buildId: item.buildId,
              attemptId: item.attemptId,
              executionHandle: item.executionHandle!,
              cursor,
            });
            if (
              generation.current !== currentGeneration ||
              currentProjectId.current !== projectId
            ) {
              return;
            }
            if (response.success === false) {
              update(item.attemptId, { availability: "unavailable" });
              return;
            }
            const result = response.result;
            if (result.availability === "available") {
              if (
                bytesGeneration !== plan.current.generation ||
                canReadLogs() === false
              ) {
                chunks.length = 0;
                bytesGeneration = undefined;
              }
              const log = result.log;
              if (log?.issues !== undefined) {
                const combined = [...issues, ...log.issues];
                issues = [
                  ...combined.filter(({ severity }) => severity === "error"),
                  ...combined.filter(({ severity }) => severity === "warning"),
                ].slice(0, 20);
                issuesOmitted += Math.max(0, combined.length - 20);
              }
              issuesOmitted += log?.issuesOmitted ?? 0;
              if (
                log !== undefined &&
                "chunk" in log &&
                bytesGeneration !== undefined &&
                canReadLogs()
              ) {
                chunks.push(log.chunk);
              }
              update(item.attemptId, {
                availability: "available",
                outcome: result.outcome,
                logAvailability: result.logAvailability,
                startedAt: result.startedAt,
                completedAt: result.completedAt,
                failureReason: result.failureReason,
                failedStage: result.failedStage,
                issues: [...issues],
                issuesOmitted,
                logState:
                  canReadLogs() && result.logAvailability === "available"
                    ? "loading"
                    : undefined,
              });
              if (
                log?.complete === false &&
                log.nextCursor !== undefined &&
                log.nextCursor !== cursor
              ) {
                cursor = log.nextCursor;
                continue;
              }
              if (
                canReadLogs() &&
                log?.complete &&
                bytesGeneration === plan.current.generation &&
                chunks.length > 0
              ) {
                update(item.attemptId, {
                  logState: "available",
                  logText: decodePublishLog(chunks),
                });
              } else {
                update(item.attemptId, { logState: undefined });
              }
              return;
            }
            if (result.availability === "unavailable") {
              update(item.attemptId, { availability: "unavailable" });
              return;
            }
          } catch {
            update(item.attemptId, { availability: "unavailable" });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      };
      void poll();
    },
    [projectId, update]
  );

  const loadLog = useCallback(
    async (item: PublishSessionItem) => {
      if (
        currentProjectId.current !== projectId ||
        retainedAttempts.current.includes(item.attemptId) === false ||
        item.executionHandle === undefined ||
        item.logAvailability !== "available" ||
        canReadLogs() === false ||
        item.logState === "loading" ||
        item.logState === "available" ||
        loadingLogs.current.has(item.attemptId)
      ) {
        return;
      }
      const currentGeneration = generation.current;
      const currentPlanGeneration = plan.current.generation;
      loadingLogs.current.add(item.attemptId);
      update(item.attemptId, { logState: "loading" });
      try {
        let cursor: number | undefined;
        const chunks: string[] = [];
        while (
          generation.current === currentGeneration &&
          currentProjectId.current === projectId &&
          retainedAttempts.current.includes(item.attemptId)
        ) {
          const response = await nativeClient.domain.publishExecution.query({
            projectId,
            buildId: item.buildId,
            attemptId: item.attemptId,
            executionHandle: item.executionHandle,
            cursor,
          });
          if (
            generation.current !== currentGeneration ||
            currentProjectId.current !== projectId
          ) {
            return;
          }
          if (
            canReadLogs() === false ||
            plan.current.generation !== currentPlanGeneration
          ) {
            return;
          }
          if (
            response.success === false ||
            response.result.availability !== "available" ||
            response.result.log === undefined ||
            !("encoding" in response.result.log) ||
            response.result.log.encoding !== "base64url"
          ) {
            update(item.attemptId, { logState: "unavailable" });
            return;
          }
          const log = response.result.log;
          chunks.push(log.chunk);
          if (log.complete) {
            update(item.attemptId, {
              logState: "available",
              logText: decodePublishLog(chunks),
            });
            return;
          }
          if (log.nextCursor === undefined || log.nextCursor === cursor) {
            update(item.attemptId, { logState: "unavailable" });
            return;
          }
          cursor = log.nextCursor;
        }
      } catch {
        if (
          generation.current === currentGeneration &&
          plan.current.generation === currentPlanGeneration
        ) {
          update(item.attemptId, { logState: "unavailable" });
        }
      } finally {
        loadingLogs.current.delete(item.attemptId);
      }
    },
    [projectId, update]
  );

  return {
    items: itemsProjectId.current === projectId ? items : [],
    record,
    loadLog,
  };
};
