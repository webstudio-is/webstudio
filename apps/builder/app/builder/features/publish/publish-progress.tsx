import { toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $project } from "~/shared/sync/data-stores";
import { $publishDialog } from "~/builder/shared/nano-states";
import { nativeClient } from "~/shared/trpc/trpc-client";
import {
  PENDING_TIMEOUT,
  getPublishStatusDisplay,
  getStaticPublishStatusDisplay,
} from "./publish-status";

const STATUS_REFRESH_RETRY_DELAY = 5_000;

const STATUS_REFRESH_MAX_ATTEMPTS = 3;

export type PublishExecution = {
  projectId: string;
  buildId: string;
  logHandle?: string;
  target?: "site" | "static";
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
    let runnerSucceeded = false;
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
              statusContent: "Publish failed",
              code: job.code,
            };
          }
          runnerPending = job.status === "pending";
          runnerSucceeded = job.status === "success";
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
        const { statusContent, status } =
          execution?.target === "static" &&
          refreshedProject.latestStaticBuild != null
            ? getStaticPublishStatusDisplay(refreshedProject.latestStaticBuild)
            : refreshedProject.latestBuildVirtual != null
              ? getPublishStatusDisplay(refreshedProject.latestBuildVirtual)
              : {
                  statusContent: "Not published",
                  status: "PENDING" as const,
                };

        if (!runnerPending && (status === "PUBLISHED" || status === "FAILED")) {
          return { status, statusContent };
        }
      }
    } catch (error) {
      if (isCurrentProject() === false) {
        return;
      }
      // A failed status request should not stop watching an ongoing publish.
      console.error("Could not refresh publish status", error);
    }
    if (runnerSucceeded && isCurrentProject()) {
      return {
        status: "PUBLISHED" as const,
        statusContent:
          execution?.target === "static" ? "Downloaded" : "Published",
      };
    }

    await new Promise((resolve) => setTimeout(resolve, sleepTime));
    sleepTime = Math.max(5000, sleepTime - 5000);
  }
};

export const refreshProjectWithRetry = async (
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
            getPublishStatusDisplay(refreshedProject.latestBuildVirtual)
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
      toast.error(result.statusContent);
    }
    setPublishError(result.statusContent, buildId);
  }
};

export const fetchAndStoreProject = async ({
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
