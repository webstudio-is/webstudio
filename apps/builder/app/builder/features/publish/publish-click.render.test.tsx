import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
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
import { TooltipProvider, toast } from "@webstudio-is/design-system";
import type { Project } from "@webstudio-is/project";
import { createTrpcInterceptor } from "./publish-test-utils";

const reactEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
const originalActEnvironment = reactEnvironment.IS_REACT_ACT_ENVIRONMENT;
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollIntoView"
);

let root: Root | undefined;
let resetStores: (() => void) | undefined;
let publishModule: typeof import("./publish");
let stores: typeof import("~/shared/sync/data-stores");
let nanoStates: typeof import("~/shared/nano-states");
let builderStates: typeof import("~/builder/shared/nano-states");
const requests: Array<{ path: string; input: unknown }> = [];
let publishResponse: unknown = { success: false, error: "Publish blocked" };
let jobStatus: "failed" | "success" = "failed";
let didPublish = false;
const logCursors: Array<number | undefined> = [];
let interceptor: ReturnType<typeof createTrpcInterceptor>;

beforeAll(async () => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: () => undefined,
  });
  vi.resetModules();
  interceptor = createTrpcInterceptor(
    {
      "domain.publish": () => {
        didPublish = (publishResponse as { success: boolean }).success;
        return publishResponse;
      },
      "api.publish.getJob": () => {
        return { status: jobStatus, code: "BUILD_FAILED" };
      },
      "api.publish.getLog": (input) => {
        const cursor = (input as { cursor?: number }).cursor;
        logCursors.push(cursor);
        return {
          availability: "available",
          startedAt: "2026-11-13T10:00:00.000Z",
          completedAt: "2026-11-13T10:00:03.000Z",
          log: {
            encoding: "base64url",
            chunk: btoa(
              String.fromCharCode(
                ...(cursor === undefined ? [0xe2] : [0x82, 0xac])
              )
            ),
            complete: cursor !== undefined,
            nextCursor: cursor === undefined ? 1 : undefined,
            issues: [
              {
                severity: cursor === undefined ? "warning" : "error",
                message: cursor === undefined ? "Early warning" : "Late error",
              },
            ],
          },
        };
      },
      "domain.project": () => {
        return {
          success: true,
          project: {
            id: "project-1",
            domain: "example",
            domainsVirtual: [],
            latestBuildVirtual: didPublish
              ? {
                  domain: "example",
                  buildId: "build-1",
                  createdAt: new Date().toISOString(),
                  publishStatus:
                    jobStatus === "success" ? "PUBLISHED" : "FAILED",
                }
              : null,
          },
        };
      },
      "domain.countTotalDomains": () => ({ success: true, data: 0 }),
      "project.userPublishCount": () => ({
        success: true,
        data: 0,
        limit: 100,
      }),
    },
    (route, input) =>
      requests.push({ path: `/trpc/${route}`, input: { "0": input } })
  );
  interceptor.start();
  publishModule = await import("./publish");
  stores = await import("~/shared/sync/data-stores");
  nanoStates = await import("~/shared/nano-states");
  builderStates = await import("~/builder/shared/nano-states");
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

beforeEach(() => {
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  publishResponse = { success: false, error: "Publish blocked" };
  requests.length = 0;
  jobStatus = "failed";
  didPublish = false;
  logCursors.length = 0;
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: false,
  });
});

test("a successful site runner finishes the current publish and retains its report", async () => {
  jobStatus = "success";
  publishResponse = {
    success: true,
    buildId: "build-1",
    logHandle: "log-handle",
    findings: [],
  };
  stores.$project.set({
    id: "project-1",
    domain: "example",
    domainsVirtual: [],
    latestStaticBuild: null,
  } as unknown as Project);
  nanoStates.$authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  builderStates.$publishDialog.set("publish");
  resetStores = () => {
    stores.$project.set(undefined);
    builderStates.$publishDialog.set("none");
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <publishModule.PublishButton projectId="project-1" />
      </TooltipProvider>
    )
  );
  const domain = document.body.querySelector<HTMLInputElement>(
    'input[name="domainToPublish[]"]'
  )!;
  if (domain.checked === false) {
    await act(async () =>
      document.body.querySelector<HTMLElement>('[role="checkbox"]')?.click()
    );
  }
  const publish = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  )
    .filter((button) => button.textContent === "Publish")
    .at(-1)!;
  await act(async () => publish.click());
  await act(async () =>
    vi.waitFor(() =>
      expect(stores.$project.get()?.latestBuildVirtual?.buildId).toBe("build-1")
    )
  );
  expect(requests.map(({ path }) => path)).toContain(
    "/trpc/api.publish.getJob"
  );
  expect(publish.disabled).toBe(false);
  const report = document.body.querySelector<HTMLButtonElement>(
    'button[aria-label^="Publish log:"]'
  )!;
  await act(async () => report.click());
  expect(
    document.body.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent
  ).toBe("Publish");
  expect(
    document.body.querySelector(
      '[role="tabpanel"][data-state="active"] button[aria-expanded]'
    )
  ).not.toBeNull();
  // The status label is the public result of a completed publish.
  expect(
    document.body.querySelector('[role="tabpanel"][data-state="active"]')
      ?.textContent
  ).toContain("Published");
});

afterEach(() => {
  act(() => {
    root?.unmount();
    resetStores?.();
  });
  root = undefined;
  resetStores = undefined;
  document.body.innerHTML = "";
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: false,
  });
  vi.restoreAllMocks();
});

test("a paid publish loads every log page and hides it after downgrade", async () => {
  jobStatus = "success";
  publishResponse = {
    success: true,
    buildId: "build-1",
    logHandle: "log-handle",
    findings: [],
  };
  stores.$project.set({
    id: "project-1",
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
    allowPublishLogs: true,
  });
  builderStates.$publishDialog.set("publish");
  resetStores = () => {
    stores.$project.set(undefined);
    builderStates.$publishDialog.set("none");
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <publishModule.PublishButton projectId="project-1" />
      </TooltipProvider>
    )
  );
  const domain = document.body.querySelector<HTMLInputElement>(
    'input[name="domainToPublish[]"]'
  )!;
  if (!domain.checked) {
    await act(async () =>
      document.body.querySelector<HTMLElement>('[role="checkbox"]')?.click()
    );
  }
  const publish = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  )
    .filter((button) => button.textContent === "Publish")
    .at(-1)!;
  await act(async () => publish.click());
  await act(async () =>
    vi.waitFor(() => expect(logCursors).toEqual([undefined, 1]))
  );
  const report = document.body.querySelector<HTMLButtonElement>(
    'button[aria-label^="Publish log:"]'
  )!;
  await act(async () => report.click());
  expect(document.body.textContent).toContain("€");
  const selectTab = async (name: string) => {
    const tab = Array.from(
      document.body.querySelectorAll<HTMLElement>('[role="tab"]')
    ).find((candidate) => candidate.textContent?.startsWith(name));
    expect(tab).toBeDefined();
    await act(async () => userEvent.click(tab!));
  };
  await selectTab("Errors");
  expect(document.body.textContent).toContain("Late error");
  await selectTab("Warnings");
  expect(document.body.textContent).toContain("Early warning");
  await selectTab("Publish");

  await act(async () =>
    nanoStates.$planFeatures.set({
      ...nanoStates.$planFeatures.get(),
      allowPublishLogs: false,
    })
  );
  expect(document.body.textContent).not.toContain("€");
  expect(document.body.textContent).toContain(
    "Upgrade to Pro to view publish logs."
  );
});

afterAll(() => {
  interceptor.stop();
  vi.resetModules();
  if (originalScrollIntoView === undefined) {
    Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  } else {
    Object.defineProperty(
      Element.prototype,
      "scrollIntoView",
      originalScrollIntoView
    );
  }
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
});

test("static export reaches the server without waiting for diagnostics", async () => {
  requests.length = 0;
  stores.$project.set({
    id: "project-1",
    domain: "example",
    domainsVirtual: [],
    latestStaticBuild: null,
  } as unknown as Project);
  nanoStates.$authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  builderStates.$publishDialog.set("export");
  resetStores = () => {
    stores.$project.set(undefined);
    nanoStates.$authTokenPermissions.set({
      canClone: true,
      canCopy: true,
      canPublish: false,
    });
    builderStates.$publishDialog.set("none");
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <publishModule.PublishButton projectId="project-1" />
      </TooltipProvider>
    );
  });

  const destination = document.body.querySelector<HTMLButtonElement>(
    'button[role="combobox"]'
  );
  expect(destination).not.toBeNull();
  await act(async () => {
    destination?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
  });
  const staticOption = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((option) => option.textContent?.trim() === "Static");
  expect(staticOption).toBeDefined();
  await act(async () => {
    staticOption?.click();
  });
  const buildButton = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find(
    (button) => button.textContent?.trim() === "Build and download static site"
  );
  expect(buildButton).toBeDefined();
  await act(async () => {
    buildButton?.click();
    await vi.waitFor(() => {
      expect(requests.some(({ path }) => path === "/trpc/domain.publish")).toBe(
        true
      );
    });
  });

  expect(requests).toContainEqual({
    path: "/trpc/domain.publish",
    input: {
      "0": {
        projectId: "project-1",
        destination: "static",
        templates: ["ssg"],
      },
    },
  });
  expect(
    Array.from(document.body.querySelectorAll("a, button")).some(
      (element) => element.textContent?.trim() === "Show element"
    )
  ).toBe(false);
}, 10_000);

test("keeps Diagnostics visible but disabled before there is anything to show", async () => {
  stores.$project.set({
    id: "project-1",
    domain: "example",
    domainsVirtual: [],
    latestStaticBuild: null,
  } as unknown as Project);
  nanoStates.$authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  builderStates.$publishDialog.set("publish");
  resetStores = () => {
    stores.$project.set(undefined);
    builderStates.$publishDialog.set("none");
  };
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <publishModule.PublishButton projectId="project-1" />
      </TooltipProvider>
    );
  });
  const options = document.body.querySelector<HTMLButtonElement>(
    'button[aria-label="Publish options"]'
  );
  expect(options).not.toBeNull();
  await act(async () => {
    options?.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerType: "mouse" })
    );
  });
  const diagnostics = Array.from(
    document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')
  ).find((item) => item.textContent?.trim() === "Diagnostics");
  expect(diagnostics).toBeDefined();
  expect(diagnostics?.getAttribute("data-disabled")).not.toBeNull();
  expect(
    requests.filter(({ path }) => path === "/trpc/project.userPublishCount")
  ).toHaveLength(1);
});

test.each([
  ["Validate", "Errors", false],
  ["Publish", "Errors", false],
  ["Publish", "Publish", true],
] as const)(
  "%s keeps the result in the popover until See issues opens %s",
  async (action, expectedTab, accepted) => {
    const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
    if (accepted) {
      publishResponse = {
        success: true,
        buildId: "build-1",
        logHandle: "log-handle",
        findings: [],
      };
    }
    stores.$project.set({
      id: "project-1",
      domain: "example",
      domainsVirtual: [],
      latestStaticBuild: null,
    } as unknown as Project);
    nanoStates.$authTokenPermissions.set({
      canClone: true,
      canCopy: true,
      canPublish: true,
    });
    builderStates.$publishDialog.set("publish");
    resetStores = () => {
      stores.$project.set(undefined);
      builderStates.$publishDialog.set("none");
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <TooltipProvider>
          <publishModule.PublishButton projectId="project-1" />
        </TooltipProvider>
      );
    });

    const domain = document.body.querySelector<HTMLInputElement>(
      'input[name="domainToPublish[]"]'
    );
    expect(domain).not.toBeNull();
    if (domain?.checked === false) {
      const checkbox =
        document.body.querySelector<HTMLElement>('[role="checkbox"]');
      expect(checkbox).not.toBeNull();
      await act(async () => checkbox?.click());
    }
    expect(
      new FormData(domain?.closest("form")!).getAll("domainToPublish[]")
    ).toEqual(["example"]);

    const actionButton = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button")
    )
      .filter((button) => button.textContent?.trim() === action)
      .at(-1);
    expect(actionButton).toBeDefined();
    expect(actionButton?.disabled).toBe(false);
    await act(async () => actionButton?.click());
    await vi.waitFor(() => {
      expect(
        Array.from(document.body.querySelectorAll("button")).some(
          (button) => button.textContent?.trim() === "See issues"
        )
      ).toBe(true);
    });
    if (accepted) {
      await vi.waitFor(() => {
        const seeIssues = Array.from(
          document.body.querySelectorAll<HTMLButtonElement>("button")
        ).find((button) => button.textContent?.trim() === "See issues");
        expect(seeIssues?.parentElement?.textContent).toContain(
          "Publish failed"
        );
      });
    }

    expect(builderStates.$publishDialog.get()).toBe("publish");
    if (action === "Validate") {
      expect(errorToast).not.toHaveBeenCalled();
    }
    if (accepted) {
      expect(requests.map(({ path }) => path)).toContain(
        "/trpc/api.publish.getJob"
      );
    }
    expect(document.body.querySelector('[role="tablist"]')).toBeNull();
    const seeIssues = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.trim() === "See issues");
    await act(async () => seeIssues?.click());
    expect(builderStates.$publishDialog.get()).toBe("none");
    expect(document.body.querySelector('[role="tablist"]')).not.toBeNull();
    expect(
      document.body.querySelector<HTMLElement>(
        '[role="tab"][aria-selected="true"]'
      )?.textContent
    ).toBe(expectedTab);
  }
);
