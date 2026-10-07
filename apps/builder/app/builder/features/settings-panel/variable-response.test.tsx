import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { $resourcesCache, getResourceKey } from "~/shared/resources";
import {
  $previewFormExchanges,
  recordPreviewFormExchanges,
} from "~/shared/preview-form-inspection";
import { __testing__ } from "./variable-popover";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
const previousCache = $resourcesCache.get();
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $resourcesCache.set(previousCache);
  $previewFormExchanges.set(new Map());
  document.body.innerHTML = "";
});

test("HTTP Response shows cached status and body, including unsuccessful responses", async () => {
  const request: ResourceRequest = {
    name: "Request",
    method: "get",
    url: "https://example.com",
    headers: [],
    searchParams: [],
  };
  const key = getResourceKey(request);
  $resourcesCache.set(
    new Map([
      [
        key,
        {
          ok: true,
          status: 201,
          statusText: "Created",
          data: { message: "created response" },
        },
      ],
    ])
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <__testing__.VariablePreview
          variableType="resource"
          variableValue={request}
          showSavedResourceRequest={false}
          isComputingRequest={false}
          onLoadData={() => {}}
          queryActive={false}
          queryPending={false}
          queryContainerRef={() => {}}
        />
      </TooltipProvider>
    )
  );
  expect(
    Array.from(
      container.querySelectorAll('[role="tab"]'),
      (tab) => tab.textContent
    )
  ).toEqual(["Request", "Response", "Diagnostics"]);
  await expect.poll(() => container.textContent).toContain("201");
  expect(container.textContent).toContain("Created");
  expect(container.textContent).toContain("created response");
  await act(async () =>
    $resourcesCache.set(
      new Map([
        [
          key,
          {
            ok: false,
            status: 422,
            statusText: "Unprocessable Content",
            data: { error: "rejected response body" },
          },
        ],
      ])
    )
  );
  await expect.poll(() => container.textContent).toContain("422");
  expect(container.textContent).toContain("Unprocessable Content");
  expect(container.textContent).toContain("rejected response body");
});

test("HTTP inspector shows actual submitted requests and response headers across retry attempts without loading", async () => {
  const exchange = {
    resourceId: "submitted-resource",
    kind: "http" as const,
    request: {
      method: "POST",
      url: "https://example.com/submitted",
      headers: [{ name: "Content-Type", value: "application/json" }],
      body: { entered: "actual entered value" },
      truncated: false,
    },
    response: {
      status: 503,
      statusText: "Service Unavailable",
      headers: [{ name: "Retry-After", value: "1" }],
      body: { error: "retry response" },
      truncated: false,
    },
  };
  recordPreviewFormExchanges("form", [
    exchange,
    {
      ...exchange,
      response: {
        ...exchange.response,
        status: 201,
        statusText: "Created",
        url: "https://example.com/final",
        headers: [{ name: "Content-Type", value: "application/json" }],
        body: { accepted: true },
      },
    },
  ]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  let loads = 0;
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <__testing__.VariablePreview
          variable={{
            id: "variable",
            type: "resource",
            name: "Request",
            resourceId: "submitted-resource",
          }}
          variableType="resource"
          variableValue={undefined}
          showSavedResourceRequest={false}
          isComputingRequest={false}
          onLoadData={() => {
            loads += 1;
          }}
          queryActive={false}
          queryPending={false}
          queryContainerRef={() => {}}
        />
      </TooltipProvider>
    )
  );
  const tabs = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  );
  expect(tabs.map((tab) => tab.textContent)).toEqual([
    "Request",
    "Response",
    "Diagnostics",
  ]);
  await expect.poll(() => container.textContent).toContain("Retry-After");
  expect(container.textContent).toContain("Service Unavailable");
  expect(container.textContent).toContain("Created");
  expect(container.textContent).toContain("https://example.com/final");
  await act(async () => {
    tabs[0].dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    tabs[0].click();
  });
  await expect
    .poll(() => container.textContent)
    .toContain("actual entered value");
  expect(container.textContent).toContain("https://example.com/submitted");
  expect(container.textContent).toContain("POST");
  expect(container.textContent).toContain("application/json");
  expect(loads).toBe(0);
});
