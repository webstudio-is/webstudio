import {
  $resourcePreviewExchanges,
  recordResourcePreviewExchange,
} from "~/shared/preview-resource-inspection";
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
import {
  $livePreviewFormValues,
  $livePreviewBrowserInfo,
  recordPreviewBrowserInfo,
} from "~/shared/preview-form-values";
import { ParameterVariablePreview } from "./variable-editors/parameter-editor";
import { FormResourcePreview } from "./variable-editors/form-resource-preview";

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
  $resourcePreviewExchanges.set(new Map());
  $instances.set(new Map());
  $dataSources.set(new Map());
  $pages.set(undefined);
  $selectedPageId.set(undefined);
  selectInstance(undefined);
  $livePreviewFormValues.set(new Map());
  $livePreviewBrowserInfo.set(new Map());
  document.body.innerHTML = "";
});

test("Form context Preview shows live data and server browser info", async () => {
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
  recordPreviewBrowserInfo("form", {
    ip: "203.0.113.10",
    userAgent: "Preview browser",
    language: "en-GB",
    referrer: "https://builder.example/project",
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <ParameterVariablePreview variable={formDataVariable} />
        <ParameterVariablePreview variable={browserInfoVariable} />
      </TooltipProvider>
    )
  );
  await expect.poll(() => container.textContent).toContain('"email": ""');
  expect(container.textContent).toContain('"message": "live Preview value"');
  expect(container.textContent).toContain('"ip": "203.0.113.10"');
  expect(container.textContent).toContain(
    '"referrer": "https://builder.example/project"'
  );
  expect(container.textContent).toContain('"userAgent": "Preview browser"');
});

test("preview-only resources show Load data without an empty Request tab", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  let loads = 0;
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormResourcePreview
          variableValue={undefined}
          showEmptyLoadButton
          onLoadData={() => {
            loads += 1;
          }}
        />
      </TooltipProvider>
    )
  );
  expect(
    Array.from(
      container.querySelectorAll('[role="tab"]'),
      (tab) => tab.textContent
    )
  ).toEqual(["Preview", "Diagnostics"]);
  const loadButton = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Load data");
  expect(loadButton).toBeDefined();
  await act(async () => loadButton?.click());
  expect(loads).toBe(1);
});

test("Resource inspector can load the actual Request from an empty Request tab", async () => {
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
  let loads = 0;
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormResourcePreview
          showEmptyLoadButton
          inspectSubmission
          alwaysShowRequestTab
          variableValue={request}
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
  await expect.poll(() => container.textContent).toContain("201");
  expect(container.textContent).toContain("Created");
  expect(container.textContent).toContain("created response");
  const requestTab = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((tab) => tab.textContent === "Request");
  expect(requestTab).toBeDefined();
  await act(async () => {
    requestTab?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    requestTab?.click();
  });
  const loadButton = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Load data");
  expect(loadButton).toBeDefined();
  expect(container.textContent).not.toContain("Loading...");
  expect(container.textContent).not.toContain("null");
  expect(container.textContent).not.toContain("example.com");
  expect(loads).toBe(0);
  await act(async () => loadButton?.click());
  expect(loads).toBe(1);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormResourcePreview
          showEmptyLoadButton
          inspectSubmission
          alwaysShowRequestTab
          variableValue={request}
          showSavedResourceRequest={false}
          isComputingRequest={true}
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
    container.querySelector('[role="status"]')?.getAttribute("aria-label")
  ).toBe("Loading request…");
  await act(async () =>
    recordResourcePreviewExchange(key, {
      resourceId: key,
      resourceName: "Request",
      kind: "http",
      request: {
        method: "GET",
        url: "https://example.com/actual-request",
        headers: [{ name: "accept", value: "application/json" }],
        body: undefined,
        truncated: false,
      },
      response: {
        status: 201,
        statusText: "Created",
        headers: [],
        body: { message: "created response" },
        truncated: false,
      },
    })
  );
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormResourcePreview
          showEmptyLoadButton
          inspectSubmission
          alwaysShowRequestTab
          variableValue={request}
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
  await expect.poll(() => container.textContent).toContain("actual-request");
  expect(container.textContent).toContain('"accept"');
  expect(container.textContent).not.toContain("Load data");
  const responseTab = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((tab) => tab.textContent === "Response");
  await act(async () => {
    responseTab?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    responseTab?.click();
  });
  await expect.poll(() => container.textContent).toContain('"status": 201');
  expect(container.textContent).toContain("created response");
});

test("explicit Resource reload shows the captured request and response headers", async () => {
  const request: ResourceRequest = {
    name: "Contact webhook",
    method: "post",
    url: "https://example.com/contacts",
    headers: [],
    searchParams: [],
    body: { email: "person@example.com" },
  };
  const key = getResourceKey(request);
  $previewFormExchanges.set(
    new Map([
      [
        key,
        {
          formId: "form",
          revision: 0,
          attempts: [
            {
              resourceId: key,
              resourceName: "Contact webhook",
              kind: "http",
              request: {
                method: "POST",
                url: "https://old.example/contacts",
                headers: [],
                body: { email: "stale@example.com" },
                truncated: false,
              },
              response: {
                status: 200,
                statusText: "OK",
                headers: [],
                body: { accepted: true },
                truncated: false,
              },
            },
          ],
        },
      ],
    ])
  );
  recordResourcePreviewExchange(key, {
    resourceId: key,
    resourceName: "Contact webhook",
    kind: "http",
    request: {
      method: "POST",
      url: request.url,
      headers: [{ name: "content-type", value: "application/json" }],
      body: { email: "person@example.com" },
      truncated: false,
    },
    response: {
      status: 201,
      statusText: "Created",
      url: request.url,
      headers: [{ name: "x-request-id", value: "request-123" }],
      body: { accepted: true },
      truncated: false,
    },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormResourcePreview
          variable={{
            id: "contact-webhook-variable",
            type: "resource",
            name: "Contact webhook",
            resourceId: key,
          }}
          showEmptyLoadButton
          inspectSubmission
          alwaysShowRequestTab
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
  const requestTab = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((tab) => tab.textContent === "Request");
  expect(requestTab).not.toBeNull();
  await act(async () => {
    requestTab?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    requestTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  expect(container.textContent).toContain('"method": "POST"');
  expect(container.textContent).toContain('"content-type"');
  expect(container.textContent).toContain('"email": "person@example.com"');
  expect(container.textContent).not.toContain("stale@example.com");
  expect(container.textContent).not.toContain("old.example");
});

test.each(["submission", "reload"] as const)(
  "Form Resource preview prefers the latest %s exchange",
  async (latest) => {
    const request: ResourceRequest = {
      name: "Contact webhook",
      method: "post",
      url: "https://example.com/contacts",
      headers: [],
      searchParams: [],
      body: undefined,
    };
    const key = getResourceKey(request);
    const exchange = {
      resourceId: key,
      resourceName: "Contact webhook",
      kind: "http" as const,
      request: {
        method: "POST",
        url: request.url,
        headers: [],
        body: null,
        truncated: false,
      },
      response: {
        status: 200,
        statusText: "OK",
        headers: [],
        body: { source: "submission" },
        truncated: false,
      },
    };
    const recordSubmission = () =>
      recordPreviewFormExchanges("form", [exchange]);
    const recordReload = () =>
      recordResourcePreviewExchange(key, {
        ...exchange,
        response: {
          ...exchange.response,
          status: 201,
          body: { source: "reload" },
        },
      });
    if (latest === "submission") {
      recordReload();
      recordSubmission();
    } else {
      recordSubmission();
      recordReload();
    }
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <TooltipProvider>
          <FormResourcePreview
            variable={{
              id: "contact-webhook-variable",
              type: "resource",
              name: "Contact webhook",
              resourceId: key,
            }}
            variableValue={request}
            inspectSubmission
          />
        </TooltipProvider>
      )
    );
    await expect
      .poll(() => container.textContent)
      .toContain(`"source": "${latest}"`);
    expect(container.textContent).not.toContain(
      `"source": "${latest === "submission" ? "reload" : "submission"}"`
    );
  }
);

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
          <FormResourcePreview
            variable={{
              id: "variable",
              type: "resource",
              name: "Request",
              resourceId: "submitted-resource",
            }}
            showEmptyLoadButton={kind === "http"}
            inspectSubmission
            alwaysShowRequestTab
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
    expect(container.textContent).toContain('"status": 201');
    expect(container.textContent).toContain('"accepted": true');
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

test("Email Request loads only a local preview until an actual submission exists", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  let localLoads = 0;
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormResourcePreview
          variable={{
            id: "email-variable",
            type: "resource",
            name: "Email",
            resourceId: "unsent-email",
          }}
          inspectSubmission
          alwaysShowRequestTab
          variableValue={undefined}
          showSavedResourceRequest={false}
          isComputingRequest={false}
          onLoadData={() => {
            localLoads += 1;
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
  const requestTab = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((tab) => tab.textContent === "Request");
  await act(async () => {
    requestTab?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    requestTab?.click();
  });
  const loadButton = Array.from(
    container.querySelectorAll<HTMLButtonElement>("button")
  ).find((button) => button.textContent === "Load data");
  expect(loadButton).toBeDefined();
  await act(async () => loadButton?.click());
  expect(localLoads).toBe(1);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormResourcePreview
          variable={{
            id: "email-variable",
            type: "resource",
            name: "Email",
            resourceId: "unsent-email",
          }}
          inspectSubmission
          alwaysShowRequestTab
          variableValue={undefined}
          showSavedResourceRequest={false}
          isComputingRequest={false}
          onLoadData={() => {
            localLoads += 1;
          }}
          requestSnapshot={{
            preview: { to: [], subject: "Receipt", fromName: "Site Owner" },
          }}
          queryActive={false}
          queryPending={false}
          queryContainerRef={() => {}}
        />
      </TooltipProvider>
    )
  );
  expect(container.textContent).toContain('"preview"');
  expect(container.textContent).toContain('"subject": "Receipt"');
  expect($previewFormExchanges.get().has("unsent-email")).toBe(false);
});

test("Email inspector shows raw HTTP response and failed delivery diagnostics separately", async () => {
  recordPreviewFormExchanges("form", [
    {
      resourceId: "email-resource",
      resourceName: "Receipt",
      kind: "email",
      request: {
        method: "POST",
        url: "https://email-service.internal/v1/send",
        headers: [{ name: "content-type", value: "application/json" }],
        body: { subject: "Receipt", body: "Submitted" },
        truncated: false,
      },
      response: {
        status: 200,
        statusText: "OK",
        headers: [{ name: "x-email-service-id", value: "request-id" }],
        body: {
          error: { code: "DELIVERY_FAILED", message: "Delivery rejected" },
        },
        truncated: false,
      },
      outcome: {
        ok: false,
        status: 502,
        statusText: "Email service returned an invalid response",
        body: {
          ok: false,
          error: { code: "EMAIL_SERVICE_ERROR" },
        },
        truncated: false,
      },
    },
  ]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <TooltipProvider>
        <FormResourcePreview
          variable={{
            id: "email-variable",
            type: "resource",
            name: "Receipt",
            resourceId: "email-resource",
          }}
          inspectSubmission
          alwaysShowRequestTab
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

  expect(container.textContent).toContain('"status": 200');
  expect(container.textContent).toContain("Delivery rejected");
  expect(container.textContent).toContain("request-id");
  expect(container.textContent).toContain('"ok": false');
  const diagnostics = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]')
  ).find((tab) => tab.textContent === "Diagnostics");
  await act(async () => {
    diagnostics?.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    diagnostics?.click();
  });
  await expect.poll(() => container.textContent).toContain("502");
  expect(container.textContent).toContain("EMAIL_SERVICE_ERROR");
  expect(container.textContent).toContain(
    "Email service returned an invalid response"
  );
});
