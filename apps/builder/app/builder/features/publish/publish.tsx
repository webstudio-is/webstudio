import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { useStore } from "@nanostores/react";
import {
  Button,
  Link,
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
  Text,
  Tooltip,
  rawTheme,
  theme,
  toast,
} from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import {
  publishedDeploymentDestination,
  type Templates,
} from "@webstudio-is/sdk";
import {
  $authTokenPermissions,
  $permissions,
  $planFeatures,
} from "~/shared/nano-states";
import { $publishDialog } from "~/builder/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { nativeClient } from "~/shared/trpc/trpc-client";
import {
  PublishDiagnosticsDialog,
  type DiagnosticFinding,
} from "./diagnostics";
import {
  decodePublishLog,
  selectSessionPublishes,
  type SessionPublish,
} from "./session-publishes";
import type { PublishValidationState } from "./publish-actions";
import {
  fetchAndStoreProject,
  waitForPublishStatus,
  refreshProjectWithRetry,
  reportPublishResult,
  type PublishExecution,
} from "./publish-progress";
import {
  runPublishDiagnostics,
  runPublishValidation,
  reportPublishValidationFailure,
  getServerPublishFindings,
} from "./publish-validation";
import { runPublishAfterBestEffortChecks } from "./publish-preflight";
import { getPublishStatusDisplay } from "./publish-status";
import { Content, ExportContent } from "./publish-ui";

type PublishProps = {
  projectId: Project["id"];
};

const COUNTDOWN_DURATION = 60_000;

const getPublishErrorFinding = (
  error: JSX.Element | string,
  buildId?: string
): DiagnosticFinding => ({
  severity: "error",
  source: "publish",
  buildId,
  title: error,
  summary: typeof error === "string" ? error.slice(0, 160) : "Publish failed",
  reportText: typeof error === "string" ? error : "Publish failed",
});

export const PublishButton = ({ projectId }: PublishProps) => {
  const publishDialog = useStore($publishDialog);
  const authTokenPermissions = useStore($authTokenPermissions);
  const { allowPublishLogs = false } = useStore($planFeatures);
  const [manualFindings, setManualFindings] = useState<DiagnosticFinding[]>([]);
  const [manualDomains, setManualDomains] = useState<string[]>();
  const validationSession = useRef(0);
  const requestedManualDomains = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      validationSession.current += 1;
    };
  }, []);

  const beginManualValidation = useCallback((manualDomains: string[] = []) => {
    validationSession.current += 1;
    requestedManualDomains.current = manualDomains;
    setManualFindings([]);
    setManualDomains(undefined);
    return validationSession.current;
  }, []);

  const invalidateManualValidation = useCallback(() => {
    validationSession.current += 1;
    setManualFindings([]);
    setManualDomains(undefined);
  }, []);

  const isManualValidationCurrent = useCallback(
    (id: number) => validationSession.current === id,
    []
  );

  const updateManualValidation = useCallback(
    (id: number, next: DiagnosticFinding[]) => {
      if (validationSession.current === id) {
        setManualFindings(next);
        setManualDomains(
          next.length > 0 ? requestedManualDomains.current : undefined
        );
      }
    },
    []
  );

  const projectScope = useRef({ projectId, token: 0 });
  if (projectScope.current.projectId !== projectId) {
    projectScope.current = { projectId, token: projectScope.current.token + 1 };
  }
  const scopeToken = projectScope.current.token;
  const [startedAt, setStartedAt] = useState<number>();
  const [showCountdown, setShowCountdown] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishDiagnostics, setPublishDiagnostics] = useState<
    Record<
      "site" | "static",
      {
        domains: string[];
        findings: DiagnosticFinding[];
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
    invalidateManualValidation();
  }, [projectId, invalidateManualValidation]);

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
      const setFindings = (findings: SetStateAction<DiagnosticFinding[]>) => {
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
        finish: (findings?: SetStateAction<DiagnosticFinding[]>) => {
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
    const { status, statusContent } = getPublishStatusDisplay(build);
    const isNewBuild =
      build.buildId !== undefined &&
      build.buildId !== requestBaselineBuildId.current;
    if (status === "FAILED") {
      if (hasStartedPublishRequest.current && isNewBuild) {
        setPublishErrorState({
          value: statusContent,
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
            toast.error(result.statusContent);
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

  const [items, setItems] = useState<SessionPublish[]>([]);
  const itemsProjectId = useRef(projectId);
  const generation = useRef(0);
  const permission = useRef({ allowed: allowPublishLogs, generation: 0 });
  if (permission.current.allowed !== allowPublishLogs) {
    permission.current = {
      allowed: allowPublishLogs,
      generation: permission.current.generation + 1,
    };
  }
  const loading = useRef(
    new Map<string, { permissionGeneration: number; scopeToken: number }>()
  );
  const retainedBuilds = useRef(new Set<string>());

  useEffect(() => {
    generation.current += 1;
    itemsProjectId.current = projectId;
    setItems([]);
    loading.current.clear();
    retainedBuilds.current.clear();
    return () => {
      generation.current += 1;
    };
  }, [projectId]);

  useEffect(() => {
    if (allowPublishLogs === false) {
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
  }, [allowPublishLogs]);

  const update = useCallback(
    (buildId: string, change: Partial<SessionPublish>) => {
      setItems((current) =>
        current.map((item) =>
          item.buildId === buildId ? { ...item, ...change } : item
        )
      );
    },
    []
  );

  const record = useCallback(
    (item: Omit<SessionPublish, "status">) => {
      if (isCurrentProject() === false) {
        return;
      }
      const accepted: SessionPublish = {
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
    [isCurrentProject]
  );

  const complete = useCallback(
    (buildId: string, status: "success" | "failed", code?: string) => {
      if (isCurrentProject() && retainedBuilds.current.has(buildId)) {
        update(buildId, {
          status,
          code: permission.current.allowed ? code : undefined,
        });
      }
    },
    [isCurrentProject, update]
  );

  const loadLog = useCallback(
    async (item: SessionPublish) => {
      if (
        isCurrentProject() === false ||
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
        isCurrentProject() &&
        retainedBuilds.current.has(item.buildId) &&
        permission.current.allowed &&
        permission.current.generation === currentPermissionGeneration;
      try {
        let cursor: number | undefined;
        const chunks: string[] = [];
        const issues: NonNullable<SessionPublish["issues"]> = [];
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
    [isCurrentProject, projectId, scopeToken, update]
  );

  const visiblePublishes = itemsProjectId.current === projectId ? items : [];

  const [validationState, setValidationState] =
    useState<PublishValidationState>("idle");
  const dialogRef = useRef(publishDialog);
  dialogRef.current = publishDialog;

  const resetValidationState = useCallback(() => {
    setValidationState("idle");
  }, []);

  const updateValidationState = useCallback((state: PublishValidationState) => {
    if (state === "passed" && dialogRef.current !== "publish") {
      toast.success("Validation passed. Ready to publish.", {
        duration: Number.POSITIVE_INFINITY,
      });
      return;
    }
    if (dialogRef.current === "publish") {
      setValidationState(state);
    }
  }, []);

  useEffect(() => {
    if (publishDialog !== "publish") {
      resetValidationState();
    }
  }, [publishDialog, resetValidationState]);

  const sessionPublishesRef = useRef(visiblePublishes);
  sessionPublishesRef.current = visiblePublishes;
  const [diagnosticsSelection, setDiagnosticsSelection] = useState<{
    target: "static" | "site";
    domain?: string;
    tab: "warnings" | "errors" | "publish";
  }>();
  useEffect(() => {
    setDiagnosticsSelection(undefined);
  }, [projectId]);
  useEffect(() => {
    if (publishDialog !== "publish") {
      dismissCountdown();
    }
  }, [publishDialog, dismissCountdown]);
  const invalidateValidation = useCallback(() => {
    invalidateManualValidation();
    updateValidationState("idle");
  }, [invalidateManualValidation, updateValidationState]);

  const finishPublish = useCallback(
    (
      item: SessionPublish | undefined,
      result: Awaited<ReturnType<typeof waitForPublishStatus>>
    ) => {
      if (
        item === undefined ||
        !isCurrentProject() ||
        (result?.status !== "PUBLISHED" && result?.status !== "FAILED")
      ) {
        return;
      }
      const status = result.status === "PUBLISHED" ? "success" : "failed";
      complete(item.buildId, status, result.code);
      loadLog({ ...item, status });
      if (
        item.target === "static" &&
        status === "success" &&
        item.staticName !== undefined
      ) {
        window.location.href = `/cgi/static/ssg/${item.staticName}`;
      }
    },
    [complete, loadLog, isCurrentProject]
  );

  const waitForCompletion = async (
    item: SessionPublish | undefined,
    previousBuildId?: string
  ) => {
    if (item === undefined) {
      return;
    }
    const result = await waitForPublishStatus(
      () => fetchAndStoreProject({ projectId, isCurrent: isCurrentProject }),
      isCurrentProject,
      previousBuildId,
      {
        projectId,
        buildId: item.buildId,
        logHandle: item.logHandle,
        target: item.target,
      }
    );
    finishPublish(item, result);
    return result;
  };
  useEffect(() => {
    // Refresh a build that finished while the popover was closed, including
    // after a publish status request failed.
    if (publishDialog !== "none" && isPublishing === false) {
      let isOpen = true;
      const generation = beginPopoverRefresh();
      void refreshProjectWithRetry(
        async (showError) => {
          const refreshedProject = await fetchAndStoreProject({
            projectId,
            showError,
            isCurrent: () => isOpen && isRefreshCurrent(generation),
          });
          if (
            isOpen &&
            isRefreshCurrent(generation) &&
            refreshedProject !== undefined
          ) {
            reconcileRefreshedProject(refreshedProject);
          }
          return refreshedProject;
        },
        () => isOpen,
        () => {
          const target = publishDialog === "export" ? "static" : "site";
          const pending = sessionPublishesRef.current.find(
            (item) => item.target === target && item.status === "pending"
          );
          if (target === "static" && pending === undefined) {
            return;
          }
          void watchPendingPublish(
            () =>
              fetchAndStoreProject({
                projectId,
                showError: false,
                isCurrent: () => isRefreshCurrent(generation),
              }),
            generation,
            pending === undefined
              ? undefined
              : {
                  projectId,
                  buildId: pending.buildId,
                  logHandle: pending.logHandle,
                  target,
                },
            (result) => finishPublish(pending, result)
          );
        },
        () =>
          sessionPublishesRef.current.some(
            (item) =>
              item.target ===
                (publishDialog === "export" ? "static" : "site") &&
              item.status === "pending"
          )
      );
      return () => {
        isOpen = false;
      };
    }
  }, [
    projectId,
    publishDialog,
    isPublishing,
    reconcileRefreshedProject,
    watchPendingPublish,
    beginPopoverRefresh,
    isRefreshCurrent,
    finishPublish,
  ]);
  const openSiteReport = (
    domain: string | undefined,
    tab: "warnings" | "errors" | "publish"
  ) => {
    $publishDialog.set("none");
    setDiagnosticsSelection({ target: "site", domain, tab });
  };
  const openStaticReport = (
    tab: "warnings" | "errors" | "publish" = staticFailureFinding === undefined
      ? "publish"
      : "errors"
  ) => {
    $publishDialog.set("none");
    setDiagnosticsSelection({ target: "static", tab });
  };
  const reportPublishes = selectSessionPublishes(
    visiblePublishes,
    diagnosticsSelection?.target ?? "site",
    diagnosticsSelection?.domain
  );
  const domain = diagnosticsSelection?.domain;
  const siteFindings = [...manualFindings, ...publishDiagnostics.site.findings];
  const staticDiagnostics = publishDiagnostics.static;
  const staticFailureFinding = staticDiagnostics.rejected
    ? staticDiagnostics.findings
        .filter(({ severity }) => severity === "error")
        .at(-1)
    : undefined;
  const findings: DiagnosticFinding[] = [];
  const diagnostics =
    publishDiagnostics[diagnosticsSelection?.target ?? "site"];
  const includesSelectedDomain =
    domain === undefined || diagnostics.domains.includes(domain);
  if (includesSelectedDomain) {
    findings.push(...diagnostics.findings);
  }
  if (diagnosticsSelection?.target !== "static") {
    if (domain === undefined || manualDomains?.includes(domain)) {
      findings.push(...manualFindings);
    }
    const publishError = publishErrorState?.value;
    const publishErrorDomains =
      publishErrorState?.domains ??
      visiblePublishes.find(
        (item) => item.buildId === publishErrorState?.buildId
      )?.domains;
    if (
      publishError !== undefined &&
      (domain === undefined ||
        publishErrorDomains === undefined ||
        publishErrorDomains.includes(domain))
    ) {
      findings.push(
        getPublishErrorFinding(publishError, publishErrorState?.buildId)
      );
    }
  }

  const validate = async (domains: string[]) => {
    const session = beginManualValidation(domains);
    clearErrors();
    beginPublishDiagnostics(domains);
    if (domains.length === 0) {
      toast.error("Please select at least one domain to publish");
      return;
    }

    try {
      const checks = await runPublishValidation(projectId, domains);
      if (isManualValidationCurrent(session) === false) {
        return;
      }
      updateManualValidation(session, checks.findings);
      if (checks.passed === false) {
        updateValidationState("idle");
        return;
      }
      updateValidationState("passed");
    } catch (error) {
      if (isManualValidationCurrent(session) === false) {
        return;
      }
      updateValidationState("idle");
      reportPublishValidationFailure(
        error,
        (findings) => updateManualValidation(session, findings),
        { showToast: $publishDialog.get() !== "publish" }
      );
    }
  };

  const publishSite = (
    domains: string[],
    timesLeft: number,
    maxDailyPublishesPerUser: number
  ) => {
    if (!isCurrentProject()) {
      return;
    }
    invalidateManualValidation();
    updateValidationState("idle");
    if (domains.length === 0) {
      toast.error("Please select at least one domain to publish");
      return;
    }
    const diagnostics = beginPublishDiagnostics(domains);
    start(
      async () => {
        const previousBuildId = $project.get()?.latestBuildVirtual?.buildId;
        const publishResult = await runPublishAfterBestEffortChecks({
          checks: async () => {
            const checks = await runPublishDiagnostics(projectId, domains);
            diagnostics.setFindings(checks.findings);
          },
          onCheckFailure: (error) => {
            if (isCurrentProject() && diagnostics.isCurrent()) {
              reportPublishValidationFailure(error, diagnostics.setFindings, {
                publishingContinues: true,
                showToast: $publishDialog.get() !== "publish",
              });
            }
          },
          publish: () =>
            nativeClient.domain.publish.mutate({
              projectId,
              destination: publishedDeploymentDestination,
              domains,
            }),
        });
        if (!isCurrentProject()) {
          return;
        }
        if (publishResult.success === false) {
          if ("auditFindings" in publishResult) {
            diagnostics.finish((findings) => [
              ...findings,
              ...getServerPublishFindings(publishResult.auditFindings),
            ]);
            return;
          }
          diagnostics.finish();
          console.error(publishResult.error);

          let error: JSX.Element | string = publishResult.error;
          if (publishResult.error === "NOT_IMPLEMENTED") {
            error = (
              <>
                <Tooltip
                  content={
                    <Text userSelect="text">
                      {$project.get()?.latestBuildVirtual?.buildId}
                    </Text>
                  }
                >
                  <span>Build data</span>
                </Tooltip>{" "}
                for publishing has been successfully created. Use{" "}
                <Link href="https://docs.webstudio.is/university/self-hosting/cli">
                  Webstudio&nbsp;CLI
                </Link>{" "}
                to generate the code.
              </>
            );
          }
          setPublishError(error, domains);
          if (publishResult.error === "NOT_IMPLEMENTED") {
            toast.info(error);
          } else if ($publishDialog.get() !== "publish") {
            toast.error(
              typeof error === "string" ? error.slice(0, 200) : error
            );
          }

          if (process.env.NODE_ENV === "development") {
            // Refresh locally as it's always an error
            await fetchAndStoreProject({
              projectId,
              isCurrent: isCurrentProject,
            });
          }

          return;
        }

        const accepted = record({
          buildId: publishResult.buildId,
          logHandle: publishResult.logHandle,
          target: "site",
          domains,
          findings: getServerPublishFindings(publishResult.findings),
        });
        const outcome = await waitForCompletion(accepted, previousBuildId);
        reportPublishResult({
          result: outcome,
          buildId: accepted?.buildId,
          timesLeft,
          maxDailyPublishesPerUser,
          setPublishError: setPublishStatusError,
          isCurrentProject,
        });
      },
      {
        domains,
        onError: () => diagnostics.finish(),
      }
    );
  };

  const exportStatic = (templates: readonly Templates[]) => {
    if (!isCurrentProject()) {
      return;
    }
    const diagnostics = beginPublishDiagnostics([], "static");
    start(
      async () => {
        const publishResult = await runPublishAfterBestEffortChecks({
          checks: async () => {
            const checks = await runPublishDiagnostics(projectId);
            diagnostics.setFindings(checks.findings);
          },
          onCheckFailure: (error) => {
            if (isCurrentProject() && diagnostics.isCurrent()) {
              reportPublishValidationFailure(error, diagnostics.setFindings, {
                publishingContinues: true,
                showToast: true,
              });
            }
          },
          publish: () =>
            nativeClient.domain.publish.mutate({
              projectId,
              destination: "static",
              templates: [...templates],
            }),
        });
        if (!isCurrentProject()) {
          return;
        }
        if (publishResult.success === false) {
          if ("auditFindings" in publishResult) {
            diagnostics.finish((findings) => [
              ...findings,
              ...getServerPublishFindings(publishResult.auditFindings),
            ]);
            openStaticReport("errors");
            return;
          }
          diagnostics.finish((findings) => [
            ...findings,
            getPublishErrorFinding(publishResult.error),
          ]);
          toast.error(publishResult.error.slice(0, 200));
          return;
        }
        const accepted = record({
          buildId: publishResult.buildId,
          logHandle: publishResult.logHandle,
          target: "static",
          domains: [],
          findings: getServerPublishFindings(publishResult.findings),
          staticName: "name" in publishResult ? publishResult.name : undefined,
        });
        if (accepted?.staticName == null) {
          toast.error('File name must be defined in "result"');
        }
        const outcome = await waitForCompletion(accepted);
        if (isCurrentProject() && outcome?.status === "FAILED") {
          toast.error(outcome.statusContent);
        }
      },
      {
        target: "static",
        domains: [],
        onError: (message) =>
          diagnostics.finish((findings) => [
            ...findings,
            getPublishErrorFinding(message),
          ]),
      }
    );
  };
  const flow = {
    isPublishing,
    countdown,
    validationState,
    validatedDomains: manualDomains,
    siteError: publishErrorState?.value,
    siteErrorSource: publishErrorState?.source,
    siteFindings,
    siteHasValidationResult:
      publishDiagnostics.site.rejected === true ||
      manualDomains !== undefined ||
      validationState === "passed",
    staticFailureFinding,
    publishes: visiblePublishes,
    loadLog,
    diagnosticsSelection,
    closeReport: () => setDiagnosticsSelection(undefined),
    reportPublishes,
    reportFindings: findings,
    includeLatestPublishFindings: !(
      diagnostics.rejected && includesSelectedDomain
    ),
    openSiteReport,
    openStaticReport,
    validate,
    publishSite,
    exportStatic,
    invalidateValidation,
    reset: () => {
      resetValidationState();
      dismissCountdown();
    },
  };
  const { canPublishToStagingOnly } = useStore($permissions);
  const isPublishEnabled =
    authTokenPermissions.canPublish || canPublishToStagingOnly;
  const tooltipContent = isPublishEnabled
    ? undefined
    : "Only the owner, an admin, or content editors with publish permissions can publish projects";
  const handleExportClick = () => {
    flow.reset();
    $publishDialog.set("export");
  };
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen === false) {
      flow.reset();
    }
    $publishDialog.set(isOpen ? "publish" : "none");
  };
  return (
    <>
      <Popover
        modal
        open={publishDialog !== "none"}
        onOpenChange={handleOpenChange}
      >
        <Tooltip
          side="bottom"
          content={tooltipContent ?? "Publish to Webstudio Cloud"}
          sideOffset={Number.parseFloat(rawTheme.spacing[5])}
        >
          <PopoverTrigger asChild>
            <Button type="button" disabled={isPublishEnabled === false}>
              Publish
            </Button>
          </PopoverTrigger>
        </Tooltip>

        <PopoverContent
          css={{
            width: theme.spacing[33],
            maxWidth: theme.spacing[33],
            marginRight: theme.spacing[3],
          }}
        >
          {publishDialog === "export" && (
            <>
              <PopoverTitle>Export</PopoverTitle>
              <ExportContent flow={flow} />
            </>
          )}

          {publishDialog === "publish" && (
            <Content
              projectId={projectId}
              onExportClick={handleExportClick}
              flow={flow}
            />
          )}
        </PopoverContent>
      </Popover>
      <PublishDiagnosticsDialog
        findings={flow.reportFindings}
        includeLatestPublishFindings={flow.includeLatestPublishFindings}
        open={diagnosticsSelection !== undefined}
        onOpenChange={(open) => {
          if (open === false) {
            flow.closeReport();
          }
        }}
        target={
          diagnosticsSelection?.target === "static"
            ? "Static export"
            : diagnosticsSelection?.domain
        }
        initialTab={diagnosticsSelection?.tab}
        items={flow.reportPublishes}
        canViewPublishLogs={allowPublishLogs}
        onLoadLog={flow.loadLog}
      />
    </>
  );
};
