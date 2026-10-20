import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { $publishDialog } from "~/builder/shared/nano-states";
import { $project } from "~/shared/sync/data-stores";
import { __testing__ } from "./publish";

const {
  usePublishProgress,
  waitForPublishStatus,
  refreshUntilSuccess,
  getRefreshedProject,
  reportPublishResult,
} = __testing__;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  $publishDialog.set("none");
  $project.set(undefined);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("closing publish hides the countdown while polling continues and completion clears pending", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
  $project.set({ id: "project" } as Project);

  let status: "PENDING" | "PUBLISHED" = "PENDING";
  let statusRequests = 0;

  const Harness = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [completedStatus, setCompletedStatus] = useState<string>();
    const progress = usePublishProgress("project");
    return (
      <>
        <button
          onClick={() =>
            progress.start(async () => {
              const result = await waitForPublishStatus(
                async () => {
                  statusRequests += 1;
                  return {
                    latestBuildVirtual: {
                      createdAt: new Date().toISOString(),
                      publishStatus: status,
                    },
                  } as Project;
                },
                () => true
              );
              setCompletedStatus(result?.status);
            })
          }
        >
          Start
        </button>
        <button
          onClick={() => {
            progress.dismissCountdown();
            setIsOpen(false);
          }}
        >
          Close
        </button>
        <button onClick={() => setIsOpen(true)}>Open</button>
        {isOpen && (
          <output>
            {progress.isPublishing ? "pending" : "complete"}:
            {progress.countdown ?? "no countdown"}:{completedStatus ?? "none"}
          </output>
        )}
      </>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));

  const [start, close, open] = container.querySelectorAll("button");
  act(() => start.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "pending:60:none"
  );

  await act(async () => vi.advanceTimersByTimeAsync(10_000));
  expect(container.querySelector("output")?.textContent).toBe(
    "pending:50:none"
  );

  act(() => close.click());
  act(() => open.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "pending:no countdown:none"
  );

  act(() => close.click());
  status = "PUBLISHED";
  await act(async () => vi.advanceTimersByTimeAsync(5_000));
  act(() => open.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "complete:no countdown:PUBLISHED"
  );
  expect(statusRequests).toBe(2);
});

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
    const done = refreshUntilSuccess(refresh, () => true);
    expect(attempts).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    await done;
    expect(attempts).toBe(2);
  } finally {
    errorLog.mockRestore();
  }
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

  const done = refreshUntilSuccess(
    (showError) =>
      getRefreshedProject({ projectId: "project", showError, query }),
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
  const refresh = getRefreshedProject({
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
  const oldRefresh = getRefreshedProject({
    projectId: "project",
    showError: false,
    query: () => oldQuery,
    isCurrent: () => isOpen,
  });

  isOpen = false;
  const currentProject = { id: "project", domain: "new" } as Project;
  await getRefreshedProject({
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

test("publish completion does not show a toast while the Publish panel is open", () => {
  const successToast = vi.spyOn(toast, "success").mockImplementation(() => "");
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  const setPublishError = vi.fn();
  const publishedStatusText = <>Published</>;
  const failedStatusText = <>Publish failed</>;

  $publishDialog.set("publish");
  reportPublishResult({
    result: { status: "PUBLISHED", statusText: publishedStatusText },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });
  reportPublishResult({
    result: { status: "FAILED", statusText: failedStatusText },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });

  expect(successToast).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
  expect(setPublishError).toHaveBeenCalledOnce();
});

test("publish completion shows a toast in the Export view", () => {
  const successToast = vi.spyOn(toast, "success").mockImplementation(() => "");
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  const setPublishError = vi.fn();
  $publishDialog.set("export");

  reportPublishResult({
    result: { status: "PUBLISHED", statusText: <>Published</> },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });
  reportPublishResult({
    result: { status: "FAILED", statusText: <>Publish failed</> },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });

  expect(successToast).toHaveBeenCalledOnce();
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
    result: { status: "PUBLISHED", statusText: publishedStatusText },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });
  reportPublishResult({
    result: { status: "FAILED", statusText: failedStatusText },
    timesLeft: 11,
    maxDailyPublishesPerUser: 20,
    setPublishError,
  });

  expect(successToast).toHaveBeenCalledOnce();
  expect(errorToast).toHaveBeenCalledOnce();
  expect(setPublishError).toHaveBeenCalledWith(failedStatusText);
});

test("a rejected publish request shows an inline error while the dialog is open", async () => {
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  $publishDialog.set("publish");
  $project.set({ id: "project" } as Project);

  const Harness = () => {
    const progress = usePublishProgress("project");
    return (
      <>
        <button
          onClick={() =>
            progress.start(() =>
              Promise.reject(new Error("Network unavailable"))
            )
          }
        >
          Start
        </button>
        <output>{progress.requestError}</output>
      </>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));

  await act(async () => container?.querySelector("button")?.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "Network unavailable"
  );
  expect(errorToast).not.toHaveBeenCalled();
});

test("a rejected publish request shows a toast after the dialog closes", async () => {
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  $publishDialog.set("publish");
  $project.set({ id: "project" } as Project);
  let rejectPublish: (error: Error) => void = () => {};
  const publish = new Promise<void>((_, reject) => {
    rejectPublish = reject;
  });

  const Harness = () => {
    const progress = usePublishProgress("project");
    return (
      <>
        <button onClick={() => progress.start(() => publish)}>Start</button>
        <output>{progress.requestError}</output>
      </>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));
  act(() => container?.querySelector("button")?.click());

  $publishDialog.set("none");
  await act(async () => rejectPublish(new Error("Network unavailable")));

  expect(errorToast).toHaveBeenCalledOnce();
  expect(container.querySelector("output")?.textContent).toBe(
    "Network unavailable"
  );
});

test("a rejected publish request appears in the panel reopened before rejection", async () => {
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  $publishDialog.set("publish");
  $project.set({ id: "project" } as Project);
  let rejectPublish: (error: Error) => void = () => {};
  const publish = new Promise<void>((_, reject) => {
    rejectPublish = reject;
  });

  const Harness = () => {
    const [isOpen, setIsOpen] = useState(true);
    const progress = usePublishProgress("project");
    return (
      <>
        <button onClick={() => progress.start(() => publish)}>Start</button>
        <button
          onClick={() => {
            setIsOpen(false);
            $publishDialog.set("none");
          }}
        >
          Close
        </button>
        <button
          onClick={() => {
            setIsOpen(true);
            $publishDialog.set("publish");
          }}
        >
          Reopen
        </button>
        {isOpen && <output>{progress.requestError}</output>}
      </>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));
  const [start, close, reopen] = container.querySelectorAll("button");
  act(() => start.click());
  act(() => close.click());
  act(() => reopen.click());

  await act(async () => rejectPublish(new Error("Network unavailable")));

  expect(container.querySelector("output")?.textContent).toBe(
    "Network unavailable"
  );
  expect(errorToast).not.toHaveBeenCalled();
});

test("a publish failure remains visible after the panel remounts", () => {
  $project.set({ id: "project" } as Project);
  $publishDialog.set("publish");
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");

  const Harness = () => {
    const [isOpen, setIsOpen] = useState(true);
    const progress = usePublishProgress("project");
    return (
      <>
        <button onClick={() => setIsOpen(false)}>Close</button>
        <button onClick={() => setIsOpen(true)}>Reopen</button>
        <button
          onClick={() =>
            reportPublishResult({
              result: { status: "FAILED", statusText: <>Build failed</> },
              timesLeft: 11,
              maxDailyPublishesPerUser: 20,
              setPublishError: progress.setPublishError,
            })
          }
        >
          Finish
        </button>
        {isOpen && <output>{progress.publishError}</output>}
      </>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));
  const [close, reopen, finish] = container.querySelectorAll("button");
  act(() => close.click());
  act(() => reopen.click());
  act(() => finish.click());

  expect(container.querySelector("output")?.textContent).toBe("Build failed");
  expect(errorToast).not.toHaveBeenCalled();
});

test("a successful status refresh clears a persisted publish failure", () => {
  $project.set({ id: "project" } as Project);
  $publishDialog.set("publish");

  const Harness = () => {
    const progress = usePublishProgress("project");
    return (
      <>
        <button
          onClick={() =>
            reportPublishResult({
              result: { status: "FAILED", statusText: <>Publish failed</> },
              timesLeft: 11,
              maxDailyPublishesPerUser: 20,
              setPublishError: progress.setPublishError,
            })
          }
        >
          Fail
        </button>
        <button
          onClick={() =>
            progress.reconcileRefreshedProject({
              latestBuildVirtual: {
                createdAt: new Date().toISOString(),
                publishStatus: "PUBLISHED",
              },
            } as Project)
          }
        >
          Refresh
        </button>
        <output>{progress.publishError}</output>
      </>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));
  const [fail, refresh] = container.querySelectorAll("button");
  act(() => fail.click());
  expect(container.querySelector("output")?.textContent).toBe("Publish failed");
  act(() => refresh.click());
  expect(container.querySelector("output")?.textContent).toBe("");
});

test("a rejected request after project navigation shows a toast", async () => {
  $project.set({ id: "old-project" } as Project);
  $publishDialog.set("publish");
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  let rejectPublish: (error: Error) => void = () => {};
  const publish = new Promise<void>((_, reject) => {
    rejectPublish = reject;
  });

  const Harness = () => {
    const progress = usePublishProgress("old-project");
    return <button onClick={() => progress.start(() => publish)}>Start</button>;
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));
  act(() => container?.querySelector("button")?.click());
  act(() => root?.unmount());
  $project.set({ id: "new-project" } as Project);

  await act(async () => rejectPublish(new Error("Network unavailable")));
  expect(errorToast).toHaveBeenCalledOnce();
});
