import { afterEach, expect, test, vi } from "vitest";
import { toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $publishDialog } from "~/builder/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import {
  waitForPublishStatus,
  refreshProjectWithRetry,
  fetchAndStoreProject,
  reportPublishResult,
} from "./publish-progress";

afterEach(() => {
  $publishDialog.set("none");
  $project.set(undefined);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("a verified runner failure finishes the existing status wait without a project refresh", async () => {
  const refresh = vi.fn(async () => undefined);
  const getJob = vi.fn(async () => ({
    status: "failed",
    code: "runner_failed",
  }));
  const result = await waitForPublishStatus(
    refresh,
    () => true,
    undefined,
    {
      projectId: "project",
      buildId: "build-1",
      logHandle: "handle-1",
    },
    getJob
  );
  expect(result?.status).toBe("FAILED");
  expect(result?.code).toBe("runner_failed");
  expect(refresh).not.toHaveBeenCalled();
  expect(getJob).toHaveBeenCalledWith({
    projectId: "project",
    jobId: "build-1",
    logHandle: "handle-1",
  });
});

test("a pending runner cannot promote a refreshed Build to success", async () => {
  vi.useFakeTimers();
  const refresh = vi.fn(
    async () =>
      ({
        latestBuildVirtual: {
          buildId: "build-1",
          createdAt: new Date().toISOString(),
          publishStatus: "PUBLISHED",
        },
      }) as Project
  );
  const getJob = vi
    .fn()
    .mockResolvedValueOnce({ status: "pending" })
    .mockResolvedValueOnce({ status: "failed", code: "runner_failed" });
  const waiting = waitForPublishStatus(
    refresh,
    () => true,
    undefined,
    { projectId: "project", buildId: "build-1", logHandle: "handle-1" },
    getJob
  );
  await vi.advanceTimersByTimeAsync(15_000);
  expect((await waiting)?.status).toBe("FAILED");
  expect(refresh).toHaveBeenCalledOnce();
  expect(getJob).toHaveBeenCalledTimes(2);
});

test("a pending runner cannot turn a timed-out Build into failure", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T10:10:00Z"));
  const refresh = vi.fn(
    async () =>
      ({
        latestBuildVirtual: {
          buildId: "build-1",
          createdAt: "2026-11-13T10:00:00Z",
          publishStatus: "PENDING",
        },
      }) as Project
  );
  const getJob = vi
    .fn()
    .mockResolvedValueOnce({ status: "pending" })
    .mockResolvedValueOnce({ status: "failed", code: "runner_failed" });
  const waiting = waitForPublishStatus(
    refresh,
    () => true,
    undefined,
    { projectId: "project", buildId: "build-1", logHandle: "handle-1" },
    getJob
  );
  await vi.advanceTimersByTimeAsync(15_000);
  expect((await waiting)?.code).toBe("runner_failed");
  expect(getJob).toHaveBeenCalledTimes(2);
});

test("static status waits for the matching runner before download readiness", async () => {
  vi.useFakeTimers();
  const refresh = vi.fn(
    async () =>
      ({
        latestStaticBuild: {
          buildId: "static-1",
          updatedAt: new Date().toISOString(),
          publishStatus: "PUBLISHED",
        },
      }) as Project
  );
  const getJob = vi
    .fn()
    .mockResolvedValueOnce({ status: "pending" })
    .mockResolvedValueOnce({ status: "success" });
  const waiting = waitForPublishStatus(
    refresh,
    () => true,
    undefined,
    {
      projectId: "project",
      buildId: "static-1",
      logHandle: "handle-1",
      target: "static",
    },
    getJob
  );
  await vi.advanceTimersByTimeAsync(15_000);
  expect((await waiting)?.status).toBe("PUBLISHED");
  expect(getJob).toHaveBeenCalledTimes(2);
});

test.each(["site", "static"] as const)(
  "finishes an accepted %s publish when a newer build becomes latest",
  async (target) => {
    vi.useFakeTimers();
    const newerBuild = {
      buildId: "build-2",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishStatus: "PUBLISHED",
    };
    const refresh = vi.fn(
      async () =>
        ({
          latestBuildVirtual: target === "site" ? newerBuild : null,
          latestStaticBuild: target === "static" ? newerBuild : null,
        }) as Project
    );
    const getJob = vi.fn(async () => ({ status: "success" }));
    const waiting = waitForPublishStatus(
      refresh,
      () => true,
      undefined,
      {
        projectId: "project",
        buildId: "build-1",
        logHandle: "handle-1",
        target,
      },
      getJob
    );

    await vi.runAllTimersAsync();
    expect((await waiting)?.status).toBe("PUBLISHED");
    expect(refresh).toHaveBeenCalledOnce();
  }
);

test.each(["site", "static"] as const)(
  "does not treat a stale %s pending build as failed after runner success",
  async (target) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-13T10:10:00Z"));
    const staleBuild = {
      buildId: "build-1",
      createdAt: "2026-11-13T10:00:00Z",
      updatedAt: "2026-11-13T10:00:00Z",
      publishStatus: "PENDING",
    };
    const refresh = vi.fn(
      async () =>
        ({
          latestBuildVirtual: target === "site" ? staleBuild : null,
          latestStaticBuild: target === "static" ? staleBuild : null,
        }) as Project
    );
    const getJob = vi.fn(async () => ({ status: "success" }));
    const result = await waitForPublishStatus(
      refresh,
      () => true,
      undefined,
      {
        projectId: "project",
        buildId: "build-1",
        logHandle: "handle-1",
        target,
      },
      getJob
    );

    expect(result?.status).toBe("PUBLISHED");
    expect(refresh).toHaveBeenCalledOnce();
  }
);

test("reopening refresh retries after a rejected status request", async () => {
  vi.useFakeTimers();
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  let attempts = 0;
  const refresh = async (_showError: boolean) => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("Network unavailable");
    }
    return {} as Project;
  };

  try {
    const done = refreshProjectWithRetry(refresh, () => true);
    expect(attempts).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    await done;
    expect(attempts).toBe(2);
  } finally {
    errorLog.mockRestore();
  }
});

test("reopening resumes a retained pending session even after the Build is published", async () => {
  const project = {
    latestBuildVirtual: {
      buildId: "build-1",
      createdAt: new Date().toISOString(),
      publishStatus: "PUBLISHED",
    },
  } as Project;
  const onPending = vi.fn();
  await refreshProjectWithRetry(
    async () => project,
    () => true,
    onPending,
    () => true
  );
  expect(onPending).toHaveBeenCalledWith(project);
});

test("reopening stops after three unsuccessful project refreshes and shows the error", async () => {
  vi.useFakeTimers();
  $project.set({ id: "project" } as Project);
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  const query = vi.fn(async () => ({
    success: false as const,
    error: "Not found",
  }));
  let isOpen = true;

  const done = refreshProjectWithRetry(
    (showError) =>
      fetchAndStoreProject({ projectId: "project", showError, query }),
    () => isOpen
  );
  await vi.advanceTimersByTimeAsync(15_000);
  isOpen = false;
  await vi.runOnlyPendingTimersAsync();
  await done;

  expect(query).toHaveBeenCalledTimes(3);
  expect(errorToast).toHaveBeenCalledOnce();
});

test("an in-flight status request cannot replace the project after navigation", async () => {
  const oldProject = { id: "old-project" } as Project;
  const newProject = { id: "new-project" } as Project;
  $project.set(oldProject);

  let finishQuery: (result: {
    success: true;
    project: Project;
  }) => void = () => {};
  const query = new Promise<{ success: true; project: Project }>((resolve) => {
    finishQuery = resolve;
  });
  const refresh = fetchAndStoreProject({
    projectId: oldProject.id,
    showError: false,
    query: () => query,
  });

  $project.set(newProject);
  finishQuery({ success: true, project: oldProject });

  await expect(refresh).resolves.toBeUndefined();
  expect($project.get()).toBe(newProject);
});

test("an older popover refresh cannot overwrite a newer result", async () => {
  $project.set({ id: "project" } as Project);
  let finishOldQuery: (result: {
    success: true;
    project: Project;
  }) => void = () => {};
  const oldQuery = new Promise<{ success: true; project: Project }>(
    (resolve) => {
      finishOldQuery = resolve;
    }
  );
  let isOpen = true;
  const oldRefresh = fetchAndStoreProject({
    projectId: "project",
    showError: false,
    query: () => oldQuery,
    isCurrent: () => isOpen,
  });

  isOpen = false;
  const currentProject = { id: "project", domain: "new" } as Project;
  await fetchAndStoreProject({
    projectId: "project",
    showError: false,
    query: async () => ({ success: true, project: currentProject }),
  });
  finishOldQuery({
    success: true,
    project: { id: "project", domain: "old" } as Project,
  });
  await oldRefresh;

  expect($project.get()).toBe(currentProject);
});

test("publish polling stops after navigating to another project", async () => {
  const oldProject = { id: "old-project" } as Project;
  const newProject = { id: "new-project" } as Project;
  $project.set(oldProject);

  let finishRefresh: (project: Project) => void = () => {};
  const refresh = new Promise<Project>((resolve) => {
    finishRefresh = resolve;
  });
  const polling = waitForPublishStatus(
    () => refresh,
    () => $project.get()?.id === oldProject.id
  );

  $project.set(newProject);
  finishRefresh({
    latestBuildVirtual: {
      createdAt: new Date().toISOString(),
      publishStatus: "PUBLISHED",
    },
  } as Project);

  await expect(polling).resolves.toBeUndefined();
  expect($project.get()).toBe(newProject);
});

test("publish failure updates the banner without a duplicate toast while Publish is open", () => {
  const successToast = vi.spyOn(toast, "success").mockImplementation(() => "");
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  const setPublishError = vi.fn();
  const publishedStatusText = <>Published</>;
  const failedStatusText = <>Publish failed</>;

  $publishDialog.set("publish");
  reportPublishResult({
    result: { status: "PUBLISHED", statusContent: publishedStatusText },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });
  reportPublishResult({
    result: { status: "FAILED", statusContent: failedStatusText },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });

  expect(successToast).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
  expect(setPublishError).toHaveBeenCalledOnce();
});

test("an old project completion does not show a success toast over an open Publish panel", () => {
  const successToast = vi.spyOn(toast, "success").mockImplementation(() => "");
  $publishDialog.set("publish");

  reportPublishResult({
    result: { status: "PUBLISHED", statusContent: <>Published</> },
    setPublishError: vi.fn(),
    isCurrentProject: () => false,
  });

  expect(successToast).not.toHaveBeenCalled();
});

test("publish completion does not show a success toast in the Export view", () => {
  const successToast = vi.spyOn(toast, "success").mockImplementation(() => "");
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  const setPublishError = vi.fn();
  $publishDialog.set("export");

  reportPublishResult({
    result: { status: "PUBLISHED", statusContent: <>Published</> },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });
  reportPublishResult({
    result: { status: "FAILED", statusContent: <>Publish failed</> },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });

  expect(successToast).not.toHaveBeenCalled();
  expect(errorToast).toHaveBeenCalledOnce();
});

test("publish completion shows a toast after the dialog closes", () => {
  const successToast = vi.spyOn(toast, "success").mockImplementation(() => "");
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  const setPublishError = vi.fn();
  const publishedStatusText = <>Published</>;
  const failedStatusText = <>Publish failed</>;
  $publishDialog.set("none");

  reportPublishResult({
    result: { status: "PUBLISHED", statusContent: publishedStatusText },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });
  reportPublishResult({
    result: { status: "FAILED", statusContent: failedStatusText },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });

  expect(successToast).toHaveBeenCalledOnce();
  expect(errorToast).toHaveBeenCalledOnce();
  expect(setPublishError).toHaveBeenCalledWith(failedStatusText, undefined);
});
