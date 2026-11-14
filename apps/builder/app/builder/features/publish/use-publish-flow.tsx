import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Text, Tooltip, toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import {
  publishedDeploymentDestination,
  type Templates,
} from "@webstudio-is/sdk";
import { $project } from "~/shared/sync/data-stores";
import { $publishDialog } from "~/builder/shared/nano-states";
import { nativeClient } from "~/shared/trpc/trpc-client";
import { usePublishValidationState } from "./publish-actions";
import {
  usePublishProgress,
  waitForPublishStatus,
  refreshUntilSuccess,
  getRefreshedProject,
  reportPublishResult,
} from "./use-publish-progress";
import {
  selectPublishLogs,
  usePublishLogs,
  type PublishLog,
} from "./use-publish-logs";
import {
  runPublishDiagnostics,
  runPublishValidation,
  reportPublishValidationFailure,
  getServerPublishFindings,
} from "./publish-validation";
import { runPublishAfterBestEffortChecks } from "./publish-preflight";
import type { PublishValidationFinding } from "./diagnostics";

const downloadStatic = (name: string) => {
  window.location.href = `/cgi/static/ssg/${name}`;
};

const getPublishErrorFinding = (
  error: JSX.Element | string,
  buildId?: string
): PublishValidationFinding => ({
  severity: "error",
  source: "publish",
  buildId,
  title: error,
  summary: typeof error === "string" ? error.slice(0, 160) : "Publish failed",
  reportText: typeof error === "string" ? error : "Publish failed",
});

export const usePublishFlow = (
  projectId: Project["id"],
  allowPublishLogs: boolean,
  publishDialog: "none" | "publish" | "export"
) => {
  const publishLogs = usePublishLogs(projectId, allowPublishLogs);
  const pendingLogs = useRef(publishLogs.items);
  pendingLogs.current = publishLogs.items;
  const [selectedReport, setSelectedReport] = useState<{
    target: "static" | "site";
    domain?: string;
    tab: "warnings" | "errors" | "publish";
  }>();
  useEffect(() => {
    setSelectedReport(undefined);
  }, [projectId]);
  const validation = usePublishValidationState(publishDialog);
  const progress = usePublishProgress(projectId);
  const {
    dismissCountdown,
    reconcileRefreshedProject,
    watchPendingPublish,
    beginPopoverRefresh,
    isRefreshCurrent,
  } = progress;
  useEffect(() => {
    if (publishDialog !== "publish") {
      dismissCountdown();
    }
  }, [publishDialog, dismissCountdown]);
  const {
    complete: completePublishLog,
    loadLog: loadPublishLog,
    isCurrent,
  } = publishLogs;
  const validationFindings = progress.manualValidationFindings;
  const { invalidate: invalidateValidationFindings } = validationFindings;
  const { update: onValidationStateChange } = validation;
  const { isCurrentProject } = progress;
  const invalidateValidation = useCallback(() => {
    invalidateValidationFindings();
    onValidationStateChange("idle");
  }, [invalidateValidationFindings, onValidationStateChange]);

  const finishPublish = useCallback(
    (
      item: PublishLog | undefined,
      result: Awaited<ReturnType<typeof waitForPublishStatus>>,
      onDownload = downloadStatic
    ) => {
      if (
        item === undefined ||
        !isCurrent() ||
        (result?.status !== "PUBLISHED" && result?.status !== "FAILED")
      ) {
        return;
      }
      const status = result.status === "PUBLISHED" ? "success" : "failed";
      completePublishLog(item.buildId, status, result.code);
      loadPublishLog({ ...item, status });
      if (
        item.target === "static" &&
        status === "success" &&
        item.staticName !== undefined
      ) {
        onDownload(item.staticName);
      }
    },
    [completePublishLog, loadPublishLog, isCurrent]
  );

  const waitForCompletion = async (
    item: PublishLog | undefined,
    previousBuildId?: string,
    onDownload = downloadStatic
  ) => {
    if (item === undefined) {
      return;
    }
    const result = await waitForPublishStatus(
      () => getRefreshedProject({ projectId, isCurrent }),
      isCurrent,
      previousBuildId,
      {
        projectId,
        buildId: item.buildId,
        logHandle: item.logHandle,
        target: item.target,
      }
    );
    finishPublish(item, result, onDownload);
    return result;
  };
  useEffect(() => {
    // Refresh a build that finished while the popover was closed, including
    // after a publish status request failed.
    if (publishDialog !== "none" && progress.isPublishing === false) {
      let isOpen = true;
      const generation = beginPopoverRefresh();
      void refreshUntilSuccess(
        async (showError) => {
          const refreshedProject = await getRefreshedProject({
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
          const pending = pendingLogs.current.find(
            (item) => item.target === target && item.status === "pending"
          );
          if (target === "static" && pending === undefined) {
            return;
          }
          void watchPendingPublish(
            () =>
              getRefreshedProject({
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
          pendingLogs.current.some(
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
    progress.isPublishing,
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
    setSelectedReport({ target: "site", domain, tab });
  };
  const openStaticReport = (
    tab: "warnings" | "errors" | "publish" = staticError === undefined
      ? "publish"
      : "errors"
  ) => {
    $publishDialog.set("none");
    setSelectedReport({ target: "static", tab });
  };
  const reportItems = selectPublishLogs(
    publishLogs.items,
    selectedReport?.target ?? "site",
    selectedReport?.domain
  );
  const domain = selectedReport?.domain;
  const siteFindings = [
    ...validationFindings.findings,
    ...progress.publishFindings,
  ];
  const staticDiagnostics = progress.publishDiagnostics.static;
  const staticError = staticDiagnostics.rejected
    ? staticDiagnostics.findings
        .filter(({ severity }) => severity === "error")
        .at(-1)
    : undefined;
  const findings: PublishValidationFinding[] = [];
  const diagnostics =
    progress.publishDiagnostics[selectedReport?.target ?? "site"];
  const isReportForDiagnostics =
    domain === undefined || diagnostics.domains.includes(domain);
  if (isReportForDiagnostics) {
    findings.push(...diagnostics.findings);
  }
  if (selectedReport?.target !== "static") {
    if (domain === undefined || validationFindings.domains?.includes(domain)) {
      findings.push(...validationFindings.findings);
    }
    const { publishError, publishErrorDomains } = progress;
    if (
      publishError !== undefined &&
      (domain === undefined ||
        publishErrorDomains === undefined ||
        publishErrorDomains.includes(domain))
    ) {
      findings.push(
        getPublishErrorFinding(publishError, progress.publishErrorBuildId)
      );
    }
  }

  const validate = async (domains: string[]) => {
    const session = validationFindings.begin(domains);
    progress.clearErrors();
    progress.beginPublishDiagnostics(domains);
    if (domains.length === 0) {
      toast.error("Please select at least one domain to publish");
      return;
    }

    try {
      const checks = await runPublishValidation(projectId, domains);
      if (validationFindings.isCurrent(session) === false) {
        return;
      }
      validationFindings.update(session, checks.findings);
      if (checks.passed === false) {
        onValidationStateChange("idle");
        return;
      }
      onValidationStateChange("passed");
    } catch (error) {
      if (validationFindings.isCurrent(session) === false) {
        return;
      }
      onValidationStateChange("idle");
      reportPublishValidationFailure(
        error,
        (findings) => validationFindings.update(session, findings),
        { showToast: $publishDialog.get() !== "publish" }
      );
    }
  };

  const publish = (
    request:
      | {
          target: "site";
          domains: string[];
          timesLeft: number;
          maxDailyPublishesPerUser: number;
        }
      | {
          target: "static";
          templates: readonly Templates[];
          onDownload?: (name: string) => void;
        }
  ) => {
    if (!isCurrent()) {
      return;
    }
    const domains = request.target === "site" ? request.domains : [];
    if (request.target === "site") {
      validationFindings.invalidate();
      onValidationStateChange("idle");
      if (domains.length === 0) {
        toast.error("Please select at least one domain to publish");
        return;
      }
    }
    const diagnostics = progress.beginPublishDiagnostics(
      domains,
      request.target
    );
    progress.start(
      async () => {
        const previousBuildId =
          request.target === "site"
            ? $project.get()?.latestBuildVirtual?.buildId
            : undefined;
        const publishResult = await runPublishAfterBestEffortChecks({
          checks: async () => {
            const checks = await runPublishDiagnostics(
              projectId,
              request.target === "site" ? domains : undefined
            );
            diagnostics.setFindings(checks.findings);
          },
          onCheckFailure: (error) => {
            if (isCurrent() && diagnostics.isCurrent()) {
              reportPublishValidationFailure(error, diagnostics.setFindings, {
                publishingContinues: true,
                showToast:
                  request.target === "static" ||
                  $publishDialog.get() !== "publish",
              });
            }
          },
          publish: () =>
            nativeClient.domain.publish.mutate(
              request.target === "site"
                ? {
                    projectId,
                    destination: publishedDeploymentDestination,
                    domains,
                  }
                : {
                    projectId,
                    destination: "static",
                    templates: [...request.templates],
                  }
            ),
        });
        if (!isCurrent()) {
          return;
        }
        if (publishResult.success === false) {
          if ("auditFindings" in publishResult) {
            diagnostics.finish((findings) => [
              ...findings,
              ...getServerPublishFindings(publishResult.auditFindings),
            ]);
            if (request.target === "static") {
              openStaticReport("errors");
            }
            return;
          }
          if (request.target === "static") {
            diagnostics.finish((findings) => [
              ...findings,
              getPublishErrorFinding(publishResult.error),
            ]);
            toast.error(publishResult.error.slice(0, 200));
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
          progress.setPublishError(error, domains);
          if (publishResult.error === "NOT_IMPLEMENTED") {
            toast.info(error);
          } else if ($publishDialog.get() !== "publish") {
            toast.error(
              typeof error === "string" ? error.slice(0, 200) : error
            );
          }

          if (process.env.NODE_ENV === "development") {
            // Refresh locally as it's always an error
            await getRefreshedProject({ projectId, isCurrent });
          }

          return;
        }

        const accepted = publishLogs.record({
          buildId: publishResult.buildId,
          logHandle: publishResult.logHandle,
          target: request.target,
          domains,
          findings: getServerPublishFindings(publishResult.findings),
          staticName: "name" in publishResult ? publishResult.name : undefined,
        });
        if (request.target === "static" && accepted?.staticName == null) {
          toast.error('File name must be defined in "result"');
        }
        const outcome = await waitForCompletion(
          accepted,
          previousBuildId,
          request.target === "static" ? request.onDownload : undefined
        );
        if (request.target === "site") {
          reportPublishResult({
            result: outcome,
            buildId: accepted?.buildId,
            timesLeft: request.timesLeft,
            maxDailyPublishesPerUser: request.maxDailyPublishesPerUser,
            setPublishError: progress.setPublishStatusError,
            isCurrentProject,
          });
        } else if (isCurrent() && outcome?.status === "FAILED") {
          toast.error(outcome.statusText);
        }
      },
      {
        target: request.target,
        domains,
        onError: (message) =>
          diagnostics.finish(
            request.target === "static"
              ? (findings) => [...findings, getPublishErrorFinding(message)]
              : undefined
          ),
      }
    );
  };
  return {
    isPublishing: progress.isPublishing,
    countdown: progress.countdown,
    validationState: validation.validationState,
    validatedDomains: validationFindings.domains,
    siteError: progress.publishError,
    siteErrorSource: progress.publishErrorSource,
    siteFindings,
    staticError,
    logs: publishLogs.items,
    loadLog: publishLogs.loadLog,
    selectedReport,
    closeReport: () => setSelectedReport(undefined),
    reportItems,
    reportFindings: findings,
    includeLatestPublishFindings: !(
      diagnostics.rejected && isReportForDiagnostics
    ),
    openSiteReport,
    openStaticReport,
    validate,
    publish,
    invalidateValidation,
    reset: () => {
      validation.reset();
      dismissCountdown();
    },
  };
};
