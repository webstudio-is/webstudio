import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test } from "vitest";
import { TooltipProvider } from "@webstudio-is/design-system";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { $resourcesCache, getResourceKey } from "~/shared/resources";
import { $dataSources, $instances, $pages } from "~/shared/sync/data-stores";
import { $selectedPageId, selectInstance } from "~/shared/nano-states";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $previewFormExchanges,
  recordPreviewFormExchanges,
} from "~/shared/preview-form-inspection";
import { $livePreviewFormValues } from "~/shared/preview-form-values";
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
  $instances.set(new Map());
  $dataSources.set(new Map());
  $pages.set(undefined);
  $selectedPageId.set(undefined);
  selectInstance(undefined);
  $livePreviewFormValues.set(new Map());
  document.body.innerHTML = "";
});

test("Form data Preview shows live JSON values, including empty fields", async () => {
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
  const formDataVariable = {
    id: "form-data",
    type: "parameter" as const,
    name: "formData",
    scopeInstanceId: "form",
  };
  const browserInfoVariable = {
    id: "browser-info",
    type: "parameter" as const,
    name: "browserInfo",
    scopeInstanceId: "form",
  };
  $dataSources.set(
    new Map([
      [formDataVariable.id, formDataVariable],
      [browserInfoVariable.id, browserInfoVariable],
    ])
  );
  $pages.set(createDefaultPages({ rootInstanceId: "form" }));
  $selectedPageId.set("home");
  selectInstance(["form", "collection[one]", "root"]);
  $livePreviewFormValues.set(
    new Map([
      [
        "form,collection[one],root",
        { email: "", message: "live Preview value" },
      ],
      [
        "form,collection[two],root",
        { email: "other@example.com", message: "another occurrence" },
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
          variable={formDataVariable}
          variableType="parameter"
          variableValue={undefined}
          showSavedResourceRequest={false}
          isComputingRequest={false}
          onLoadData={() => {}}
          queryActive={false}
          queryPending={false}
          queryContainerRef={() => {}}
        />
        <__testing__.VariablePreview
          variable={browserInfoVariable}
          variableType="parameter"
          variableValue={undefined}
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
  await expect.poll(() => container.textContent).toContain('"email": ""');
  expect(container.textContent).toContain('"message": "live Preview value"');
  expect(container.textContent).toContain('"ip": ""');
  expect(container.textContent).toContain('"referrer": ""');
  expect(container.textContent).toContain('"userAgent":');
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
  ).toEqual(["Response", "Request", "Diagnostics"]);
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

test.each(["http", "email"] as const)(
  "%s inspector shows actual submitted requests and response headers across retry attempts without loading",
  async (kind) => {
    const exchange = {
      resourceId: "submitted-resource",
      resourceName: "Submitted resource",
      kind,
      request: {
        method: "POST",
        url: "https://example.com/submitted",
        headers: [{ name: "Content-Type", value: "application/json" }],
        body:
          kind === "email"
            ? {
                subject: "actual entered value",
                body: "logical Email body",
                recipients: [{ address: "ada@example.com" }],
              }
            : { entered: "actual entered value" },
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
            variableType={kind === "email" ? "email-resource" : "resource"}
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
      "Response",
      "Request",
      "Diagnostics",
    ]);
    expect(tabs[0].getAttribute("data-state")).toBe("active");
    await expect.poll(() => container.textContent).toContain("Retry-After");
    expect(container.textContent).toContain("Service Unavailable");
    expect(container.textContent).toContain("Created");
    expect(container.textContent).toContain("https://example.com/final");
    await act(async () => {
      tabs[1].dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 })
      );
      tabs[1].click();
    });
    await expect
      .poll(() => container.textContent)
      .toContain("actual entered value");
    expect(container.textContent).toContain(
      '"resourceId": "submitted-resource"'
    );
    expect(container.textContent).toContain(
      '"resourceName": "Submitted resource"'
    );
    expect(container.textContent).toContain("https://example.com/submitted");
    expect(container.textContent).toContain("POST");
    expect(container.textContent).toContain("application/json");
    if (kind === "email") {
      expect(container.textContent).toContain("logical Email body");
      expect(container.textContent).toContain("ada@example.com");
      expect(container.textContent).not.toContain("Load data");
    }
    await act(async () => {
      tabs[1].dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, button: 0 })
      );
      tabs[1].click();
    });
    await expect
      .poll(() => container.textContent)
      .toContain('"resourceName": "Submitted resource"');
    expect(container.textContent).toContain(
      '"resourceId": "submitted-resource"'
    );
    expect(loads).toBe(0);
  }
);

test("Email inspector has submission tabs without loading or inventing an exchange", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  let loads = 0;
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <__testing__.VariablePreview
          variable={{
            id: "email-variable",
            type: "resource",
            name: "Email",
            resourceId: "unsent-email",
          }}
          variableType="email-resource"
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
  expect(
    Array.from(
      container.querySelectorAll('[role="tab"]'),
      (tab) => tab.textContent
    )
  ).toEqual(["Response", "Request", "Diagnostics"]);
  expect(container.textContent).not.toContain("Email delivery is available");
  expect(container.textContent).not.toContain("Load data");
  expect($previewFormExchanges.get().has("unsent-email")).toBe(false);
  expect(loads).toBe(0);
});
