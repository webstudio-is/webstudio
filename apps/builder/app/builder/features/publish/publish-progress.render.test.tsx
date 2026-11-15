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
import type { Project } from "@webstudio-is/project";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import {
  createTrpcInterceptor,
  deferred,
  selectTab,
} from "./publish-test-utils";

const reactEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
const originalActEnvironment = reactEnvironment.IS_REACT_ACT_ENVIRONMENT;

let root: Root | undefined;
let container: HTMLDivElement;
let PublishButton: typeof import("./publish").PublishButton;
let stores: typeof import("~/shared/sync/data-stores");
let nanoStates: typeof import("~/shared/nano-states");
let dialog: typeof import("~/builder/shared/nano-states").$publishDialog;
let assetBridge: typeof import("~/shared/asset-content-bridge.client");
let contentSession: ReturnType<typeof createAssetContentSession>;
let interceptor: ReturnType<typeof createTrpcInterceptor>;
let initialPlan: ReturnType<typeof nanoStates.$planFeatures.get>;
let project: Project;
let publish: () => Promise<unknown>;
let refresh: () => Promise<unknown>;
let validate: () => Promise<unknown>;
let job: () => Promise<unknown>;
const requests: { route: string; input: unknown }[] = [];
const checks = {
  diagnostics: { mdxErrors: [], mdxOmissions: [] },
  cssValid: true,
};
const warningChecks = { ...checks, cssValid: false };
const makeProject = (
  id = "project",
  build?: { buildId: string; publishStatus: string }
) =>
  ({
    id,
    domain: "example",
    domainsVirtual: [],
    latestStaticBuild: null,
    latestBuildVirtual:
      build === undefined
        ? null
        : {
            ...build,
            domain: "example",
            createdAt: new Date().toISOString(),
          },
  }) as unknown as Project;

beforeAll(async () => {
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetModules();
  interceptor = createTrpcInterceptor(
    {
      "domain.project": () => refresh(),
      "domain.publish": () => publish(),
      "api.publish.validate": () => validate(),
      "build.contentDatabasePublishDiagnostics": () => validate(),
      "api.publish.getJob": () => job(),
      "domain.countTotalDomains": () => ({
        success: true,
        data: 0,
      }),
      "project.userPublishCount": () => ({
        success: true,
        data: 0,
        limit: 100,
      }),
    },
    (route, input) => requests.push({ route, input })
  );
  interceptor.start();
  PublishButton = (await import("./publish")).PublishButton;
  stores = await import("~/shared/sync/data-stores");
  nanoStates = await import("~/shared/nano-states");
  initialPlan = nanoStates.$planFeatures.get();
  dialog = (await import("~/builder/shared/nano-states")).$publishDialog;
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
  project = makeProject();
  publish = async () => ({ success: false, error: "request rejection" });
  refresh = async () => ({ success: true, project });
  validate = async () => checks;
  job = async () => ({ status: "failed", code: "runner_failed" });
  requests.length = 0;
  stores.$project.set(project);
  stores.$pages.set({
    homePageId: "home",
    rootFolderId: "root",
    pages: new Map(),
    folders: new Map(),
  });
  stores.$instances.set(new Map());
  stores.$props.set(new Map());
  stores.$dataSources.set(new Map());
  stores.$resources.set(new Map());
  stores.$assets.set(new Map());
  nanoStates.$authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  nanoStates.$planFeatures.set({
    ...initialPlan,
    allowPublishLogs: false,
  });
  dialog.set("publish");
  vi.spyOn(toast, "error").mockImplementation(() => "");
  vi.spyOn(toast, "success").mockImplementation(() => "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  act(() => root?.unmount());
  root = undefined;
  container.remove();
  dialog.set("none");
  stores.$project.set(undefined);
  stores.$pages.set(undefined);
  assetBridge.__testing__.clearBridge();
  contentSession.dispose();
  nanoStates.$planFeatures.set(initialPlan);
  nanoStates.$authPermit.set("view");
  vi.useRealTimers();
  vi.restoreAllMocks();
});

afterAll(() => {
  interceptor.stop();
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

const button = (label: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>("button"))
    .filter((candidate) => {
      const copy = candidate.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("svg").forEach((icon) => icon.remove());
      return copy.textContent?.trim() === label;
    })
    .at(-1);
const click = async (label: string) => {
  const target = button(label);
  expect(target).toBeDefined();
  expect(target?.disabled).toBe(false);
  await act(async () => userEvent.click(target!));
};
const mount = async (projectId = "project") => {
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <PublishButton projectId={projectId} />
      </TooltipProvider>
    )
  );
  if (vi.isFakeTimers()) {
    await act(async () => vi.advanceTimersByTimeAsync(10));
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
const toggle = async (value: "publish" | "none" | "export") => {
  if (value === "none") {
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      )
    );
  } else if (value === "publish" && dialog.get() === "none") {
    await act(async () =>
      container.querySelector<HTMLButtonElement>("button")?.click()
    );
  } else {
    await act(async () => dialog.set(value));
  }
  if (vi.isFakeTimers()) {
    await act(async () => vi.advanceTimersByTimeAsync(20));
  }
  if (value === "publish") {
    const domains = Array.from(
      document.body.querySelectorAll<HTMLInputElement>(
        'input[name="domainToPublish[]"]'
      )
    );
    if (domains.length > 0 && domains.every((domain) => !domain.checked)) {
      await act(async () =>
        document.body.querySelector<HTMLElement>('[role="checkbox"]')?.click()
      );
    }
  }
};

const waitFor = async (check: () => void) => {
  await vi.waitFor(async () => {
    await act(async () => {});
    check();
  });
};
const banner = () => button("See issues")?.parentElement;
const accept = () => ({
  success: true,
  buildId: "accepted",
  logHandle: "handle",
  findings: [],
});
const openReport = async (tab: "Errors" | "Warnings") => {
  await click("See issues");
  await waitFor(() =>
    expect(document.body.querySelector('[role="tablist"]')).not.toBeNull()
  );
  await selectTab(tab);
  const report = document.body.querySelector(
    '[role="tabpanel"][data-state="active"]'
  );
  expect(report).not.toBeNull();
  return report!;
};

test.each(["open", "closed", "reopened"] as const)(
  "a transport failure uses the current %s panel without duplicate notices",
  async (state) => {
    const response = deferred<unknown>();
    publish = () => response.promise;
    await mount();
    await click("Publish");
    await waitFor(() =>
      expect(requests.some(({ route }) => route === "domain.publish")).toBe(
        true
      )
    );
    if (state !== "open") {
      await toggle("none");
    }
    if (state === "reopened") {
      await toggle("publish");
    }
    await act(async () => response.reject(new Error("transport failure")));
    await waitFor(() =>
      expect(
        state === "closed" ? toast.error : button("See issues")
      ).toBeDefined()
    );
    if (state === "closed") {
      await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
      await toggle("publish");
    } else {
      expect(toast.error).not.toHaveBeenCalled();
    }
    await waitFor(() =>
      expect(banner()?.textContent).toContain("transport failure")
    );
    await toggle("none");
    await toggle("publish");
    expect(banner()).toBeDefined();
  }
);

test("starting validation clears a request failure", async () => {
  await mount();
  await click("Publish");
  await waitFor(() => expect(banner()).toBeDefined());
  await click("Validate");
  await waitFor(() => expect(button("Validated")).toBeDefined());
  expect(banner()).toBeUndefined();
});

test.each(["PUBLISHED", "none"] as const)(
  "a %s refresh clears a retained status error",
  async (status) => {
    publish = async () => accept();
    project = makeProject("project", {
      buildId: "accepted",
      publishStatus: "FAILED",
    });
    await mount();
    await click("Publish");
    await waitFor(() => expect(banner()).toBeDefined());
    await toggle("none");
    await toggle("publish");
    expect(banner()).toBeDefined();
    project =
      status === "none"
        ? makeProject()
        : makeProject("project", {
            buildId: "accepted",
            publishStatus: status,
          });
    await toggle("none");
    await toggle("publish");
    await waitFor(() => expect(banner()).toBeUndefined());
  }
);

test.each(["PUBLISHED", "none"] as const)(
  "a %s refresh preserves a rejected request error",
  async (status) => {
    project =
      status === "none"
        ? makeProject()
        : makeProject("project", { buildId: "old", publishStatus: status });
    await mount();
    await click("Publish");
    await waitFor(() => expect(banner()).toBeDefined());
    await toggle("none");
    await toggle("publish");
    await waitFor(() =>
      expect(
        requests.filter(({ route }) => route === "domain.project").length
      ).toBeGreaterThan(1)
    );
    expect(banner()?.textContent).toContain("request rejection");
  }
);

test.each(["PUBLISHED", "FAILED"] as const)(
  "a recovered %s build replaces a lost response only when the build changes",
  async (status) => {
    project = makeProject("project", {
      buildId: "old",
      publishStatus: "PUBLISHED",
    });
    publish = async () => {
      throw new Error("transport failure");
    };
    await mount();
    await click("Publish");
    await waitFor(() =>
      expect(banner()?.textContent).toContain("transport failure")
    );
    await toggle("none");
    await toggle("publish");
    expect(banner()?.textContent).toContain("transport failure");
    project = makeProject("project", { buildId: "new", publishStatus: status });
    await toggle("none");
    await toggle("publish");
    await waitFor(() =>
      expect(stores.$project.get()?.latestBuildVirtual?.buildId).toBe("new")
    );
    if (status === "PUBLISHED") {
      expect(banner()).toBeUndefined();
    } else {
      expect(banner()).toBeDefined();
      expect(banner()?.textContent).not.toContain("transport failure");
    }
  }
);

test("a recovered pending build keeps polling after the popover closes", async () => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
    ],
  });
  project = makeProject("project", {
    buildId: "recovered",
    publishStatus: "PENDING",
  });
  await mount();
  await waitFor(() =>
    expect(
      requests.filter(({ route }) => route === "domain.project")
    ).toHaveLength(2)
  );
  await act(async () => vi.advanceTimersByTimeAsync(10));
  await toggle("none");
  project = makeProject("project", {
    buildId: "recovered",
    publishStatus: "PUBLISHED",
  });
  await act(async () => vi.advanceTimersByTimeAsync(15_100));
  expect(toast.success).toHaveBeenCalledOnce();
});

test("an older recovered poll cannot replace a newer popover refresh", async () => {
  const stale = deferred<unknown>();
  let refreshes = 0;
  project = makeProject("project", {
    buildId: "recovered",
    publishStatus: "PENDING",
  });
  refresh = async () =>
    ++refreshes === 2 ? stale.promise : { success: true, project };
  await mount();
  await waitFor(() => expect(refreshes).toBe(2));
  project = makeProject("project", {
    buildId: "new",
    publishStatus: "PUBLISHED",
  });
  await toggle("none");
  await toggle("publish");
  await waitFor(() =>
    expect(stores.$project.get()?.latestBuildVirtual?.buildId).toBe("new")
  );
  await act(async () =>
    stale.resolve({
      success: true,
      project: makeProject("project", {
        buildId: "old",
        publishStatus: "PUBLISHED",
      }),
    })
  );
  expect(stores.$project.get()?.latestBuildVirtual?.buildId).toBe("new");
});

test("an old status request cannot update a remounted copy of the same project", async () => {
  const stale = deferred<unknown>();
  let refreshes = 0;
  project = makeProject("project", {
    buildId: "recovered",
    publishStatus: "PENDING",
  });
  refresh = async () =>
    ++refreshes === 2 ? stale.promise : { success: true, project };
  await mount();
  await waitFor(() => expect(refreshes).toBe(2));
  act(() => root?.unmount());
  project = makeProject("other");
  stores.$project.set(project);
  project = makeProject("project", {
    buildId: "new",
    publishStatus: "PUBLISHED",
  });
  stores.$project.set(project);
  root = createRoot(container);
  await mount();
  await act(async () =>
    stale.resolve({
      success: true,
      project: makeProject("project", {
        buildId: "old",
        publishStatus: "PUBLISHED",
      }),
    })
  );
  expect(stores.$project.get()?.latestBuildVirtual?.buildId).toBe("new");
  expect(toast.success).not.toHaveBeenCalled();
});

test.each(["success", "transport"] as const)(
  "an old project's %s response cannot finish a new project's publish",
  async (outcome) => {
    const old = deferred<unknown>();
    const current = deferred<unknown>();
    let publishes = 0;
    publish = () => (++publishes === 1 ? old.promise : current.promise);
    await mount();
    await click("Publish");
    await waitFor(() => expect(publishes).toBe(1));
    project = makeProject("new-project");
    await act(async () => stores.$project.set(project));
    await mount("new-project");
    await click("Publish");
    await waitFor(() => expect(publishes).toBe(2));
    await act(async () => {
      if (outcome === "success") {
        old.resolve(accept());
      } else {
        old.reject(new Error("old failure"));
      }
    });
    expect(button("Publishing (60s)")?.disabled).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    await act(async () =>
      current.resolve({ success: false, error: "current failure" })
    );
    await waitFor(() => expect(banner()).toBeDefined());
  }
);

test("closing publish hides its countdown while polling continues to completion", async () => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
    ],
  });
  const pending = deferred<unknown>();
  publish = async () => accept();
  job = () => pending.promise;
  await mount();
  await click("Publish");
  await waitFor(() =>
    expect(requests.some(({ route }) => route === "api.publish.getJob")).toBe(
      true
    )
  );
  expect(button("Publishing (60s)")?.disabled).toBe(true);
  await act(async () => vi.advanceTimersByTimeAsync(10_000));
  expect(button("Publishing (50s)")?.disabled).toBe(true);
  await toggle("none");
  await toggle("publish");
  expect(button("Publish")?.disabled).toBe(true);
  await toggle("none");
  project = makeProject("project", {
    buildId: "accepted",
    publishStatus: "PUBLISHED",
  });
  await act(async () => pending.resolve({ status: "success" }));
  await act(async () => vi.advanceTimersByTimeAsync(100));
  await toggle("publish");
  expect(button("Publish")?.disabled).toBe(false);
  expect(button("Publish")?.dataset.state).not.toBe("pending");
  expect(toast.success).toHaveBeenCalledOnce();
});

test.each(["validation", "publish"] as const)(
  "%s diagnostics remain available after the popover reopens",
  async (action) => {
    nanoStates.$planFeatures.set({
      ...nanoStates.$planFeatures.get(),
      allowPublishLogs: true,
    });
    const response = deferred<unknown>();
    publish = () => response.promise;
    validate = async () => warningChecks;
    await mount();
    await click(action === "validation" ? "Validate" : "Publish");
    await waitFor(() => expect(banner()).toBeDefined());
    if (action === "publish") {
      await act(async () =>
        response.resolve({ success: false, error: "request rejection" })
      );
      await waitFor(() => expect(button("Publish")?.disabled).toBe(false));
    }
    await toggle("none");
    await toggle("publish");
    expect(banner()).toBeDefined();
    const report = await openReport("Warnings");
    expect(report?.querySelector("button")).not.toBeNull();
  }
);

test("an older validation cannot replace a newer report", async () => {
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: true,
  });
  const old = deferred<unknown>();
  let validations = 0;
  validate = async () => (++validations === 1 ? old.promise : warningChecks);
  await mount();
  await click("Validate");
  await waitFor(() => expect(validations).toBe(1));
  await toggle("none");
  await toggle("publish");
  await click("Validate");
  await waitFor(() => expect(validations).toBe(2));
  await waitFor(() => expect(banner()).toBeDefined());
  await act(async () => old.resolve(checks));
  expect(banner()).toBeDefined();
  expect(button("Validated")).toBeDefined();
  const report = await openReport("Warnings");
  expect(report?.querySelector("button")).not.toBeNull();
});

test("older publish diagnostics cannot replace a newer operation", async () => {
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: true,
  });
  const old = deferred<unknown>();
  let validations = 0;
  validate = async () => (++validations === 1 ? old.promise : warningChecks);
  await mount();
  await click("Publish");
  await waitFor(() => expect(button("Publish")?.disabled).toBe(false));
  await click("Validate");
  await waitFor(() => expect(validations).toBe(2));
  await waitFor(() => expect(banner()).toBeDefined());
  await act(async () => old.resolve(checks));
  expect(banner()).toBeDefined();
  const report = await openReport("Warnings");
  expect(report?.querySelector("button")).not.toBeNull();
});

test("reopening restores validated domains and publishes only those domains", async () => {
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowStagingPublish: true,
  });
  nanoStates.$authPermit.set("own");
  project = {
    ...makeProject("project", { buildId: "old", publishStatus: "PUBLISHED" }),
    domainsVirtual: [
      {
        projectId: "project",
        domainId: "custom",
        domain: "custom.example",
        status: "ACTIVE",
        verified: true,
        latestBuildVirtual: null,
        updatedAt: new Date().toISOString(),
      },
    ],
  } as Project;
  stores.$project.set(project);
  validate = async () => warningChecks;
  await mount();
  const checkboxes = () =>
    Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')
    );
  expect(checkboxes()).toHaveLength(2);
  // The saved build makes staging selected by default. Validate only the custom domain.
  await act(async () => checkboxes()[0].click());
  if (checkboxes()[1].getAttribute("aria-checked") === "false") {
    await act(async () => checkboxes()[1].click());
  }
  await click("Validate");
  await waitFor(() => expect(banner()).toBeDefined());
  await toggle("none");
  await toggle("publish");
  expect(checkboxes().map((item) => item.getAttribute("aria-checked"))).toEqual(
    ["false", "true"]
  );
  const form = button("Publish")!.closest("form")!;
  expect(new FormData(form).getAll("domainToPublish[]")).toEqual([
    "custom.example",
  ]);
  await click("Publish");
  await waitFor(() =>
    expect(
      requests.find(({ route }) => route === "domain.publish")
    ).toBeDefined()
  );
  expect(
    requests.find(({ route }) => route === "domain.publish")?.input
  ).toMatchObject({ domains: ["custom.example"] });
  await waitFor(() => expect(button("Publish")?.disabled).toBe(false));
  await act(async () => checkboxes()[1].click());
  expect(new FormData(form).getAll("domainToPublish[]")).toEqual([]);
});

const selectStatic = async () => {
  await toggle("export");
  const destination = document.body.querySelector<HTMLButtonElement>(
    'button[role="combobox"]'
  );
  await act(async () =>
    destination?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    )
  );
  const option = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((item) => item.textContent?.trim() === "Static");
  expect(option).toBeDefined();
  await act(async () => option?.click());
};

test.each(["site", "static"] as const)(
  "starting diagnostics for the other target keeps %s findings",
  async (first) => {
    let target: "site" | "static" = first;
    publish = async () => ({
      success: false,
      auditFindings: [{ severity: "error", message: `${target} diagnostic` }],
    });
    await mount();
    if (first === "static") {
      await selectStatic();
    }
    await click(
      first === "site" ? "Publish" : "Build and download static site"
    );
    await waitFor(() =>
      expect(
        requests.filter(({ route }) => route === "domain.publish")
      ).toHaveLength(1)
    );
    await waitFor(() => {
      if (first === "static") {
        expect(document.body.querySelector('[role="tablist"]')).not.toBeNull();
      } else {
        expect(banner()).toBeDefined();
        expect(button("Publish")?.disabled).toBe(false);
      }
    });
    if (first === "static") {
      // Close the report before returning to the other publish target.
      const close = document.body.querySelector<HTMLButtonElement>(
        '[role="dialog"] button[aria-label="Close"]'
      );
      expect(close).not.toBeNull();
      await act(async () => close?.click());
    }
    target = first === "site" ? "static" : "site";
    if (target === "static") {
      await selectStatic();
    } else {
      await toggle("publish");
    }
    await click(
      target === "site" ? "Publish" : "Build and download static site"
    );
    await waitFor(() =>
      expect(
        requests.filter(({ route }) => route === "domain.publish")
      ).toHaveLength(2)
    );
    if (target === "static") {
      await waitFor(() =>
        expect(document.body.querySelector('[role="tablist"]')).not.toBeNull()
      );
      await act(async () =>
        document.body
          .querySelector<HTMLButtonElement>(
            '[role="dialog"] button[aria-label="Close"]'
          )
          ?.click()
      );
    }
    if (first === "site") {
      await toggle("publish");
      const report = await openReport("Errors");
      expect(report?.textContent).toContain("site diagnostic");
      expect(report?.textContent).not.toContain("static diagnostic");
    } else {
      await selectStatic();
      const reportButton = document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="Publish log: Static export"]'
      );
      expect(reportButton).not.toBeNull();
      await act(async () => reportButton?.click());
      await waitFor(() =>
        expect(document.body.querySelector('[role="tablist"]')).not.toBeNull()
      );
      expect(
        document.body.querySelector('[role="tabpanel"][data-state="active"]')
          ?.textContent
      ).toContain("static diagnostic");
    }
  }
);
