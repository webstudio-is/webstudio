import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi,
} from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import {
  createTrpcInterceptor,
  deferred,
  selectTab,
} from "./publish-test-utils";

const encoded = (bytes: number[]) => btoa(String.fromCharCode(...bytes));
const logRequests: Array<{
  cursor?: number;
  projectId: string;
  buildId: string;
}> = [];
let publishRequests = 0;
let buildId = "build-1";
let acceptedBuildId = "previous-build";
let withHandle = true;
let pendingLogResponses = 0;
let failedLogResponses = 0;
let holdLog:
  | { cursor?: number; response: ReturnType<typeof deferred<void>> }
  | undefined;
let heldJob: ReturnType<typeof deferred<unknown>> | undefined;
let heldPublish: ReturnType<typeof deferred<unknown>> | undefined;
let interceptor: ReturnType<typeof createTrpcInterceptor>;
let PublishButton: typeof import("./publish").PublishButton;
let stores: typeof import("~/shared/sync/data-stores");
let nanoStates: typeof import("~/shared/nano-states");
let publishDialog: typeof import("~/builder/shared/nano-states").$publishDialog;
let root: Root;
let container: HTMLDivElement;
const reactEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
const originalActEnvironment = reactEnvironment.IS_REACT_ACT_ENVIRONMENT;
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollIntoView"
);

beforeAll(async () => {
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: () => {},
  });
  vi.resetModules();
  interceptor = createTrpcInterceptor({
    "domain.project": () => ({
      success: true,
      project: {
        ...stores.$project.get(),
        latestBuildVirtual: {
          domain: "example",
          buildId: acceptedBuildId,
          createdAt: new Date().toISOString(),
          publishStatus: "PUBLISHED",
        },
      },
    }),
    "domain.countTotalDomains": () => ({ success: true, data: 0 }),
    "project.userPublishCount": () => ({
      success: true,
      data: 0,
      limit: 100,
    }),
    "domain.publish": async () => {
      publishRequests += 1;
      const data = heldPublish
        ? await heldPublish.promise
        : {
            success: true,
            buildId,
            ...(withHandle ? { logHandle: "handle" } : {}),
            findings: [],
          };
      acceptedBuildId = (data as { buildId: string }).buildId;
      return data;
    },
    "api.publish.getJob": () =>
      heldJob ? heldJob.promise : { status: "success" },
    "api.publish.getLog": async (value) => {
      const input = value as (typeof logRequests)[number];
      logRequests.push(input);
      if (pendingLogResponses > 0) {
        pendingLogResponses -= 1;
        return { availability: "pending" };
      }
      if (failedLogResponses > 0) {
        failedLogResponses -= 1;
        throw new Error("Temporary log failure");
      }
      const first = input.cursor === undefined;
      if (
        input.buildId === "build-1" &&
        holdLog &&
        holdLog.cursor === input.cursor
      ) {
        await holdLog.response.promise;
      }
      return {
        availability: "available",
        startedAt: "2026-11-13T10:00:00.000Z",
        completedAt: "2026-11-13T10:00:03.000Z",
        log: {
          encoding: "base64url",
          chunk: first ? encoded([0xe2]) : encoded([0x82, 0xac]),
          complete: !first,
          nextCursor: first ? 1 : undefined,
          issues: [
            {
              severity: first ? "warning" : "error",
              message: first ? "Early warning" : "Late error",
            },
          ],
          issuesOmitted: first ? 1 : 0,
        },
      };
    },
    "build.contentDatabasePublishDiagnostics": () => ({
      mdxErrors: [],
      mdxOmissions: [],
    }),
    "api.publish.validate": () => ({
      diagnostics: { mdxErrors: [], mdxOmissions: [] },
      cssValid: true,
    }),
  });
  interceptor.start();
  PublishButton = (await import("./publish")).PublishButton;
  stores = await import("~/shared/sync/data-stores");
  nanoStates = await import("~/shared/nano-states");
  publishDialog = (await import("~/builder/shared/nano-states")).$publishDialog;
  (await import("~/shared/csrf.client")).updateCsrfToken("test-token");
});

const project = (id: string) =>
  ({
    id,
    domain: "example",
    domainsVirtual: [],
    latestStaticBuild: null,
    latestBuildVirtual: {
      domain: "example",
      buildId: "previous-build",
      createdAt: new Date().toISOString(),
      publishStatus: "PUBLISHED",
    },
  }) as unknown as Project;

beforeEach(() => {
  buildId = "build-1";
  acceptedBuildId = "previous-build";
  publishRequests = 0;
  logRequests.length = 0;
  withHandle = true;
  pendingLogResponses = 0;
  failedLogResponses = 0;
  holdLog = undefined;
  heldJob = undefined;
  heldPublish = undefined;
  nanoStates.$authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: true,
  });
  stores.$project.set(project("project-1"));
  publishDialog.set("publish");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  act(() => root.unmount());
  holdLog?.response.resolve();
  heldJob?.resolve({ status: "success" });
  heldPublish?.resolve({ success: true, buildId: "stale-build", findings: [] });
  await act(async () => {});
  container.remove();
  stores.$project.set(undefined);
  publishDialog.set("none");
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: false,
  });
  vi.useRealTimers();
});

afterAll(() => {
  interceptor.stop();
  vi.resetModules();
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  if (originalScrollIntoView === undefined) {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  } else {
    Object.defineProperty(
      Element.prototype,
      "scrollIntoView",
      originalScrollIntoView
    );
  }
});

const render = async (projectId = "project-1") => {
  await act(async () =>
    root.render(
      <TooltipProvider>
        <PublishButton projectId={projectId} />
      </TooltipProvider>
    )
  );
};
const setPaid = async (allowPublishLogs: boolean) => {
  await act(async () =>
    nanoStates.$planFeatures.set({
      ...nanoStates.$planFeatures.get(),
      allowPublishLogs,
    })
  );
};
const publish = async () => {
  await act(async () => publishDialog.set("none"));
  await act(async () => publishDialog.set("publish"));
  const domain = document.body.querySelector<HTMLInputElement>(
    'input[name="domainToPublish[]"]'
  );
  expect(domain).not.toBeNull();
  if (domain?.checked === false) {
    await act(async () =>
      document.body.querySelector<HTMLElement>('[role="checkbox"]')?.click()
    );
  }
  const button = Array.from(
    domain!.closest("form")!.querySelectorAll<HTMLButtonElement>("button")
  ).at(-1)!;
  await waitFor(() => expect(button.disabled).toBe(false));
  const previousRequests = publishRequests;
  await act(async () => button.click());
  await act(async () =>
    vi.waitFor(() => expect(publishRequests).toBe(previousRequests + 1))
  );
};
const openReport = async () => {
  await act(async () =>
    document.body
      .querySelector<HTMLButtonElement>('button[aria-label^="Publish log:"]')
      ?.click()
  );
  expect(document.body.querySelector('[role="tablist"]')).not.toBeNull();
};
const panel = () =>
  document.body.querySelector<HTMLElement>(
    '[role="tabpanel"][data-state="active"]'
  )!;

const waitFor = async (assertion: () => void) => {
  await vi.waitFor(async () => {
    await act(async () => {});
    assertion();
  });
};
const entries = () =>
  Array.from(
    panel().querySelectorAll<HTMLElement>('[aria-labelledby^="publish-title-"]')
  );
const changeProject = async (id: string) => {
  await act(async () => {
    stores.$project.set(project(id));
  });
  await render(id);
};

test("a pending publish shows its local start time, then the runner time and duration", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T10:00:00.000Z"));
  heldJob = deferred<unknown>();
  await render();
  const localStart = new Date().toLocaleString();
  await publish();
  await openReport();
  // Timestamp and duration formatting are the report's public data contract.
  expect(panel().textContent).toContain(`Started: ${localStart}`);
  await act(async () => heldJob?.resolve({ status: "success" }));
  await waitFor(() =>
    expect(panel().querySelector("pre")?.textContent).toBe("€")
  );
  expect(panel().textContent).toContain(
    `Started: ${new Date("2026-11-13T10:00:00.000Z").toLocaleString()}`
  );
  expect(panel().textContent).toContain("Duration: 3s");
  await setPaid(false);
  expect(panel().textContent).not.toContain("Started:");
  expect(panel().textContent).not.toContain("Duration:");
});

test("retries pending and failed log reads before giving up on the session", async () => {
  vi.useFakeTimers();
  pendingLogResponses = 1;
  failedLogResponses = 1;
  await render();
  await publish();
  await openReport();
  await act(async () => vi.waitFor(() => expect(logRequests).toHaveLength(1)));
  await act(async () => vi.advanceTimersByTimeAsync(5_000));
  await act(async () => vi.waitFor(() => expect(logRequests).toHaveLength(2)));
  await act(async () => vi.advanceTimersByTimeAsync(5_000));
  await waitFor(() =>
    expect(panel().querySelector("pre")?.textContent).toBe("€")
  );
  expect(logRequests.map(({ cursor }) => cursor)).toEqual([
    undefined,
    undefined,
    undefined,
    1,
  ]);
});

test("Free does not fetch logs; upgrading reads UTF-8 from byte zero and preserves issue severity", async () => {
  await setPaid(false);
  await render();
  await publish();
  await openReport();
  expect(logRequests).toHaveLength(0);
  expect(panel().querySelector("pre")).toBeNull();
  expect(panel().querySelector('[role="note"]')).not.toBeNull();
  await setPaid(true);
  await waitFor(() =>
    expect(panel().querySelector("pre")?.textContent).toBe("€")
  );
  expect(logRequests.map(({ cursor }) => cursor)).toEqual([undefined, 1]);
  for (const [name, message] of [
    ["Errors", "Late error"],
    ["Warnings", "Early warning"],
  ]) {
    await selectTab(name);
    expect(panel().textContent).toContain(message);
    // Issue truncation is returned by the runner, not inferred from visible issues.
    expect(panel().textContent).toContain("1 more issues not shown.");
  }
  await setPaid(false);
  expect(panel().textContent).not.toContain("Late error");
  expect(panel().textContent).not.toContain("Early warning");
  expect(document.body.querySelector("pre")).toBeNull();
});

test("an accepted publish without a log handle is retained without retrying dispatch or reading logs", async () => {
  withHandle = false;
  await render();
  await publish();
  await openReport();
  expect(entries()).toHaveLength(1);
  expect(publishRequests).toBe(1);
  expect(logRequests).toHaveLength(0);
});

test("a paid response after downgrade cannot restore logs; upgrading restarts from byte zero", async () => {
  holdLog = { cursor: 1, response: deferred<void>() };
  await render();
  await publish();
  await act(async () => vi.waitFor(() => expect(logRequests).toHaveLength(2)));
  await openReport();
  await setPaid(false);
  await act(async () => holdLog?.response.resolve());
  expect(panel().querySelector("pre")).toBeNull();
  await setPaid(true);
  await waitFor(() =>
    expect(panel().querySelector("pre")?.textContent).toBe("€")
  );
  expect(logRequests.slice(2).map(({ cursor }) => cursor)).toEqual([
    undefined,
    1,
  ]);
});

test("a log response from the previous project cannot populate the new project's report", async () => {
  holdLog = { response: deferred<void>() };
  await render();
  await publish();
  await act(async () => vi.waitFor(() => expect(logRequests).toHaveLength(1)));
  await changeProject("project-2");
  await act(async () => holdLog?.response.resolve());
  await openReport();
  expect(entries()).toHaveLength(0);
  expect(logRequests).toHaveLength(1);
});

test("a dispatch accepted after leaving and returning to its project cannot restore the old session", async () => {
  heldPublish = deferred<unknown>();
  await render();
  await publish();
  await changeProject("project-2");
  await changeProject("project-1");
  await act(async () =>
    heldPublish?.resolve({
      success: true,
      buildId: "stale-build",
      logHandle: "stale-handle",
      findings: [],
    })
  );
  await openReport();
  expect(entries()).toHaveLength(0);
  expect(logRequests).toHaveLength(0);
});

test("keeping ten publishes evicts an older in-flight reader before its next page", async () => {
  holdLog = { response: deferred<void>() };
  await render();
  await publish();
  await act(async () => vi.waitFor(() => expect(logRequests).toHaveLength(1)));
  for (let index = 0; index < 10; index++) {
    buildId = `new-build-${index}`;
    await publish();
  }
  await act(async () => holdLog?.response.resolve());
  await openReport();
  expect(entries()).toHaveLength(10);
  expect(document.getElementById("publish-title-build-1")).toBeNull();
  expect(
    logRequests.filter((request) => request.buildId === "build-1")
  ).toHaveLength(1);
});
