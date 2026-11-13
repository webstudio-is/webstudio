import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { TooltipProvider, toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";

let root: Root | undefined;
let container: HTMLDivElement | undefined;
let publishModule: typeof import("./publish");
let logsModule: typeof import("./use-publish-logs");
let projectStore: (typeof import("~/shared/sync/data-stores"))["$project"];
let getJobStatus: "pending" | "success" = "pending";
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
      return respond({
        success: true,
        buildId: "static-1",
        logHandle: "handle-1",
        findings: [],
        name: "site.zip",
      });
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
  logsModule = await import("./use-publish-logs");
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
  const progress = publishModule.__testing__.usePublishProgress(projectId);
  const logs = logsModule.usePublishLogs(projectId, false);
  return (
    <TooltipProvider>
      <output>{progress.isPublishing ? "pending" : "idle"}</output>
      {open && (
        <publishModule.__testing__.PublishStatic
          projectId={projectId}
          templates={["ssg"]}
          publishLogs={logs}
          progress={progress}
          onOpenReport={() => {}}
          onFindings={() => {}}
          onDownload={downloads}
        />
      )}
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
  expect(publishRequests).toBe(1);
  expect(jobRequests).toBe(2);
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
