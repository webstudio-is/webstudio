import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $project } from "~/shared/sync/data-stores";
import { $publishDialog } from "~/builder/shared/nano-states";
import { nativeClient } from "~/shared/trpc/trpc-client";
import {
  PENDING_TIMEOUT,
  getPublishStatusAndText,
  getStaticPublishStatusAndText,
} from "./publish-status";
import type { PublishValidationFinding } from "./diagnostics";

const COUNTDOWN_DURATION = 60_000;

const STATUS_REFRESH_RETRY_DELAY = 5_000;

const STATUS_REFRESH_MAX_ATTEMPTS = 3;

type PublishExecution = {
  projectId: string;
  buildId: string;
  logHandle?: string;
  target?: "site" | "static";
};

export const usePublishProgress = (projectId: Project["id"]) => {
  const projectScope = useRef({ projectId, token: 0 });
  if (projectScope.current.projectId !== projectId) {
    projectScope.current = { projectId, token: projectScope.current.token + 1 };
  }
  const scopeToken = projectScope.current.token;
  const manualValidationFindings = useManualValidationFindings();
  const invalidateManualFindings = manualValidationFindings.invalidate;
  const [startedAt, setStartedAt] = useState<number>();
  const [showCountdown, setShowCountdown] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDiagnostics, setPublishDiagnostics] = useState<
    Record<
      "site" | "static",
      {
        domains: string[];
        findings: PublishValidationFinding[];
        rejected?: boolean;
      }
    >
  >({
    site: { domains: [], findings: [] },
    static: { domains: [], findings: [] },
  });
  const publishDiagnosticsSession = useRef({ site: 0, static: 0 });
  const [publishErrorState, setPublishErrorState] = useState<{
    value: JSX.Element | string;
    source: "request" | "transport" | "status";
    domains?: string[];
    buildId?: string;
  }>();
  const [now, setNow] = useState(Date.now);
  const isMounted = useRef(false);
  const requestBaselineBuildId = useRef<string>();
  const hasStartedPublishRequest = useRef(false);
  const refreshGeneration = useRef(0);
  const recoveredPoll = useRef<{
    generation: number;
    promise: Promise<void>;
  }>();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    publishDiagnosticsSession.current.site += 1;
    publishDiagnosticsSession.current.static += 1;
    setPublishDiagnostics({
      site: { domains: [], findings: [] },
      static: { domains: [], findings: [] },
    });
    setPublishErrorState(undefined);
    setIsPublishing(false);
    invalidateManualFindings();
  }, [projectId, invalidateManualFindings]);

  const isCurrentProject = useCallback(
    () =>
      isMounted.current &&
      $project.get()?.id === projectId &&
      projectScope.current.token === scopeToken,
    [projectId, scopeToken]
  );

  const beginPopoverRefresh = useCallback(() => {
    refreshGeneration.current += 1;
    return refreshGeneration.current;
  }, []);

  const isRefreshCurrent = useCallback(
    (generation: number) =>
      isCurrentProject() && refreshGeneration.current === generation,
    [isCurrentProject]
  );

  const setPublishError = (
    value: JSX.Element | string | undefined,
    domains?: string[]
  ) => {
    setPublishErrorState(
      value === undefined ? undefined : { value, source: "request", domains }
    );
  };

  const setPublishStatusError = useCallback(
    (value: JSX.Element | string, buildId?: string) => {
      setPublishErrorState({ value, source: "status", buildId });
    },
    []
  );

  const clearErrors = useCallback(() => {
    setPublishErrorState(undefined);
  }, []);

  const beginPublishDiagnostics = useCallback(
    (domains: string[] = [], target: "site" | "static" = "site") => {
      const session = ++publishDiagnosticsSession.current[target];
      setPublishDiagnostics((current) => ({
        ...current,
        [target]: { domains, findings: [] },
      }));
      const setFindings = (
        findings: SetStateAction<PublishValidationFinding[]>
      ) => {
        if (publishDiagnosticsSession.current[target] === session) {
          setPublishDiagnostics((current) => ({
            ...current,
            [target]: {
              domains,
              findings:
                typeof findings === "function"
                  ? findings(current[target].findings)
                  : findings,
            },
          }));
        }
      };
      return {
        isCurrent: () => publishDiagnosticsSession.current[target] === session,
        setFindings,
        finish: (findings?: SetStateAction<PublishValidationFinding[]>) => {
          if (findings !== undefined) {
            setFindings(findings);
          }
          if (publishDiagnosticsSession.current[target] === session) {
            setPublishDiagnostics((current) => ({
              ...current,
              [target]: { ...current[target], rejected: true },
            }));
            publishDiagnosticsSession.current[target] += 1;
          }
        },
      };
    },
    []
  );

  const reconcileRefreshedProject = useCallback((project: Project) => {
    const build = project.latestBuildVirtual;
    if (build == null) {
      setPublishErrorState((current) =>
        current?.source === "status" ? undefined : current
      );
      return;
    }
    const { status, statusText } = getPublishStatusAndText(build);
    const isNewBuild =
      build.buildId !== undefined &&
      build.buildId !== requestBaselineBuildId.current;
    if (status === "FAILED") {
      if (hasStartedPublishRequest.current && isNewBuild) {
        setPublishErrorState({
          value: statusText,
          source: "status",
          buildId: build.buildId,
        });
      }
    } else {
      setPublishErrorState((current) =>
        current?.source === "status" ||
        (isNewBuild && current?.source === "transport")
          ? undefined
          : current
      );
    }
  }, []);

  const watchPendingPublish = useCallback(
    (
      refresh: () => Promise<Project | undefined>,
      generation = refreshGeneration.current,
      execution?: PublishExecution,
      onResult?: (
        result: Awaited<ReturnType<typeof waitForPublishStatus>>
      ) => void
    ) => {
      if (recoveredPoll.current?.generation === generation) {
        return recoveredPoll.current.promise;
      }
      const polling = waitForPublishStatus(
        refresh,
        () => isRefreshCurrent(generation),
        undefined,
        execution
      )
        .then((result) => {
          if (isRefreshCurrent(generation) === false) {
            return;
          }
          if (execution?.target !== "static") {
            reportPublishResult({
              result,
              buildId: execution?.buildId,
              setPublishError: setPublishStatusError,
              isCurrentProject,
            });
          } else if (result?.status === "FAILED") {
            toast.error(result.statusText);
          }
          onResult?.(result);
        })
        .finally(() => {
          if (recoveredPoll.current?.promise === polling) {
            recoveredPoll.current = undefined;
          }
        });
      recoveredPoll.current = { generation, promise: polling };
      return polling;
    },
    [isCurrentProject, isRefreshCurrent, setPublishStatusError]
  );

  useEffect(() => {
    if (isPublishing === false || showCountdown === false) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isPublishing, showCountdown]);

  const countdown =
    isPublishing && showCountdown && startedAt !== undefined
      ? Math.max(0, Math.ceil((COUNTDOWN_DURATION - (now - startedAt)) / 1000))
      : undefined;

  const dismissCountdown = useCallback(() => setShowCountdown(false), []);

  const start = (
    publish: () => Promise<void>,
    {
      target = "site",
      domains,
      onError,
    }: {
      target?: "site" | "static";
      domains?: string[];
      onError?: (message: string) => void;
    } = {}
  ) => {
    const startedAt = Date.now();
    if (target === "site") {
      hasStartedPublishRequest.current = true;
      requestBaselineBuildId.current =
        $project.get()?.latestBuildVirtual?.buildId;
      setPublishErrorState(undefined);
    }
    setStartedAt(startedAt);
    setNow(startedAt);
    setShowCountdown(true);
    setIsPublishing(true);
    publish()
      .catch((error) => {
        if (target === "site") {
          console.error(error);
        }
        const message =
          error instanceof Error ? error.message : "Unknown error";
        if (isCurrentProject()) {
          onError?.(message);
          if (target === "site") {
            setPublishErrorState({
              value: message,
              source: "transport",
              domains,
            });
          }
          if (target === "static" || $publishDialog.get() !== "publish") {
            toast.error(target === "static" ? message.slice(0, 200) : message);
          }
        }
      })
      .finally(() => {
        if (isCurrentProject()) {
          setIsPublishing(false);
        }
      });
  };

  return {
    manualValidationFindings,
    isPublishing,
    publishFindings: publishDiagnostics.site.findings,
    publishDiagnostics,
    beginPublishDiagnostics,
    publishError: publishErrorState?.value,
    publishErrorSource: publishErrorState?.source,
    publishErrorDomains: publishErrorState?.domains,
    publishErrorBuildId: publishErrorState?.buildId,
    setPublishError,
    setPublishStatusError,
    clearErrors,
    isCurrentProject,
    beginPopoverRefresh,
    isRefreshCurrent,
    reconcileRefreshedProject,
    watchPendingPublish,
    countdown,
    start,
    dismissCountdown,
  };
};

export const waitForPublishStatus = async (
  refresh: () => Promise<Project | undefined>,
  isCurrentProject: () => boolean,
  previousBuildId?: string,
  execution?: PublishExecution,
  getJob: (input: {
    projectId: string;
    jobId: string;
    logHandle: string;
  }) => Promise<{ status: string; code?: string }> = nativeClient.api.publish
    .getJob.query
) => {
  let sleepTime = 15000;
  const timeToFinish = Date.now() + PENDING_TIMEOUT + 2 * sleepTime;

  while (Date.now() < timeToFinish && isCurrentProject()) {
    try {
      let runnerPending = false;
      if (execution?.logHandle !== undefined) {
        try {
          const job = await getJob({
            projectId: execution.projectId,
            jobId: execution.buildId,
            logHandle: execution.logHandle,
          });
          if (isCurrentProject() === false) {
            return;
          }
          if (job.status === "failed") {
            return {
              status: "FAILED" as const,
              statusText: "Publish failed",
              code: job.code,
            };
          }
          runnerPending = job.status === "pending";
        } catch (error) {
          console.error("Could not refresh publish status", error);
        }
      }
      const refreshedProject = await refresh();
      if (isCurrentProject() === false) {
        return;
      }
      const buildId =
        execution?.target === "static"
          ? refreshedProject?.latestStaticBuild?.buildId
          : refreshedProject?.latestBuildVirtual?.buildId;
      if (
        refreshedProject !== undefined &&
        (previousBuildId === undefined || buildId !== previousBuildId) &&
        (execution === undefined || buildId === execution.buildId)
      ) {
        const { statusText, status } =
          execution?.target === "static" &&
          refreshedProject.latestStaticBuild != null
            ? getStaticPublishStatusAndText(refreshedProject.latestStaticBuild)
            : refreshedProject.latestBuildVirtual != null
              ? getPublishStatusAndText(refreshedProject.latestBuildVirtual)
              : {
                  statusText: "Not published",
                  status: "PENDING" as const,
                };

        if (!runnerPending && (status === "PUBLISHED" || status === "FAILED")) {
          return { status, statusText };
        }
      }
    } catch (error) {
      if (isCurrentProject() === false) {
        return;
      }
      // A failed status request should not stop watching an ongoing publish.
      console.error("Could not refresh publish status", error);
    }

    await new Promise((resolve) => setTimeout(resolve, sleepTime));
    sleepTime = Math.max(5000, sleepTime - 5000);
  }
};

export const refreshUntilSuccess = async (
  refresh: (showError: boolean) => Promise<Project | undefined>,
  isOpen: () => boolean,
  onPending: (project: Project) => void = () => {},
  hasSessionPending: (project: Project) => boolean = () => false
) => {
  for (
    let attempt = 1;
    attempt <= STATUS_REFRESH_MAX_ATTEMPTS && isOpen();
    attempt++
  ) {
    const isLastAttempt = attempt === STATUS_REFRESH_MAX_ATTEMPTS;
    try {
      const refreshedProject = await refresh(isLastAttempt);
      if (refreshedProject !== undefined) {
        if (
          (refreshedProject.latestBuildVirtual != null &&
            getPublishStatusAndText(refreshedProject.latestBuildVirtual)
              .status === "PENDING") ||
          hasSessionPending(refreshedProject)
        ) {
          onPending(refreshedProject);
        }
        return;
      }
    } catch (error) {
      console.error("Could not refresh publish status", error);
      if (isLastAttempt && isOpen()) {
        toast.error(error instanceof Error ? error.message : "Unknown error");
      }
    }

    if (isLastAttempt === false && isOpen()) {
      await new Promise((resolve) =>
        setTimeout(resolve, STATUS_REFRESH_RETRY_DELAY)
      );
    }
  }
};

export const reportPublishResult = ({
  result,
  buildId,
  timesLeft,
  maxDailyPublishesPerUser,
  setPublishError,
  isCurrentProject = () => true,
}: {
  result: Awaited<ReturnType<typeof waitForPublishStatus>>;
  buildId?: string;
  timesLeft?: number;
  maxDailyPublishesPerUser?: number;
  setPublishError: (error: string | JSX.Element, buildId?: string) => void;
  isCurrentProject?: () => boolean;
}) => {
  if (isCurrentProject() === false) {
    return;
  }
  if (result?.status === "PUBLISHED") {
    if ($publishDialog.get() === "none") {
      toast.success(
        <>
          The project has been successfully published.{" "}
          {timesLeft !== undefined &&
            maxDailyPublishesPerUser !== undefined &&
            timesLeft > 0 &&
            timesLeft <= 10 && (
              <div>
                You have {timesLeft} out of {maxDailyPublishesPerUser} daily
                publications remaining. The counter resets tomorrow.
              </div>
            )}
        </>,
        { duration: 10000 }
      );
    }
    return;
  }

  if (result?.status === "FAILED") {
    if ($publishDialog.get() !== "publish") {
      toast.error(result.statusText);
    }
    setPublishError(result.statusText, buildId);
  }
};

const useManualValidationFindings = () => {
  const [findings, setFindings] = useState<PublishValidationFinding[]>([]);
  const [domains, setDomains] = useState<string[]>();
  const session = useRef(0);
  const requestedDomains = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      session.current += 1;
    };
  }, []);

  const begin = useCallback((domains: string[] = []) => {
    session.current += 1;
    requestedDomains.current = domains;
    setFindings([]);
    setDomains(undefined);
    return session.current;
  }, []);

  const invalidate = useCallback(() => {
    session.current += 1;
    setFindings([]);
    setDomains(undefined);
  }, []);

  const isCurrent = useCallback((id: number) => session.current === id, []);

  const update = useCallback((id: number, next: PublishValidationFinding[]) => {
    if (session.current === id) {
      setFindings(next);
      setDomains(next.length > 0 ? requestedDomains.current : undefined);
    }
  }, []);

  return { findings, domains, begin, invalidate, isCurrent, update };
};

export const getRefreshedProject = async ({
  projectId,
  showError = true,
  query = () => nativeClient.domain.project.query({ projectId }),
  isCurrent = () => true,
}: {
  projectId: Project["id"];
  showError?: boolean;
  query?: () => ReturnType<typeof nativeClient.domain.project.query>;
  isCurrent?: () => boolean;
}) => {
  if ($project.get()?.id !== projectId || !isCurrent()) {
    return;
  }

  const result = await query();
  if ($project.get()?.id !== projectId || !isCurrent()) {
    return;
  }

  if (result.success) {
    $project.set(result.project);
    return result.project;
  }

  if (showError) {
    toast.error(result.error);
  }
};

export const __testing__ = {
  usePublishProgress,
  waitForPublishStatus,
  refreshUntilSuccess,
  reportPublishResult,
  useManualValidationFindings,
  getRefreshedProject,
};
