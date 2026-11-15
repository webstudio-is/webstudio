import { act } from "react-dom/test-utils";
import { createRoot, type Root } from "react-dom/client";
import { userEvent } from "@vitest/browser/context";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi,
} from "vitest";
import { TooltipProvider, toast } from "@webstudio-is/design-system";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import type { Project } from "@webstudio-is/project";
import type { Pages } from "@webstudio-is/sdk";

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
let root: Root;
let container: HTMLDivElement;
let PublishButton: typeof import("./publish").PublishButton;
let stores: typeof import("~/shared/sync/data-stores");
let nanoStates: typeof import("~/shared/nano-states");
let publishDialog: typeof import("~/builder/shared/nano-states").$publishDialog;
let assetBridge: typeof import("~/shared/asset-content-bridge.client");
let contentSession: ReturnType<typeof createAssetContentSession>;

beforeAll(async () => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules();
  vi.stubGlobal("fetch", async (requestInfo: RequestInfo | URL) => {
    const path = new URL(String(requestInfo), "http://localhost").pathname;
    if (path.includes(",")) {
      const results = path
        .slice("/trpc/".length)
        .split(",")
        .map((route) => {
          if (route === "domain.project") {
            return {
              result: {
                data: { success: true, project: stores.$project.get() },
              },
            };
          }
          if (route === "domain.countTotalDomains") {
            return { result: { data: { success: true, data: 0 } } };
          }
          if (route === "project.userPublishCount") {
            return { result: { data: { success: true, data: 0, limit: 100 } } };
          }
          if (route === "api.publish.getLog") {
            return {
              result: {
                data: {
                  availability: "available",
                  log: {
                    encoding: "base64url",
                    chunk: btoa("older publish output"),
                    complete: true,
                    issues: [
                      { severity: "error", message: "older build issue" },
                    ],
                  },
                },
              },
            };
          }
          throw new Error(`Unexpected request: ${route}`);
        });
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" },
      });
    }
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
          chunk: btoa("older publish output"),
          complete: true,
          issues: [{ severity: "error", message: "older build issue" }],
        },
      });
    }
    if (path === "/trpc/domain.project") {
      return respond({ success: true, project: stores.$project.get() });
    }
    if (path === "/trpc/domain.countTotalDomains") {
      return respond({ success: true, data: 0 });
    }
    if (path === "/trpc/project.userPublishCount") {
      return respond({ success: true, data: 0, limit: 100 });
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
  PublishButton = (await import("./publish")).PublishButton;
  stores = await import("~/shared/sync/data-stores");
  nanoStates = await import("~/shared/nano-states");
  publishDialog = (await import("~/builder/shared/nano-states")).$publishDialog;
  assetBridge = await import("~/shared/asset-content-bridge.client");
  (await import("~/shared/csrf.client")).updateCsrfToken("test-token");
});

beforeEach(() => {
  contentSession = createAssetContentSession({
    authorize: () => true,
    repository: {
      readContent: async () => {
        throw new Error("No assets in this project");
      },
      updateContent: async () => {
        throw new Error("No assets in this project");
      },
    },
  });
  assetBridge.__testing__.initBridge(
    assetBridge.createAssetContentBridge({
      origin: location.origin,
      request: fetch,
      authorize: () => true,
      requireReload: () => {},
      getContentSession: () => contentSession,
    })
  );
  checks = deferred<Response>();
  dispatch = deferred<Response>();
  checkRequests = 0;
  checksRead = 0;
  publishRequests = 0;
  vi.spyOn(toast, "error").mockImplementation(() => "");
  stores.$project.set({
    id: "project",
    domain: "example",
    domainsVirtual: [],
    latestStaticBuild: null,
  } as unknown as Project);
  nanoStates.$authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: false,
  });
  publishDialog.set("none");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  act(() => root.unmount());
  checks.resolve(respond({ mdxErrors: [], mdxOmissions: [] }));
  dispatch.resolve(respond({ success: false, error: "cleanup" }));
  await act(async () =>
    vi.waitFor(() => expect(checksRead).toBe(checkRequests))
  );
  container.remove();
  assetBridge.__testing__.clearBridge();
  contentSession.dispose();
  stores.$project.set(undefined);
  stores.$pages.set(undefined);
  stores.$instances.set(new Map());
  stores.$props.set(new Map());
  stores.$dataSources.set(new Map());
  stores.$resources.set(new Map());
  stores.$assets.set(new Map());
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: false,
  });
  publishDialog.set("none");
  vi.restoreAllMocks();
});

afterAll(() => vi.unstubAllGlobals());

const mount = async (target: "site" | "static") => {
  publishDialog.set(target === "site" ? "publish" : "export");
  await act(async () =>
    root.render(
      <TooltipProvider>
        <PublishButton projectId="project" />
      </TooltipProvider>
    )
  );
  if (target === "static") {
    const destination = document.body.querySelector<HTMLButtonElement>(
      'button[role="combobox"]'
    );
    await act(async () =>
      destination?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      )
    );
    const staticOption = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="option"]')
    ).find((option) => option.textContent?.trim() === "Static");
    await act(async () => staticOption?.click());
    return;
  }
  const domain = document.body.querySelector<HTMLInputElement>(
    'input[name="domainToPublish[]"]'
  );
  if (domain?.checked === false) {
    await act(async () =>
      document.body.querySelector<HTMLElement>('[role="checkbox"]')?.click()
    );
  }
};

const clickPublish = async (target: "site" | "static", expected = 1) => {
  const label =
    target === "site" ? "Publish" : "Build and download static site";
  const button = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  )
    .filter((candidate) => candidate.textContent?.trim() === label)
    .at(-1);
  expect(button).toBeDefined();
  await act(async () => vi.waitFor(() => expect(button?.disabled).toBe(false)));
  await act(async () => button?.click());
  await act(async () =>
    vi.waitFor(() =>
      expect([checkRequests, publishRequests]).toEqual([expected, expected])
    )
  );
};

const completeChecks = async (fail: boolean) => {
  await act(async () => {
    if (fail) {
      checks.reject(new Error("check failure"));
    } else {
      checks.resolve(
        respond({
          diagnostics: { mdxErrors: [], mdxOmissions: [] },
          cssValid: false,
          mdxErrors: [],
          mdxOmissions: [{ filename: "check.mdx", templateName: "missing" }],
        })
      );
    }
    await checks.promise.catch(() => {});
    await vi.waitFor(() => expect(checksRead).toBe(checkRequests));
  });
};

const openErrors = async (target: "site" | "static") => {
  if (target === "site") {
    const issues = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.trim() === "See issues");
    const status = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label^="Publish log:"]'
    );
    expect(issues ?? status).toBeDefined();
    if (issues !== undefined) {
      await act(async () => userEvent.click(issues));
    } else {
      await act(async () => status?.click());
    }
  }
  const findErrors = () =>
    Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="tab"]')
    ).find((tab) => tab.textContent?.startsWith("Errors"));
  await act(async () => vi.waitFor(() => expect(findErrors()).toBeDefined()));
  const errors = findErrors();
  expect(errors).toBeDefined();
  await act(async () => userEvent.click(errors!));
  return document.body.querySelector<HTMLElement>(
    '[role="tabpanel"][data-state="active"]'
  );
};

const closeReport = async () => {
  const close = document.body.querySelector<HTMLButtonElement>(
    '[role="dialog"] button[aria-label="Close"]'
  );
  expect(close).toBeDefined();
  await act(async () => close?.click());
  await vi.waitFor(async () => {
    await act(async () => {});
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });
};

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
  "%s audit rejection remains visible with %s (failed checks: %s)",
  async (target, order, failChecks) => {
    await mount(target);
    await clickPublish(target);
    if (order === "checks-first") {
      await completeChecks(failChecks);
    }
    await act(async () => {
      dispatch.resolve(
        respond({
          success: false,
          auditFindings: [{ severity: "error", message: "server rejection" }],
        })
      );
      await dispatch.promise;
    });
    const errors = await openErrors(target);
    expect(errors?.textContent).toContain("server rejection");
    if (order === "server-first") {
      await completeChecks(failChecks);
    }
    if (failChecks) {
      expect(errors?.textContent?.includes("check failure")).toBe(
        order === "checks-first"
      );
    } else {
      expect(
        Array.from(document.body.querySelectorAll('[role="tab"]')).some((tab) =>
          tab.textContent?.startsWith("Warnings")
        )
      ).toBe(order === "checks-first");
    }
  }
);

test("closing Publish clears a completed validation", async () => {
  stores.$pages.set({
    pages: new Map(),
    folders: new Map(),
  } as unknown as Pages);
  stores.$instances.set(new Map());
  stores.$props.set(new Map());
  stores.$dataSources.set(new Map());
  stores.$resources.set(new Map());
  stores.$assets.set(new Map());
  await mount("site");
  const validate = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  )
    .filter((button) => button.textContent?.trim() === "Validate")
    .at(-1);
  expect(validate).toBeDefined();
  await act(async () => validate?.click());
  await act(async () => vi.waitFor(() => expect(checkRequests).toBe(1)));
  await act(async () => {
    checks.resolve(
      respond({
        diagnostics: { mdxErrors: [], mdxOmissions: [] },
        cssValid: true,
      })
    );
    await checks.promise;
    await vi.waitFor(() => expect(checksRead).toBe(1));
  });
  expect(
    Array.from(document.body.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "Validated"
    )
  ).toBe(true);
  await act(async () => publishDialog.set("none"));
  await act(async () => publishDialog.set("publish"));
  expect(
    Array.from(document.body.querySelectorAll("button")).some(
      (button) => button.textContent?.trim() === "Validate"
    )
  ).toBe(true);
});

test.each([
  ["request", "checks-first"],
  ["request", "server-first"],
  ["transport", "checks-first"],
  ["transport", "server-first"],
] as const)(
  "static %s failure remains visible with %s checks",
  async (failure, order) => {
    await mount("static");
    await clickPublish("static");
    if (order === "checks-first") {
      await completeChecks(false);
    }
    const message = `${failure} failure`;
    await act(async () => {
      if (failure === "request") {
        dispatch.resolve(respond({ success: false, error: message }));
      } else {
        dispatch.reject(new Error(message));
      }
      await dispatch.promise.catch(() => {});
    });
    if (order === "server-first") {
      await completeChecks(false);
    }
    const status = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Publish log: Static export"]'
    );
    await act(async () => status?.click());
    const errors = await openErrors("static");
    expect(errors?.textContent).toContain(message);
  }
);

test.each(["checks-first", "server-first"] as const)(
  "site transport failure remains visible with %s checks",
  async (order) => {
    await mount("site");
    await clickPublish("site");
    if (order === "checks-first") {
      await completeChecks(false);
    }
    await act(async () => {
      dispatch.reject(new Error("site transport failure"));
      await dispatch.promise.catch(() => {});
    });
    if (order === "server-first") {
      await completeChecks(false);
    }
    const errors = await openErrors("site");
    expect(errors?.textContent).toContain("site transport failure");
  }
);

test.each(["request", "transport"] as const)(
  "a static %s failure does not replace an earlier site failure",
  async (failure) => {
    await mount("site");
    await clickPublish("site");
    await completeChecks(false);
    await act(async () => {
      dispatch.resolve(respond({ success: false, error: "site rejection" }));
      await dispatch.promise;
    });
    const originalSiteErrors = await openErrors("site");
    expect(originalSiteErrors?.textContent).toContain("site rejection");
    await closeReport();
    checks = deferred<Response>();
    dispatch = deferred<Response>();
    await mount("static");
    await clickPublish("static", 2);
    await completeChecks(false);
    await act(async () => {
      if (failure === "request") {
        dispatch.resolve(
          respond({ success: false, error: "static rejection" })
        );
      } else {
        dispatch.reject(new Error("static transport"));
      }
      await dispatch.promise.catch(() => {});
    });
    await act(async () =>
      vi.waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          failure === "request" ? "static rejection" : "static transport"
        )
      )
    );
    const staticStatus = document.body.querySelector<HTMLButtonElement>(
      'button[aria-label="Publish log: Static export"]'
    );
    expect(staticStatus).toBeDefined();
    await act(async () => staticStatus?.click());
    const staticErrors = await openErrors("static");
    expect(staticErrors?.textContent).toContain(
      failure === "request" ? "static rejection" : "static transport"
    );
    await closeReport();
    await mount("site");
    const siteErrors = await openErrors("site");
    expect(siteErrors?.textContent).toContain("site rejection");
    expect(siteErrors?.textContent).not.toContain("static rejection");
    expect(siteErrors?.textContent).not.toContain("static transport");
  }
);

test("a site transport error appears only for its attempted domain", async () => {
  stores.$project.set({
    id: "project",
    domain: "example",
    domainsVirtual: [
      {
        domain: "other.example",
        projectId: "project",
        domainId: "other-id",
        status: "ACTIVE",
        verified: true,
        updatedAt: new Date().toISOString(),
        latestBuildVirtual: null,
      },
    ],
    latestStaticBuild: null,
  } as unknown as Project);
  await mount("site");
  await clickPublish("site");
  await completeChecks(false);
  await act(async () => {
    dispatch.reject(new Error("scoped transport failure"));
    await dispatch.promise.catch(() => {});
  });
  const otherDomainStatus = document.body.querySelector<HTMLButtonElement>(
    'button[aria-label="Publish log: other.example"]'
  );
  expect(otherDomainStatus).toBeDefined();
  await act(async () => otherDomainStatus?.click());
  expect(
    document.body.querySelector('[role="dialog"]')?.textContent
  ).not.toContain("scoped transport failure");
  await closeReport();
  await mount("site");
  const attemptedDomainStatus = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>(
      'button[aria-label^="Publish log:"]'
    )
  ).find(
    (button) =>
      button.getAttribute("aria-label") !== "Publish log: other.example"
  );
  expect(attemptedDomainStatus).toBeDefined();
  await act(async () => attemptedDomainStatus?.click());
  expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
    "scoped transport failure"
  );
});

test.each(["site", "static"] as const)(
  "%s check failure has one notice while Publish is open",
  async (target) => {
    await mount(target);
    await clickPublish(target);
    publishDialog.set("publish");
    await completeChecks(true);
    expect(toast.error).toHaveBeenCalledTimes(target === "site" ? 0 : 1);
  }
);

test("an accepted site failure links to its own publish log", async () => {
  await mount("site");
  await clickPublish("site");
  await completeChecks(false);
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
  const errors = await openErrors("site");
  const showLogs = Array.from(
    errors?.querySelectorAll<HTMLButtonElement>("button") ?? []
  ).find((button) => button.textContent?.trim() === "show logs");
  expect(showLogs).toBeDefined();
  await act(async () => showLogs?.click());
  expect(
    document.body.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent
  ).toBe("Publish");
});

test.each([
  ["none", false, 1],
  ["none", true, 0],
  ["export", false, 1],
  ["publish", false, 0],
] as const)(
  "validation completed after switching to %s (reopened: %s)",
  async (destination, reopen, expectedToasts) => {
    const successToast = vi
      .spyOn(toast, "success")
      .mockImplementation(() => "");
    stores.$pages.set({
      pages: new Map(),
      folders: new Map(),
    } as unknown as Pages);
    stores.$instances.set(new Map());
    stores.$props.set(new Map());
    stores.$dataSources.set(new Map());
    stores.$resources.set(new Map());
    stores.$assets.set(new Map());
    await mount("site");
    const validate = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button")
    )
      .filter((button) => button.textContent?.trim() === "Validate")
      .at(-1);
    expect(validate).toBeDefined();
    await act(async () =>
      vi.waitFor(() => expect(validate?.disabled).toBe(false))
    );
    expect(
      new FormData(validate?.closest("form")!).getAll("domainToPublish[]")
    ).toEqual(["example"]);
    await act(async () => validate?.click());
    expect(validate?.dataset.state).toBe("pending");
    await act(async () => vi.waitFor(() => expect(checkRequests).toBe(1)));
    await act(async () => publishDialog.set(destination));
    if (reopen) {
      expect(
        document.body.querySelector('input[name="domainToPublish[]"]')
      ).toBeNull();
      await act(async () => publishDialog.set("publish"));
    }
    await act(async () => {
      checks.resolve(
        respond({
          diagnostics: { mdxErrors: [], mdxOmissions: [] },
          cssValid: true,
        })
      );
      await checks.promise;
      await vi.waitFor(() => expect(checksRead).toBe(1));
    });
    expect(successToast).toHaveBeenCalledTimes(expectedToasts);
    if (destination === "publish" || reopen) {
      expect(
        Array.from(document.body.querySelectorAll("button")).some(
          (button) => button.textContent?.trim() === "Validated"
        )
      ).toBe(true);
    } else {
      await act(async () => publishDialog.set("publish"));
      expect(
        Array.from(document.body.querySelectorAll("button")).some(
          (button) => button.textContent?.trim() === "Validate"
        )
      ).toBe(true);
    }
  }
);

test.each([
  ["site", "request"],
  ["site", "transport"],
  ["site", "audit"],
  ["static", "request"],
  ["static", "transport"],
  ["static", "audit"],
] as const)(
  "a newer %s %s rejection does not show an older build issue",
  async (target, failure) => {
    nanoStates.$planFeatures.set({
      ...nanoStates.$planFeatures.get(),
      allowPublishLogs: true,
    });
    await mount(target);
    await clickPublish(target);
    await completeChecks(false);
    await act(async () => {
      dispatch.resolve(
        respond({
          success: true,
          buildId: "older-build",
          logHandle: "older-handle",
          findings: [],
          ...(target === "static" ? { name: "site.zip" } : {}),
        })
      );
      await dispatch.promise;
    });
    await act(async () =>
      vi.waitFor(() =>
        expect(
          document.body.querySelector<HTMLButtonElement>(
            'button[aria-label^="Publish log:"]'
          )
        ).not.toBeNull()
      )
    );
    checks = deferred<Response>();
    dispatch = deferred<Response>();
    await mount(target);
    await clickPublish(target, 2);
    const message = `new ${failure} failure`;
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
    await completeChecks(false);
    if (target === "static") {
      const status = document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="Publish log: Static export"]'
      );
      await act(async () => status?.click());
    }
    const errors = await openErrors(target);
    expect(errors?.textContent).toContain(message);
    expect(errors?.textContent).not.toContain("older build issue");
  }
);
