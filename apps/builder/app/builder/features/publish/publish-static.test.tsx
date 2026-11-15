import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { TooltipProvider, toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { createTrpcInterceptor } from "./publish-test-utils";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let publishModule: typeof import("./publish");
let nanoStates: typeof import("~/shared/nano-states");
let publishDialog: typeof import("~/builder/shared/nano-states").$publishDialog;
const acceptedResponse = {
  success: true,
  buildId: "static-1",
  logHandle: "handle-1",
  findings: [],
  name: "site.zip",
};
let staticResponse: unknown = acceptedResponse;
let projectStore: (typeof import("~/shared/sync/data-stores"))["$project"];
let getJobStatus: "pending" | "success" | "failed" = "pending";
let publishRequests = 0;
let jobRequests = 0;
const downloads = vi.fn();
let interceptor: ReturnType<typeof createTrpcInterceptor>;

// Observe the real download URL without navigating away from the test runner.
const interceptDownload = (event: NavigateEvent) => {
  const url = new URL(event.destination.url);
  if (url.pathname.startsWith("/cgi/static/ssg/")) {
    event.preventDefault();
    downloads(url.pathname);
  }
};

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(async () => {
  window.navigation.addEventListener("navigate", interceptDownload);
  vi.resetModules();
  interceptor = createTrpcInterceptor({
    "build.contentDatabasePublishDiagnostics": () => ({
      mdxErrors: [],
      mdxOmissions: [],
    }),
    "domain.publish": () => {
      publishRequests += 1;
      return staticResponse;
    },
    "api.publish.getJob": () => {
      jobRequests += 1;
      return { status: getJobStatus };
    },
    "domain.project": () => ({
      success: true,
      project: {
        ...projectStore.get(),
        latestStaticBuild:
          publishRequests === 0
            ? null
            : {
                buildId: "static-1",
                updatedAt: new Date().toISOString(),
                publishStatus: "PUBLISHED",
              },
      },
    }),
  });
  interceptor.start();
  publishModule = await import("./publish");
  nanoStates = await import("~/shared/nano-states");
  publishDialog = (await import("~/builder/shared/nano-states")).$publishDialog;
  projectStore = (await import("~/shared/sync/data-stores")).$project;
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

afterEach(async () => {
  await act(async () => root?.unmount());
  if (vi.isFakeTimers()) {
    // Finish queued tRPC batches before switching back to real timers.
    await act(async () => vi.runAllTimersAsync());
  }
  root = undefined;
  container?.remove();
  container = undefined;
  projectStore.set(undefined);
  publishDialog.set("none");
  getJobStatus = "pending";
  staticResponse = acceptedResponse;
  publishRequests = 0;
  jobRequests = 0;
  downloads.mockClear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

afterAll(() => {
  window.navigation.removeEventListener("navigate", interceptDownload);
  interceptor.stop();
});

const createProject = (id = "project-a") =>
  ({
    id,
    domain: "example",
    domainsVirtual: [],
    latestStaticBuild: null,
  }) as unknown as Project;

const staticButton = () =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.startsWith("Build and download static site")
  );

const render = async (open: boolean, projectId = "project-a") => {
  nanoStates.$authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: false,
  });
  if (container === undefined) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  await act(async () => {
    publishDialog.set(open ? "export" : "none");
    root?.render(
      <TooltipProvider>
        <publishModule.PublishButton projectId={projectId} />
      </TooltipProvider>
    );
  });
  if (open && staticButton() === undefined) {
    await act(async () =>
      document.body
        .querySelector<HTMLButtonElement>('button[role="combobox"]')
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        )
    );
    const option = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="option"]')
    ).find((option) => option.textContent?.trim() === "Static");
    expect(option).toBeDefined();
    await act(async () => option?.click());
  }
};

test("reopening an active static publish keeps one status owner and one download", async () => {
  vi.useFakeTimers();
  projectStore.set(createProject());
  await render(true);
  const button = staticButton();
  expect(button).toBeDefined();
  await act(async () => button?.click());
  await act(async () => vi.waitFor(() => expect(jobRequests).toBe(1)));
  expect(publishRequests).toBe(1);
  expect(jobRequests).toBe(1);
  expect(downloads).not.toHaveBeenCalled();
  await render(false);
  await render(true);
  expect(staticButton()?.dataset.state).toBe("pending");
  expect(
    document.body.querySelector(
      'button[aria-label="Publish log: Static export"] svg style'
    )
  ).toBeNull();
  getJobStatus = "success";
  await act(async () => vi.advanceTimersByTimeAsync(15_000));
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(downloads).toHaveBeenCalledOnce();
  });
  expect(downloads).toHaveBeenCalledExactlyOnceWith("/cgi/static/ssg/site.zip");
  expect(staticButton()?.dataset.state).not.toBe("pending");
  expect(publishRequests).toBe(1);
  expect(jobRequests).toBe(2);
});

test("project navigation suppresses an old static download and error toast", async () => {
  vi.useFakeTimers();
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  projectStore.set(createProject());
  await render(true);
  const button = staticButton();
  expect(button).toBeDefined();
  await act(async () => button?.click());
  await act(async () => vi.waitFor(() => expect(jobRequests).toBe(1)));
  await act(async () =>
    vi.waitFor(() =>
      expect(projectStore.get()?.latestStaticBuild?.buildId).toBe("static-1")
    )
  );
  act(() => projectStore.set(createProject("project-b")));
  await render(false, "project-b");
  act(() => projectStore.set(createProject()));
  await render(false, "project-a");
  getJobStatus = "success";
  await act(async () => vi.advanceTimersByTimeAsync(15_000));
  await act(async () => vi.advanceTimersByTimeAsync(1_000));
  expect(downloads).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
});

test("a failed static runner clears progress without starting a download", async () => {
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  getJobStatus = "failed";
  projectStore.set(createProject());
  await render(true);
  const button = staticButton();
  expect(button).toBeDefined();
  await act(async () => button?.click());
  await act(async () => vi.waitFor(() => expect(jobRequests).toBe(1)));
  expect(downloads).not.toHaveBeenCalled();
  expect(errorToast).toHaveBeenCalledOnce();
  expect(staticButton()?.dataset.state).not.toBe("pending");
  await act(async () =>
    document.body
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Publish log: Static export"]'
      )
      ?.click()
  );
  const errors = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((tab) => tab.textContent === "Errors");
  expect(errors).toBeDefined();
  await act(async () => userEvent.click(errors!));
  const showLogs = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent?.trim() === "show logs");
  expect(showLogs).toBeDefined();
  await act(async () => userEvent.click(showLogs!));
  expect(
    document.body.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent
  ).toBe("Publish");
  expect(
    document.body.querySelector(
      '[role="tabpanel"][data-state="active"] [role="note"]'
    )
  ).not.toBeNull();
});

test("the static status reopens an audit rejection instead of an older successful publish", async () => {
  getJobStatus = "success";
  projectStore.set(createProject());
  await render(true);
  const publish = staticButton()!;
  await act(async () => publish.click());
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(downloads).toHaveBeenCalledOnce();
    expect(staticButton()?.dataset.state).not.toBe("pending");
  });
  staticResponse = {
    success: false,
    auditFindings: [{ severity: "error", message: "audit-rejection" }],
  };
  await act(async () => staticButton()?.click());
  const activeTab = () =>
    document.body.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent;
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(activeTab()).toBe("Errors");
  });
  await act(async () =>
    document.body
      .querySelector<HTMLButtonElement>('button[aria-label="Close"]')
      ?.click()
  );
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
  await render(true);
  await act(async () =>
    document.body
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Publish log: Static export"]'
      )
      ?.click()
  );
  expect(activeTab()).toBe("Errors");
});
