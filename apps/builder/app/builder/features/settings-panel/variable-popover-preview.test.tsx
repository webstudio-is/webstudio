import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import { ROOT_INSTANCE_ID, type ResourceRequest } from "@webstudio-is/sdk";
import { afterEach, expect, test, vi } from "vitest";

const { previewLoaderCalls, emailPreviewMockState } = vi.hoisted(() => ({
  previewLoaderCalls: vi.fn(),
  emailPreviewMockState: { fail: false },
}));
vi.mock("./email-request-preview", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./email-request-preview")>();
  return {
    ...actual,
    buildEmailRequestPreviewFromEditor: (
      ...args: Parameters<typeof actual.buildEmailRequestPreviewFromEditor>
    ) => {
      if (emailPreviewMockState.fail) {
        throw new Error("Unable to evaluate Email expression");
      }
      return actual.buildEmailRequestPreviewFromEditor(...args);
    },
  };
});
vi.mock("~/shared/resources", async (importOriginal) => {
  const actual = await importOriginal<typeof import("~/shared/resources")>();
  return {
    ...actual,
    loadResourcePreview: (
      ...args: Parameters<typeof actual.loadResourcePreview>
    ) => {
      previewLoaderCalls(args[0]);
      return actual.loadResourcePreview(...args);
    },
  };
});
import {
  $dataSources,
  $instances,
  $projectSettings,
  $props,
  $resources,
} from "~/shared/sync/data-stores";
import { $livePreviewFormValues } from "~/shared/preview-form-values";
import { $resourcePreviewExchanges } from "~/shared/preview-form-inspection";
import {
  $livePreviewBrowserInfo,
  recordPreviewBrowserInfo,
} from "~/shared/preview-form-values";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let resetResources: (() => void) | undefined;
const initialDataSources = $dataSources.get();
const initialResources = $resources.get();
const initialProps = $props.get();
const initialProjectSettings = $projectSettings.get();

afterEach(async () => {
  act(() => root?.unmount());
  root = undefined;
  resetResources?.();
  resetResources = undefined;
  $instances.set(new Map());
  $dataSources.set(initialDataSources);
  $resources.set(initialResources);
  $props.set(initialProps);
  $projectSettings.set(initialProjectSettings);
  $livePreviewFormValues.set(new Map());
  $resourcePreviewExchanges.set(new Map());
  const { selectInstance } = await import("~/shared/nano-states");
  selectInstance(undefined);
  $livePreviewBrowserInfo.set(new Map());
  emailPreviewMockState.fail = false;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

test("loads an unsaved system resource while an unrelated page request is pending", async () => {
  const nativeFetch = globalThis.fetch;
  let respond: (response: Response) => void = () => {};
  const loaderCalls: RequestInit[] = [];
  const backend: typeof globalThis.fetch = (input, init) => {
    if (String(input).startsWith("/rest/resources-loader")) {
      loaderCalls.push(init ?? {});
      return new Promise<Response>((resolve, reject) => {
        const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
        init?.signal?.addEventListener("abort", onAbort, { once: true });
        respond = (response) => {
          init?.signal?.removeEventListener("abort", onAbort);
          resolve(response);
        };
      });
    }
    return nativeFetch(input, init);
  };
  // fetch.client captures fetch at import time, so install the test backend
  // before importing the dialog and resource loader.
  vi.stubGlobal("fetch", backend);
  const [
    { VariablePopoverTrigger },
    { __testing__, getResourceKey },
    { updateCsrfToken },
  ] = await Promise.all([
    import("./variable-popover"),
    import("~/shared/resources"),
    import("~/shared/csrf.client"),
  ]);
  const { queueResources, reset } = __testing__;
  resetResources = reset;
  updateCsrfToken("test-token");
  const unrelated: ResourceRequest = {
    name: "Slow page request",
    method: "get",
    url: "https://example.com/slow",
    searchParams: [],
    headers: [],
  };
  queueResources([unrelated]);

  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <div data-floating-panel-container>
          <VariablePopoverTrigger>
            <button type="button">Open new variable</button>
          </VariablePopoverTrigger>
        </div>
      </TooltipProvider>
    );
  });
  await act(async () => {
    await userEvent.click(container.querySelector("button")!);
  });
  const dialog = await vi.waitFor(() => {
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    return dialog!;
  });
  const selectOption = async (triggerText: string, optionText: string) => {
    const trigger = Array.from(
      dialog.querySelectorAll<HTMLElement>('[role="combobox"]')
    ).find((element) => element.textContent?.includes(triggerText));
    expect(trigger).toBeDefined();
    await act(async () => userEvent.click(trigger!));
    const option = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]')
    ).find((element) => element.textContent?.includes(optionText));
    expect(option).toBeDefined();
    await act(async () => userEvent.click(option!));
  };
  await selectOption("String", "Current date");

  const loadButton = Array.from(
    dialog.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Load data");
  expect(loadButton).toBeDefined();
  expect(loadButton?.disabled).toBe(false);
  const refreshButton = dialog.querySelector<HTMLButtonElement>(
    '[aria-label="Refresh resource data"]'
  );
  expect(refreshButton?.disabled).toBe(false);
  await act(async () => {
    await userEvent.click(loadButton!);
  });
  await vi.waitFor(() => expect(loaderCalls).toHaveLength(1));
  const requests = JSON.parse(String(loaderCalls[0].body)) as ResourceRequest[];
  const preview = requests.find(
    (request) => request.url === "/$resources/current-date"
  );
  if (preview === undefined) {
    throw new Error("Current date preview was not requested");
  }
  expect(requests).toContainEqual(unrelated);

  queueResources([]);
  respond(Response.json([[getResourceKey(preview), { data: "2026-09-23" }]]));
  await vi.waitFor(() => {
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "2026-09-23"
    );
  });

  // Switching System Resource subtypes must discard the completed preview.
  await selectOption("Current date", "Sitemap");
  expect(dialog.textContent).not.toContain("2026-09-23");
  const sitemapLoadButton = Array.from(
    dialog.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Load data");
  expect(sitemapLoadButton).toBeDefined();
  await act(async () => userEvent.click(sitemapLoadButton!));
  await vi.waitFor(() => expect(loaderCalls).toHaveLength(2));
  const sitemapRequests = JSON.parse(
    String(loaderCalls[1].body)
  ) as ResourceRequest[];
  const sitemapPreview = sitemapRequests.find(
    (request) => request.url === "/$resources/sitemap.xml"
  );
  expect(sitemapPreview).toBeDefined();

  // A late response for the old subtype cannot replace the new subtype's UI.
  await selectOption("Sitemap", "Current date");
  respond(
    Response.json([
      [getResourceKey(sitemapPreview!), { data: "stale sitemap response" }],
    ])
  );
  await vi.waitFor(() => {
    expect(dialog.textContent).not.toContain("stale sitemap response");
  });

  await selectOption("Current date", "GraphQL");
  expect(
    Array.from(dialog.querySelectorAll("button")).some(
      (button) => button.textContent === "Load data"
    )
  ).toBe(true);
});

test("Edit variable preview shows server browser info for a Form variable", async () => {
  const { VariablePopoverTrigger } = await import("./variable-popover");
  $instances.set(
    new Map([
      [
        "form",
        {
          id: "form",
          type: "instance",
          component: "NativeForm",
          children: [],
        },
      ],
    ])
  );
  recordPreviewBrowserInfo("form", {
    ip: "203.0.113.10",
    userAgent: "Trusted Preview browser",
    language: "en-GB",
    referrer: "https://builder.example/project",
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <TooltipProvider>
        <div data-floating-panel-container>
          <VariablePopoverTrigger
            variable={{
              id: "browser-info",
              type: "parameter",
              name: "browserInfo",
              scopeInstanceId: "form",
            }}
          >
            <button type="button">Edit browserInfo</button>
          </VariablePopoverTrigger>
        </div>
      </TooltipProvider>
    );
  });
  await act(async () => {
    await userEvent.click(container.querySelector("button")!);
  });

  await vi.waitFor(() => {
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("203.0.113.10");
    expect(dialog?.textContent).toContain("Trusted Preview browser");
    expect(dialog?.textContent).toContain("en-GB");
    expect(dialog?.textContent).toContain("https://builder.example/project");
  });
});

test.each([
  { label: "valid settings", fail: false },
  { label: "an evaluation failure", fail: true },
])(
  "Email Request Load data handles $label without sending",
  async ({ fail }) => {
    const { VariablePopoverTrigger } = await import("./variable-popover");
    const { selectInstance } = await import("~/shared/nano-states");
    $instances.set(
      new Map([
        [
          "form",
          {
            id: "form",
            type: "instance",
            component: "NativeForm",
            children: [{ type: "id", value: "email-input" }],
          },
        ],
        [
          "email-input",
          {
            id: "email-input",
            type: "instance",
            component: "Input",
            children: [],
          },
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "email-name",
          {
            id: "email-name",
            instanceId: "email-input",
            name: "name",
            type: "string",
            value: "email",
          },
        ],
        [
          "email-type",
          {
            id: "email-type",
            instanceId: "email-input",
            name: "type",
            type: "string",
            value: "email",
          },
        ],
      ])
    );
    $projectSettings.set({
      meta: { contactEmail: "owner@example.com" },
      compiler: {},
    });
    $resources.set(
      new Map([
        [
          "email-resource",
          {
            id: "email-resource",
            name: "Notify owner",
            control: "email",
            method: "post",
            url: '""',
            headers: [],
            email: {},
          },
        ],
      ])
    );
    const variable = {
      id: "email-variable",
      type: "resource" as const,
      name: "Notify owner",
      resourceId: "email-resource",
      scopeInstanceId: "form",
    };
    $dataSources.set(new Map([[variable.id, variable]]));
    selectInstance(["form", ROOT_INSTANCE_ID]);
    $livePreviewFormValues.set(
      new Map([["form", { email: "visitor@example.com", name: "Ada" }]])
    );

    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <TooltipProvider>
          <div data-floating-panel-container>
            <VariablePopoverTrigger variable={variable}>
              <button type="button">Edit Email Resource</button>
            </VariablePopoverTrigger>
          </div>
        </TooltipProvider>
      )
    );
    await act(async () => userEvent.click(container.querySelector("button")!));
    const dialog = await vi.waitFor(() => {
      const current = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(current).not.toBeNull();
      return current!;
    });
    const requestTab = Array.from(
      dialog.querySelectorAll<HTMLElement>('[role="tab"]')
    ).find((tab) => tab.textContent === "Request");
    expect(requestTab).toBeDefined();
    const diagnosticsTab = Array.from(
      dialog.querySelectorAll<HTMLElement>('[role="tab"]')
    ).find((tab) => tab.textContent === "Diagnostics");
    expect(diagnosticsTab).toBeDefined();
    await act(async () => userEvent.click(diagnosticsTab!));
    expect(
      dialog.querySelector('[data-state="active"][aria-busy="false"]')
    ).not.toBeNull();
    expect(dialog.textContent).not.toContain("Loading diagnostics…");
    await act(async () => userEvent.click(requestTab!));
    const loadButton = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>("button")
    ).find((button) => button.textContent === "Load data");
    expect(loadButton).toBeDefined();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const priorCalls = fetchSpy.mock.calls.length;
    const priorPreviewLoads = previewLoaderCalls.mock.calls.length;
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    emailPreviewMockState.fail = fail;
    await act(async () => userEvent.click(loadButton!));
    if (!fail) {
      await vi.waitFor(() => {
        expect(dialog.textContent).toContain("owner@example.com");
        expect(dialog.textContent).toContain("visitor@example.com");
        expect(dialog.textContent).toContain("Ada");
        expect(dialog.textContent).toContain('"preview"');
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } else {
      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Unable to build Email request preview"
        );
        expect(loadButton?.disabled).toBe(false);
        expect(dialog.textContent).not.toContain('"preview"');
      });
    }
    expect(fetchSpy.mock.calls.length).toBe(priorCalls);
    expect(previewLoaderCalls.mock.calls.length).toBe(priorPreviewLoads);
    expect($resourcePreviewExchanges.get().size).toBe(0);
    fetchSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  }
);
