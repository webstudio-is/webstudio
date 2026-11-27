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
import { TooltipProvider, toast } from "@webstudio-is/design-system";
import { createAssetContentSession } from "@webstudio-is/content-engine/asset-content-session";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  formatBuildIntegrityError,
  getBuildIntegrityIssues,
} from "@webstudio-is/project-build/runtime";
import { ROOT_INSTANCE_ID, type Instance } from "@webstudio-is/sdk";
import {
  createTemplateComponentFixture,
  renderData,
  ws,
} from "@webstudio-is/template";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { createTrpcInterceptor } from "~/shared/trpc/trpc-test-utils";
import {
  createPublishAuditFinding,
  selectStaticDestination,
  selectTab,
} from "./publish-test-utils";

const reactEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
const Body = createTemplateComponentFixture("Body");
const Heading = createTemplateComponentFixture("Heading");
const originalActEnvironment = reactEnvironment.IS_REACT_ACT_ENVIRONMENT;
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  Element.prototype,
  "scrollIntoView"
);

let root: Root | undefined;
let publishModule: typeof import("./publish");
let stores: typeof import("~/shared/sync/data-stores");
let nanoStates: typeof import("~/shared/nano-states");
let builderStates: typeof import("~/builder/shared/nano-states");
let assetBridge: typeof import("~/shared/asset-content-bridge.client");
let contentSession: ReturnType<typeof createAssetContentSession>;
const requests: Array<{ path: string; input: unknown }> = [];
let publishResponse: unknown = { success: false, error: "Publish blocked" };
let validationResponse: unknown = {
  diagnostics: { mdxErrors: [], mdxOmissions: [] },
  cssValid: true,
};
let jobStatus: "failed" | "success" = "failed";
let didPublish = false;
let interceptor: ReturnType<typeof createTrpcInterceptor>;

beforeAll(async () => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: () => undefined,
  });
  vi.resetModules();
  interceptor = createTrpcInterceptor(
    {
      POST: {
        "domain.publish": () => {
          didPublish = (publishResponse as { success: boolean }).success;
          return publishResponse;
        },
      },
      GET: {
        "build.validatePublish": () => validationResponse,
        "api.publish.getJob": () => {
          return { status: jobStatus, code: "BUILD_FAILED" };
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
        "build.contentDatabasePublishDiagnostics": () => ({
          mdxErrors: [],
          mdxOmissions: [],
        }),
      },
    },
    (route, input) =>
      requests.push({ path: `/trpc/${route}`, input: { "0": input } })
  );
  interceptor.start();
  publishModule = await import("./publish");
  stores = await import("~/shared/sync/data-stores");
  nanoStates = await import("~/shared/nano-states");
  builderStates = await import("~/builder/shared/nano-states");
  assetBridge = await import("~/shared/asset-content-bridge.client");
  const { updateCsrfToken } = await import("~/shared/csrf.client");
  updateCsrfToken("test-token");
});

beforeEach(() => {
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  publishResponse = { success: false, error: "Publish blocked" };
  validationResponse = {
    diagnostics: { mdxErrors: [], mdxOmissions: [] },
    cssValid: true,
  };
  requests.length = 0;
  jobStatus = "failed";
  didPublish = false;
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
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: false,
  });
});

const mount = async (dialog: "publish" | "export" = "publish") => {
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
  builderStates.$publishDialog.set(dialog);
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
  return container;
};

const waitFor = async (assertion: () => void, timeout = 10_000) => {
  await vi.waitFor(
    async () => {
      await act(async () => {});
      assertion();
    },
    { timeout }
  );
};

test("a successful site runner finishes the current publish and retains its report", async () => {
  jobStatus = "success";
  publishResponse = {
    success: true,
    buildId: "build-1",
    logHandle: "log-handle",
    findings: [],
  };
  await mount();
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
  await waitFor(() =>
    expect(stores.$project.get()?.latestBuildVirtual?.buildId).toBe("build-1")
  );
  expect(requests.map(({ path }) => path)).toContain(
    "/trpc/api.publish.getJob"
  );
  expect(publish.disabled).toBe(false);
  const seeLogs = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent?.trim() === "See logs");
  expect(seeLogs).toBeDefined();
  expect(seeLogs?.parentElement?.textContent).toContain(
    "Published successfully."
  );
  await act(async () => seeLogs?.click());
  expect(builderStates.$publishDialog.get()).toBe("none");
  expect(
    document.body.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent
  ).toBe("Publish");
  expect(
    document.body.querySelector('[role="tabpanel"][data-state="active"]')
      ?.textContent
  ).toContain("Upgrade to Pro to view publish logs.");
  await act(async () => builderStates.$publishDialog.set("publish"));
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
  await act(async () =>
    document.body
      .querySelector<HTMLButtonElement>(
        '[role="dialog"] button[aria-label="Close"]'
      )
      ?.click()
  );
  await act(async () => builderStates.$publishDialog.set("publish"));
  const validate = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent?.trim() === "Validate");
  expect(validate).toBeDefined();
  await act(async () => validate?.click());
  await waitFor(() =>
    expect(
      Array.from(
        document.body.querySelectorAll<HTMLButtonElement>("button")
      ).some((button) => button.textContent?.trim() === "See issues")
    ).toBe(true)
  );
  expect(document.body.textContent).not.toContain("Published successfully.");
});

test("a rejected publish replaces an older success notice with its findings", async () => {
  jobStatus = "success";
  publishResponse = {
    success: true,
    buildId: "build-1",
    logHandle: "log-handle",
    findings: [],
  };
  await mount();
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
    .filter((button) => button.textContent?.trim() === "Publish")
    .at(-1)!;
  await act(async () => publish.click());
  await waitFor(() =>
    expect(stores.$project.get()?.latestBuildVirtual?.buildId).toBe("build-1")
  );
  expect(document.body.textContent).toContain("Published successfully.");

  publishResponse = {
    success: false,
    auditFindings: [createPublishAuditFinding("new audit failure")],
  };
  const publishAgain = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  )
    .filter((button) => button.textContent?.trim() === "Publish")
    .at(-1)!;
  expect(publishAgain.disabled).toBe(false);
  await act(async () => publishAgain.click());
  await waitFor(() =>
    expect(
      requests.filter(({ path }) => path === "/trpc/domain.publish")
    ).toHaveLength(2)
  );
  const seeIssues = () =>
    Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.trim() === "See issues");
  await waitFor(() => expect(seeIssues()).toBeDefined());
  expect(document.body.textContent).not.toContain("Published successfully.");
  await act(async () => seeIssues()?.click());
  expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain(
    "new audit failure"
  );
});

test("a successful static export links to its publish report until another export starts", async () => {
  const { ExportContent } = await import("./publish-ui");
  const onOpenReport = vi.fn();
  const flow = {
    isPublishing: false,
    publishes: [
      {
        buildId: "build-1",
        target: "static" as const,
        domains: [],
        findings: [],
        status: "success" as const,
        staticName: "site.zip",
      },
    ],
    openStaticReport: onOpenReport,
    exportStatic: () => {},
  } satisfies Parameters<typeof ExportContent>[0]["flow"];
  stores.$project.set({
    id: "project-1",
    domain: "example",
    domainsVirtual: [],
    latestStaticBuild: {
      buildId: "build-1",
      updatedAt: new Date().toISOString(),
      publishStatus: "PUBLISHED",
    },
  } as unknown as Project);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <ExportContent flow={flow} />
      </TooltipProvider>
    )
  );
  await selectStaticDestination(container);
  const seeLogs = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent?.trim() === "See logs");
  expect(seeLogs).toBeDefined();
  expect(seeLogs?.parentElement?.textContent).toContain("Downloaded");
  await act(async () => seeLogs?.click());
  expect(onOpenReport).toHaveBeenCalledWith("publish");
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <ExportContent
          flow={{
            ...flow,
            publishes: [{ ...flow.publishes[0], staticName: undefined }],
          }}
        />
      </TooltipProvider>
    )
  );
  expect(
    Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.trim() === "See logs")
  ).toBeUndefined();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <ExportContent flow={{ ...flow, isPublishing: true }} />
      </TooltipProvider>
    )
  );
  expect(
    Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.trim() === "See logs")
  ).toBeUndefined();
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <ExportContent
          flow={{
            ...flow,
            publishes: [
              {
                ...flow.publishes[0],
                buildId: "build-2",
                status: "failed",
              },
              ...flow.publishes,
            ],
          }}
        />
      </TooltipProvider>
    )
  );
  expect(
    Array.from(
      document.body.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent?.trim() === "See logs")
  ).toBeUndefined();
});

afterEach(() => {
  act(() => {
    root?.unmount();
    stores.$project.set(undefined);
    stores.$pages.set(undefined);
    stores.$instances.set(new Map());
    stores.$dataSources.set(new Map());
    nanoStates.selectInstance(undefined);
    builderStates.$activeInspectorPanel.set("style");
    builderStates.$variablesSectionRequested.set(false);
    builderStates.$publishDialog.set("none");
  });
  root = undefined;
  document.body.innerHTML = "";
  nanoStates.$authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: false,
  });
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: false,
  });
  vi.restoreAllMocks();
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
  const container = await mount("export");
  await selectStaticDestination(container);
  const buildButton = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find(
    (button) => button.textContent?.trim() === "Build and download static site"
  );
  expect(buildButton).toBeDefined();
  await act(async () => buildButton?.click());
  await waitFor(() =>
    expect(requests.some(({ path }) => path === "/trpc/domain.publish")).toBe(
      true
    )
  );

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
      (element) => element.textContent?.trim() === "Show instance"
    )
  ).toBe(false);
}, 30_000);

test("keeps Diagnostics visible but disabled before there is anything to show", async () => {
  await mount();
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

test("publish audit warnings keep their instance links in Diagnostics", async () => {
  const instanceId = "publish-warning-instance";
  const pageId = "publish-warning-page";
  stores.$pages.set(
    createDefaultPages({ rootInstanceId: instanceId, homePageId: pageId })
  );
  stores.$instances.set(
    new Map([
      [
        instanceId,
        {
          type: "instance",
          id: instanceId,
          component: "Box",
          children: [],
        } satisfies Instance,
      ],
    ])
  );
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: true,
  });
  jobStatus = "success";
  publishResponse = {
    success: true,
    buildId: "build-1",
    findings: [
      {
        ruleId: "html-content-model",
        severity: "warning",
        message: "A child does not match the element's content model.",
        location: {
          pageId,
          pageName: "Home",
          pagePath: "/",
          instanceId,
          instanceSelector: [instanceId],
        },
      },
    ],
  };
  await mount();

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
    .filter((button) => button.textContent?.trim() === "Publish")
    .at(-1)!;
  await act(async () => publish.click());
  await waitFor(() =>
    expect(document.body.textContent).toContain("Published successfully.")
  );

  await act(async () =>
    document.body
      .querySelector<HTMLButtonElement>('button[aria-label="Publish options"]')
      ?.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "mouse",
        })
      )
  );
  await act(async () =>
    Array.from(document.body.querySelectorAll<HTMLElement>("[role=menuitem]"))
      .find((item) => item.textContent?.trim() === "Diagnostics")
      ?.click()
  );
  await waitFor(() =>
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
  );
  await selectTab("Warnings");
  const link = document.body.querySelector<HTMLAnchorElement>(
    'a[href*="instance=publish-warning-instance"]'
  );
  expect(link?.textContent).toBe("Show instance");
  expect(new URL(link!.href).searchParams.get("view")).toBe("settings");
  expect(document.body.textContent).not.toContain("Audit");
  expect(document.body.textContent).toContain(
    `Publish warning for "Home" (/): A child does not match the element's content model.`
  );
  await act(async () => link!.click());
  expect(nanoStates.$selectedInstanceSelector.get()).toEqual([instanceId]);
  expect(builderStates.$activeInspectorPanel.get()).toBe("settings");
  expect(builderStates.$variablesSectionRequested.get()).toBe(false);
});

const scopes = [
  {
    scope: "date-card",
    label: "Date card",
    prefix: 'Cannot publish for "Home" (/)',
    selector: "date-card,validation-instance",
  },
  {
    scope: "validation-instance",
    label: "Body",
    prefix: 'Cannot publish for "Home" (/)',
    selector: "validation-instance",
  },
  {
    scope: ROOT_INSTANCE_ID,
    label: "Global root",
    prefix: "Cannot publish",
    selector: ROOT_INSTANCE_ID,
  },
];

test.each(scopes)("links currentDate on $label", async (scopeCase) => {
  const { scope, label, prefix, selector } = scopeCase;
  const pageId = "validation-page";
  const instanceId = "validation-instance";
  const { instances, props } = renderData(
    <Body ws:id={instanceId}>
      <ws.element ws:id="date-card" ws:label="Date card" />
      <ws.element ws:tag="button">
        <Heading ws:id="invalid-heading" ws:tag="h3">
          Heading in button
        </Heading>
      </ws.element>
    </Body>
  );
  stores.$pages.set(
    createDefaultPages({ rootInstanceId: instanceId, homePageId: pageId })
  );
  stores.$instances.set(instances);
  stores.$props.set(props);
  nanoStates.$registeredComponentMetas.set(componentMetas);
  stores.$dataSources.set(
    new Map([
      [
        "missing-resource-variable",
        {
          type: "resource",
          id: "missing-resource-variable",
          name: "currentDate",
          resourceId: "missing-resource",
          scopeInstanceId: scope,
        },
      ],
    ])
  );
  validationResponse = Response.json(
    [
      {
        error: {
          message:
            'Cannot publish: resource variable "currentDate" (missing-resource-variable) references missing resource "missing-resource".',
          code: -32600,
          data: {
            code: "BAD_REQUEST",
            httpStatus: 400,
            path: "build.validatePublish",
            issues: [
              {
                type: "missingResource",
                source: "dataSource",
                dataSourceId: "missing-resource-variable",
                dataSourceName: "currentDate",
                resourceId: "missing-resource",
              },
            ],
          },
        },
      },
    ],
    { status: 400 }
  );
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: true,
  });

  await mount();
  const domain = document.body.querySelector<HTMLInputElement>(
    'input[name="domainToPublish[]"]'
  );
  if (domain?.checked === false) {
    await act(async () =>
      document.body.querySelector<HTMLElement>('[role="checkbox"]')?.click()
    );
  }
  const validate = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent?.trim() === "Validate");
  await act(async () => validate?.click());
  await waitFor(() =>
    expect(document.body.textContent).toContain("See issues")
  );
  expect(document.body.textContent).toContain("1 error · 1 warning");

  const seeIssues = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent?.trim() === "See issues");
  await act(async () => seeIssues?.click());

  const link = Array.from(
    document.body.querySelectorAll<HTMLAnchorElement>("a")
  ).find((link) => link.textContent === "Show instance");
  expect(link).toBeDefined();
  const params = new URL(link!.href).searchParams;
  expect(params.get("pageId")).toBe(pageId);
  expect(params.get("instance")).toBe(selector);
  expect(params.get("view")).toBe("settings/variables");
  expect(params.has("variableId")).toBe(false);
  expect(document.body.textContent).toContain(
    `${prefix}: Resource variable "currentDate" on "${label}" references a missing resource.`
  );
  for (const id of [
    pageId,
    instanceId,
    "missing-resource",
    "missing-resource-variable",
  ]) {
    expect(document.body.textContent).not.toContain(id);
  }
  expect(document.body.textContent).not.toContain("Audit");
  expect(
    document.body.querySelector('[role="tablist"]')?.textContent
  ).toContain("Warnings");
  expect(
    document.body.querySelector('[role="tablist"]')?.textContent
  ).toContain("Errors");
  await selectTab("Warnings");
  expect(document.body.textContent).toContain("Publish warning");
  await selectTab("Errors");
  await act(async () =>
    document.body
      .querySelector<HTMLAnchorElement>('a[href*="settings%2Fvariables"]')
      ?.click()
  );
  expect(nanoStates.$selectedPageId.get()).toBe(pageId);
  expect(nanoStates.$selectedInstanceSelector.get()).toEqual(
    selector.split(",")
  );
  expect(builderStates.$activeInspectorPanel.get()).toBe("settings");
  expect(builderStates.$variablesSectionRequested.get()).toBe(true);
});

test("missing resources beyond the audit limit keep server IDs in the copied report", async () => {
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue(undefined);
  const { instances, props } = renderData(<Body ws:id="body" />);
  stores.$pages.set(createDefaultPages({ rootInstanceId: "body" }));
  stores.$instances.set(instances);
  stores.$props.set(props);
  stores.$resources.set(new Map());
  const dataSources = Array.from({ length: 501 }, (_, index) => ({
    type: "resource" as const,
    id: `source-id-${index}`,
    name: `variable${index}`,
    resourceId: `resource-id-${index}`,
    scopeInstanceId: "body",
  }));
  stores.$dataSources.set(
    new Map(dataSources.map((source) => [source.id, source]))
  );
  const issues = getBuildIntegrityIssues({
    dataSources,
    props: props.values(),
    instances: instances.values(),
    resources: [],
  });
  const message = formatBuildIntegrityError(issues[0], "Cannot publish");
  validationResponse = Response.json(
    [
      {
        error: {
          message,
          code: -32600,
          data: {
            code: "BAD_REQUEST",
            httpStatus: 400,
            path: "build.validatePublish",
            issues,
          },
        },
      },
    ],
    { status: 400 }
  );
  nanoStates.$planFeatures.set({
    ...nanoStates.$planFeatures.get(),
    allowPublishLogs: true,
  });

  await mount();
  const domain = document.body.querySelector<HTMLInputElement>(
    'input[name="domainToPublish[]"]'
  );
  if (domain?.checked === false) {
    await act(async () =>
      document.body.querySelector<HTMLElement>('[role="checkbox"]')?.click()
    );
  }
  const validate = Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "Validate"
  );
  await act(async () => validate?.click());
  await waitFor(() =>
    expect(document.body.textContent).toContain("See issues")
  );
  const seeIssues = Array.from(document.body.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "See issues"
  );
  await act(async () => seeIssues?.click());

  const visibleText = document.body.textContent ?? "";
  expect(visibleText.includes("Unable to complete publish validation")).toBe(
    true
  );
  expect(visibleText.includes('Resource variable "variable0"')).toBe(true);
  expect(visibleText.includes("source-id-0")).toBe(false);
  expect(visibleText.includes("resource-id-0")).toBe(false);

  const copy = document.body.querySelector<HTMLButtonElement>(
    'button[aria-label="Copy all reports"]'
  );
  await act(async () => copy?.click());
  expect(writeText.mock.calls[0]?.[0]).toContain(
    `ERROR: Unable to complete publish validation\n${message}`
  );
});

test("an unmatched missing-resource failure sends only the validation summary to the toast", async () => {
  const errorToast = vi.spyOn(toast, "error").mockImplementation(() => "");
  const { reportPublishValidationFailure } =
    await import("./publish-validation");
  reportPublishValidationFailure(
    Object.assign(new Error('Resource variable references "resource-id".'), {
      data: {
        issues: [
          {
            type: "missingResource",
            dataSourceId: "source-id",
            resourceId: "resource-id",
          },
        ],
      },
    }),
    () => {}
  );
  expect(errorToast).toHaveBeenCalledWith(
    "Unable to complete publish validation"
  );
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
    await mount();

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
    await vi.waitFor(
      () => {
        expect(
          Array.from(document.body.querySelectorAll("button")).some(
            (button) => button.textContent?.trim() === "See issues"
          )
        ).toBe(true);
      },
      { timeout: 10_000 }
    );
    if (accepted) {
      await vi.waitFor(
        () => {
          const seeIssues = Array.from(
            document.body.querySelectorAll<HTMLButtonElement>("button")
          ).find((button) => button.textContent?.trim() === "See issues");
          expect(seeIssues?.parentElement?.textContent).toContain(
            "Publish failed"
          );
        },
        { timeout: 10_000 }
      );
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
