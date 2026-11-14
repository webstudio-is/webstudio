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
import { toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const respond = (data: unknown) =>
  new Response(JSON.stringify([{ result: { data } }]), {
    headers: { "Content-Type": "application/json" },
  });
let checks = deferred<Response>();
let dispatch = deferred<Response>();
let checkRequests = 0;
let checksRead = 0;
let publishRequests = 0;
let flowModule: typeof import("./use-publish-flow");
let stores: typeof import("~/shared/sync/data-stores");
let publishDialog: typeof import("~/builder/shared/nano-states").$publishDialog;
let flow: ReturnType<typeof import("./use-publish-flow").usePublishFlow>;
let root: Root;
let container: HTMLDivElement;
let getDiagnosticsReport: typeof import("./diagnostics-utils").getDiagnosticsReport;

const Harness = ({ paid = false }: { paid?: boolean }) => {
  flow = flowModule.usePublishFlow("project", paid, "none");
  return null;
};

beforeAll(async () => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules();
  vi.stubGlobal("fetch", async (requestInfo: RequestInfo | URL) => {
    const path = new URL(String(requestInfo), "http://localhost").pathname;
    if (path === "/trpc/domain.publish") {
      publishRequests += 1;
      return dispatch.promise;
    }
    if (path === "/trpc/api.publish.getJob") {
      return respond({ status: "failed", code: "BUILD_FAILED" });
    }
    if (path === "/trpc/api.publish.getLog") {
      return respond({
        availability: "available",
        log: {
          encoding: "base64url",
          chunk: btoa("old-runner-output"),
          complete: true,
          issues: [{ severity: "error", message: "old-build-issue" }],
          issuesOmitted: 2,
        },
      });
    }
    if (
      path === "/trpc/api.publish.validate" ||
      path === "/trpc/build.contentDatabasePublishDiagnostics"
    ) {
      checkRequests += 1;
      try {
        const response = (await checks.promise).clone();
        const json = response.json.bind(response);
        response.json = async () => {
          const result = await json();
          checksRead += 1;
          return result;
        };
        return response;
      } catch (error) {
        checksRead += 1;
        throw error;
      }
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  flowModule = await import("./use-publish-flow");
  getDiagnosticsReport = (await import("./diagnostics-utils"))
    .getDiagnosticsReport;
  stores = await import("~/shared/sync/data-stores");
  publishDialog = (await import("~/builder/shared/nano-states")).$publishDialog;
  (await import("~/shared/csrf.client")).updateCsrfToken("test-token");
});
beforeEach(() => {
  checks = deferred<Response>();
  dispatch = deferred<Response>();
  checkRequests = 0;
  checksRead = 0;
  publishRequests = 0;
  vi.spyOn(toast, "error").mockImplementation(() => "");
  stores.$project.set({ id: "project" } as Project);
  publishDialog.set("none");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});
afterEach(async () => {
  act(() => root.unmount());
  checks.resolve(respond({ mdxErrors: [], mdxOmissions: [] }));
  dispatch.resolve(respond({ success: false, error: "cleanup" }));
  await act(async () =>
    vi.waitFor(() => expect(checksRead).toBe(checkRequests))
  );
  container.remove();
  stores.$project.set(undefined);
  publishDialog.set("none");
  vi.restoreAllMocks();
});
afterAll(() => vi.unstubAllGlobals());

const start = (target: "site" | "static", domains = ["example.com"]) =>
  act(() => {
    if (target === "site") {
      flow.openSiteReport(undefined, "errors");
      flow.publish({
        target,
        domains,
        timesLeft: 10,
        maxDailyPublishesPerUser: 20,
      });
    } else {
      flow.openStaticReport("errors");
      flow.publish({ target, templates: ["ssg"] });
    }
  });
const waitForUpdate = (check: () => void) =>
  vi.waitFor(async () => {
    await act(async () => {});
    check();
  });
const completeChecks = async (fail = false) =>
  act(async () => {
    if (fail) {
      checks.reject(new Error("check-failure"));
    } else {
      checks.resolve(
        respond({
          diagnostics: { mdxErrors: [], mdxOmissions: [] },
          cssValid: false,
          mdxErrors: [],
          mdxOmissions: [
            {
              filename: "check.mdx",
              templateName: "missing",
              blockInstanceId: "block",
              assetId: "asset",
            },
          ],
        })
      );
    }
    await checks.promise.catch(() => {});
    await vi.waitFor(() => expect(checksRead).toBe(checkRequests));
  });

test.each([
  ["site", "checks-first", false],
  ["site", "checks-first", true],
  ["site", "server-first", false],
  ["site", "server-first", true],
  ["static", "checks-first", false],
  ["static", "checks-first", true],
  ["static", "server-first", false],
  ["static", "server-first", true],
] as const)(
  "%s audit rejection wins with %s (failed checks: %s)",
  async (target, order, failChecks) => {
    start(target);
    await act(async () =>
      vi.waitFor(() => expect([checkRequests, publishRequests]).toEqual([1, 1]))
    );
    let completed: string[] = [];
    if (order === "checks-first") {
      await completeChecks(failChecks);
      await waitForUpdate(() =>
        expect(flow.reportFindings.length).toBeGreaterThan(0)
      );
      completed = flow.reportFindings.map(({ reportText }) => reportText);
    }
    await act(async () => {
      dispatch.resolve(
        respond({
          success: false,
          auditFindings: [{ severity: "error", message: "server-rejection" }],
        })
      );
      await dispatch.promise;
    });
    await waitForUpdate(() =>
      expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
        ...completed,
        "ERROR: server-rejection",
      ])
    );
    if (order === "server-first") {
      await completeChecks(failChecks);
    }
    expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
      ...completed,
      "ERROR: server-rejection",
    ]);
  }
);

test.each([
  ["request", "checks-first"],
  ["request", "server-first"],
  ["transport", "checks-first"],
  ["transport", "server-first"],
] as const)(
  "retains a static %s failure with %s and preserves the site failure",
  async (failure, order) => {
    start("site");
    await act(async () =>
      vi.waitFor(() => expect([checkRequests, publishRequests]).toEqual([1, 1]))
    );
    await act(async () => {
      dispatch.resolve(respond({ success: false, error: "site-rejection" }));
      await dispatch.promise;
    });
    await waitForUpdate(() =>
      expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
        "site-rejection",
      ])
    );
    dispatch = deferred<Response>();
    act(() => flow.publish({ target: "static", templates: ["ssg"] }));
    await act(async () =>
      vi.waitFor(() => expect([checkRequests, publishRequests]).toEqual([2, 2]))
    );
    expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
      "site-rejection",
    ]);
    let completed: string[] = [];
    if (order === "checks-first") {
      act(() => flow.openStaticReport("errors"));
      await completeChecks();
      await waitForUpdate(() =>
        expect(
          flow.reportFindings.some(({ severity }) => severity === "warning")
        ).toBe(true)
      );
      completed = flow.reportFindings.map(({ reportText }) => reportText);
    }
    const message = `${failure}-failure`;
    await act(async () => {
      if (failure === "request") {
        dispatch.resolve(respond({ success: false, error: message }));
      } else {
        dispatch.reject(new Error(message));
      }
      await dispatch.promise.catch(() => {});
    });
    await waitForUpdate(() =>
      expect(flow.staticError?.reportText).toBe(message)
    );
    act(() => flow.openStaticReport());
    expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
      ...completed,
      message,
    ]);
    expect(flow.selectedReport?.tab).toBe("errors");
    expect(toast.error).toHaveBeenCalledWith(message);
    if (order === "server-first") {
      await completeChecks();
    }
    expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
      ...completed,
      message,
    ]);
    act(() => flow.openSiteReport(undefined, "errors"));
    expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
      "site-rejection",
    ]);
  }
);

test.each(["checks-first", "server-first"] as const)(
  "site transport error retains finished findings with %s",
  async (order) => {
    start("site");
    await act(async () =>
      vi.waitFor(() => expect([checkRequests, publishRequests]).toEqual([1, 1]))
    );
    let completed: string[] = [];
    if (order === "checks-first") {
      await completeChecks();
      await waitForUpdate(() =>
        expect(
          flow.reportFindings.some(({ severity }) => severity === "warning")
        ).toBe(true)
      );
      completed = flow.reportFindings.map(({ reportText }) => reportText);
    }
    await act(async () => {
      dispatch.reject(new Error("site-transport"));
      await dispatch.promise.catch(() => {});
    });
    await waitForUpdate(() => expect(flow.siteError).toBe("site-transport"));
    if (order === "server-first") {
      await completeChecks();
    }
    expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
      ...completed,
      "site-transport",
    ]);
    act(() => flow.openSiteReport("other.example", "errors"));
    expect(flow.reportFindings).toEqual([]);
    // The popover consumes the unfiltered error even when another domain's
    // report is selected; scoping must not hide the attempt's banner.
    expect(flow.siteErrorSource).toBe("transport");
    expect(flow.siteError).toBe("site-transport");
    act(() => flow.openSiteReport("example.com", "errors"));
    expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
      ...completed,
      "site-transport",
    ]);
  }
);

test.each(["site", "static"] as const)(
  "%s check failure has one visible notice while Publish is open",
  async (target) => {
    start(target);
    publishDialog.set("publish");
    await act(async () =>
      vi.waitFor(() => expect([checkRequests, publishRequests]).toEqual([1, 1]))
    );
    await completeChecks(true);
    await waitForUpdate(() =>
      expect(flow.reportFindings.length).toBeGreaterThan(0)
    );
    expect(toast.error).toHaveBeenCalledTimes(target === "site" ? 0 : 1);
  }
);

test("an accepted site failure keeps the build association used by the log link", async () => {
  start("site");
  await act(async () =>
    vi.waitFor(() => expect([checkRequests, publishRequests]).toEqual([1, 1]))
  );
  await act(async () => {
    dispatch.resolve(
      respond({
        success: true,
        buildId: "accepted-build",
        logHandle: "handle",
        findings: [],
      })
    );
    await dispatch.promise;
  });
  await waitForUpdate(() =>
    expect(
      flow.reportFindings.find(({ source }) => source === "publish")?.buildId
    ).toBe("accepted-build")
  );
});

test.each([
  ["static", "request"],
  ["static", "transport"],
  ["static", "audit"],
  ["site", "request"],
  ["site", "transport"],
  ["site", "audit"],
] as const)(
  "a newer %s %s rejection does not mix in the older accepted failure",
  async (target, failure) => {
    act(() => root.render(<Harness paid />));
    start(target, ["example.com", "other.example"]);
    await act(async () =>
      vi.waitFor(() => expect([checkRequests, publishRequests]).toEqual([1, 1]))
    );
    await completeChecks();
    await act(async () => {
      dispatch.resolve(
        respond({
          success: true,
          buildId: "old-accepted",
          logHandle: "old-handle",
          findings: [{ severity: "warning", message: "old-audit" }],
          ...(target === "static" ? { name: "site.zip" } : {}),
        })
      );
      await dispatch.promise;
    });
    await waitForUpdate(() => expect(flow.logs[0]?.logState).toBe("available"));
    checks = deferred<Response>();
    dispatch = deferred<Response>();
    start(target);
    await act(async () =>
      vi.waitFor(() => expect([checkRequests, publishRequests]).toEqual([2, 2]))
    );
    const message = `new-${failure}`;
    await act(async () => {
      if (failure === "transport") {
        dispatch.reject(new Error(message));
      } else {
        dispatch.resolve(
          respond(
            failure === "audit"
              ? {
                  success: false,
                  auditFindings: [{ severity: "error", message }],
                }
              : { success: false, error: message }
          )
        );
      }
      await dispatch.promise.catch(() => {});
    });
    const expected = failure === "audit" ? `ERROR: ${message}` : message;
    await waitForUpdate(() =>
      expect(flow.reportFindings.map(({ reportText }) => reportText)).toEqual([
        expected,
      ])
    );
    const report = () =>
      getDiagnosticsReport({
        findings: flow.reportFindings,
        items: flow.reportItems,
        canViewPublishLogs: true,
        includeLatestPublishFindings: flow.includeLatestPublishFindings,
      });
    expect(report().findings.map(({ reportText }) => reportText)).toEqual([
      expected,
    ]);
    expect(report().issuesOmitted).toBeUndefined();
    expect(report().publishes.map(({ buildId }) => buildId)).toEqual([
      "old-accepted",
    ]);
    expect(report().publishText).toBe(
      target === "static"
        ? "Static export\nold-runner-output"
        : "example.com\nother.example\nold-runner-output"
    );
    if (target === "site" && failure === "request") {
      act(() => flow.openSiteReport("other.example", "errors"));
      expect(report().findings.map(({ reportText }) => reportText)).toEqual([
        "WARNING: old-audit",
        "ERROR: old-build-issue",
      ]);
    }
  }
);
