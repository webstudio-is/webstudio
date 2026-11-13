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

beforeAll(async () => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: () => undefined,
  });
  vi.resetModules();
  vi.stubGlobal(
    "fetch",
    async (requestInfo: RequestInfo | URL, requestInit?: RequestInit) => {
      const url = new URL(String(requestInfo), "http://localhost");
      const input =
        requestInit?.body === undefined
          ? JSON.parse(url.searchParams.get("input") ?? "{}")
          : JSON.parse(String(requestInit.body));
      requests.push({ path: url.pathname, input });
      let data: unknown;
      switch (url.pathname) {
        case "/trpc/domain.publish":
          data = publishResponse;
          break;
        case "/trpc/api.publish.getJob":
          data = { status: "failed", code: "BUILD_FAILED" };
          break;
        default:
          throw new Error(`Unexpected request: ${url.pathname}`);
      }
      return new Response(JSON.stringify([{ result: { data } }]), {
        headers: { "Content-Type": "application/json" },
      });
    }
  );
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
});

afterEach(() => {
  act(() => {
    root?.unmount();
    resetStores?.();
  });
  root = undefined;
  resetStores = undefined;
  document.body.innerHTML = "";
});

afterAll(() => {
  vi.unstubAllGlobals();
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
});

test.each([
  ["Validate", "Errors", false],
  ["Publish", "Errors", false],
  ["Publish", "Publish", true],
] as const)(
  "%s keeps the result in the popover until See issues opens %s",
  async (action, expectedTab, accepted) => {
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
