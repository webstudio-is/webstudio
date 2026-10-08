import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { userEvent } from "@vitest/browser/context";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { afterEach, expect, test, vi } from "vitest";
import { $instances } from "~/shared/sync/data-stores";
import {
  $livePreviewBrowserInfo,
  recordPreviewBrowserInfo,
} from "~/shared/preview-form-values";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let resetResources: (() => void) | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  resetResources?.();
  resetResources = undefined;
  $instances.set(new Map());
  $livePreviewBrowserInfo.set(new Map());
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

  await selectOption("Current date", "GraphQL");
  expect(dialog.textContent).not.toContain("2026-09-23");
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
