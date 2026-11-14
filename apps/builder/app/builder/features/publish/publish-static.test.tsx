import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { TooltipProvider, toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let publishModule: typeof import("./publish");
let flowModule: typeof import("./use-publish-flow");
let diagnosticsModule: typeof import("./diagnostics");
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
let projectRequests = 0;
const downloads = vi.fn();

const respond = (data: unknown) =>
  new Response(JSON.stringify([{ result: { data } }]), {
    headers: { "Content-Type": "application/json" },
  });

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(async () => {
  vi.resetModules();
  vi.stubGlobal("fetch", async (requestInfo: RequestInfo | URL) => {
    const path = new URL(String(requestInfo), "http://localhost").pathname;
    if (path === "/trpc/build.contentDatabasePublishDiagnostics") {
      return respond({ mdxErrors: [], mdxOmissions: [] });
    }
    if (path === "/trpc/domain.publish") {
      publishRequests += 1;
      return respond(staticResponse);
    }
    if (path === "/trpc/api.publish.getJob") {
      jobRequests += 1;
      return respond({ status: getJobStatus });
    }
    if (path === "/trpc/domain.project") {
      projectRequests += 1;
      return respond({
        success: true,
        project: {
          id: "project-a",
          latestStaticBuild: {
            buildId: "static-1",
            updatedAt: new Date().toISOString(),
            publishStatus: "PUBLISHED",
          },
        },
      });
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  publishModule = await import("./publish");
  flowModule = await import("./use-publish-flow");
  diagnosticsModule = await import("./diagnostics");
  projectStore = (await import("~/shared/sync/data-stores")).$project;
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  projectStore.set(undefined);
  getJobStatus = "pending";
  staticResponse = acceptedResponse;
  publishRequests = 0;
  jobRequests = 0;
  projectRequests = 0;
  downloads.mockClear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

afterAll(() => vi.unstubAllGlobals());

const Harness = ({
  open,
  projectId = "project-a",
}: {
  open: boolean;
  projectId?: string;
}) => {
  const flow = flowModule.usePublishFlow(projectId, false, "none");
  return (
    <TooltipProvider>
      <output>{flow.isPublishing ? "pending" : "idle"}</output>
      <output data-log-status>{flow.logs[0]?.status}</output>
      <output data-static-error>{flow.staticError?.severity}</output>
      {open && (
        <publishModule.__testing__.PublishStatic
          templates={["ssg"]}
          flow={flow}
          onDownload={downloads}
        />
      )}
      <diagnosticsModule.PublishDiagnosticsDialog
        findings={flow.reportFindings}
        includeLatestPublishFindings={flow.includeLatestPublishFindings}
        items={flow.reportItems}
        open={flow.selectedReport !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            flow.closeReport();
          }
        }}
        initialTab={flow.selectedReport?.tab}
        canViewPublishLogs={false}
      />
    </TooltipProvider>
  );
};

const render = (open: boolean, projectId = "project-a") => {
  if (container === undefined) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  }
  act(() => root?.render(<Harness open={open} projectId={projectId} />));
};

test("reopening an active static publish keeps one status owner and one download", async () => {
  vi.useFakeTimers();
  projectStore.set({ id: "project-a", latestStaticBuild: null } as Project);
  render(true);
  const button = Array.from(container!.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "Build and download static site"
  );
  await act(async () => button?.click());
  await act(async () => vi.waitFor(() => expect(projectRequests).toBe(1)));
  expect(publishRequests).toBe(1);
  expect(jobRequests).toBe(1);
  expect(downloads).not.toHaveBeenCalled();
  render(false);
  render(true);
  expect(container?.querySelector("output")?.textContent).toBe("pending");
  getJobStatus = "success";
  await act(async () => vi.advanceTimersByTimeAsync(15_000));
  expect(downloads).toHaveBeenCalledExactlyOnceWith("site.zip");
  expect(container?.querySelector("[data-log-status]")?.textContent).toBe(
    "success"
  );
  expect(publishRequests).toBe(1);
  expect(jobRequests).toBe(2);
  expect(container?.querySelector("[data-static-error]")?.textContent).toBe("");
});

test("project navigation suppresses an old static download and error toast", async () => {
  vi.useFakeTimers();
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  projectStore.set({ id: "project-a", latestStaticBuild: null } as Project);
  render(true);
  const button = Array.from(container!.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "Build and download static site"
  );
  await act(async () => button?.click());
  await act(async () => vi.waitFor(() => expect(projectRequests).toBe(1)));
  await act(async () =>
    vi.waitFor(() =>
      expect(projectStore.get()?.latestStaticBuild?.buildId).toBe("static-1")
    )
  );
  act(() =>
    projectStore.set({ id: "project-b", latestStaticBuild: null } as Project)
  );
  render(false, "project-b");
  act(() =>
    projectStore.set({ id: "project-a", latestStaticBuild: null } as Project)
  );
  render(false, "project-a");
  getJobStatus = "success";
  await act(async () => vi.advanceTimersByTimeAsync(15_000));
  await act(async () => vi.advanceTimersByTimeAsync(1_000));
  expect(downloads).not.toHaveBeenCalled();
  expect(errorToast).not.toHaveBeenCalled();
});

test("a failed static runner clears progress without starting a download", async () => {
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  getJobStatus = "failed";
  projectStore.set({ id: "project-a", latestStaticBuild: null } as Project);
  render(true);
  const button = Array.from(container!.querySelectorAll("button")).find(
    (candidate) => candidate.textContent === "Build and download static site"
  );
  await act(async () => button?.click());
  await act(async () => vi.waitFor(() => expect(jobRequests).toBe(1)));
  expect(downloads).not.toHaveBeenCalled();
  expect(errorToast).toHaveBeenCalledOnce();
  expect(container?.querySelector("[data-log-status]")?.textContent).toBe(
    "failed"
  );
  expect(container?.querySelector("output")?.textContent).toBe("idle");
  await act(async () =>
    userEvent.click(
      container!.querySelector<HTMLButtonElement>(
        'button[aria-label="Publish log: Static export"]'
      )!
    )
  );
  const errors = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((tab) => tab.textContent === "Errors");
  expect(errors).toBeDefined();
  await act(async () => userEvent.click(errors!));
  const showLogs = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "show logs");
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
  projectStore.set({ id: "project-a", latestStaticBuild: null } as Project);
  render(true);
  const publish = Array.from(
    container!.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Build and download static site")!;
  await act(async () => publish.click());
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(container?.querySelector("[data-log-status]")?.textContent).toBe(
      "success"
    );
    expect(container?.querySelector("output")?.textContent).toBe("idle");
  });
  staticResponse = {
    success: false,
    auditFindings: [{ severity: "error", message: "audit-rejection" }],
  };
  await act(async () =>
    Array.from(container!.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent === "Build and download static site")
      ?.click()
  );
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
  await act(async () =>
    container!
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Publish log: Static export"]'
      )
      ?.click()
  );
  expect(activeTab()).toBe("Errors");
});
